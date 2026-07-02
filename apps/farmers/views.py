from __future__ import annotations

from django.db import transaction
from django.db.models import Prefetch, QuerySet
from rest_framework import generics, mixins, status as http_status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.orders.models import Order, OrderItem, OrderStatusHistory
from apps.orders.serializers import OrderSerializer
from apps.products.models import Product

from .models import Farmer
from .permissions import IsFarmerUser
from .serializers import (
    FarmerDetailSerializer,
    FarmerOrderStatusSerializer,
    FarmerProductReadSerializer,
    FarmerProductWriteSerializer,
    FarmerSerializer,
    NotificationSerializer,
)


# ---------------------------------------------------------------------------
# Public farmer profile permission + viewset
# ---------------------------------------------------------------------------


class IsFarmerOrReadOnly(BasePermission):
    """Object-level permission for farmer profiles.

    - Unauthenticated users: read-only (list + retrieve).
    - Authenticated users: may create a new profile.
    - Profile owner: may update and delete their own profile.
    """

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj: Farmer) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return obj.user_id == request.user.pk


class FarmerViewSet(viewsets.ModelViewSet):
    """CRUD endpoints for farmer profiles.

    URL map (registered at ``farmers/`` by the router):
        GET    /api/v1/farmers/          list()          — public
        POST   /api/v1/farmers/          create()        — authenticated
        GET    /api/v1/farmers/{id}/     retrieve()      — public, includes products
        PUT    /api/v1/farmers/{id}/     update()        — owner only
        PATCH  /api/v1/farmers/{id}/     partial_update()— owner only
        DELETE /api/v1/farmers/{id}/     destroy()       — owner only

    Performance
    -----------
    - ``list``: 1 query (select_related user).
    - ``retrieve``: 3 queries (farmer + products + product images).
    """

    permission_classes = [IsFarmerOrReadOnly]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return FarmerDetailSerializer
        return FarmerSerializer

    def get_queryset(self) -> QuerySet[Farmer]:
        if self.action == "retrieve":
            return Farmer.objects.select_related("user").prefetch_related(
                Prefetch(
                    "products",
                    queryset=Product.objects.filter(is_active=True)
                    .select_related("category")
                    .prefetch_related("images"),
                )
            )
        return Farmer.objects.select_related("user")

    def perform_create(self, serializer: FarmerSerializer) -> None:
        serializer.save(user=self.request.user)


# ---------------------------------------------------------------------------
# Private farmer dashboard views  (require IsFarmerUser)
# ---------------------------------------------------------------------------


class FarmerMeView(generics.RetrieveUpdateAPIView):
    """GET / PATCH  /api/v1/farmer/me/ — current farmer's own profile.

    Supports partial updates (PATCH) for bio, phone_number, farm coordinates.
    ``is_verified`` remains read-only in the serializer.
    """

    permission_classes = [IsAuthenticated, IsFarmerUser]
    serializer_class = FarmerSerializer

    def get_object(self) -> Farmer:
        return self.request.user.farmer_profile


class FarmerProductViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Farmer's own product management.

    ``pagination_class = None`` — the dashboard needs the full product list to
    compute stats (active count, out-of-stock count) in the frontend.  A farmer
    will rarely have >100 products, so skipping pagination is safe here.

    URL map (registered at ``farmer/products/`` by the router):
        GET    /api/v1/farmer/products/       — list all farmer's products
        POST   /api/v1/farmer/products/       — create a new product
        GET    /api/v1/farmer/products/{id}/  — retrieve one product
        PATCH  /api/v1/farmer/products/{id}/  — update stock / price / status

    Read responses always use ``FarmerProductReadSerializer`` (includes
    main_image, is_low_stock, stock).  Write operations use the write
    serializer for validation then return the read-serialized representation.
    """

    permission_classes = [IsAuthenticated, IsFarmerUser]
    pagination_class   = None  # full list needed for dashboard stats

    def get_queryset(self) -> QuerySet[Product]:
        farmer = self.request.user.farmer_profile
        return (
            Product.objects.filter(farmer=farmer)
            .select_related("category")
            .prefetch_related("images")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return FarmerProductWriteSerializer
        return FarmerProductReadSerializer

    # Return read-serialized data after writes so the client gets main_image etc.
    def _read_response(self, product: Product, status_code: int) -> Response:
        obj = self.get_queryset().get(pk=product.pk)
        serializer = FarmerProductReadSerializer(obj, context=self.get_serializer_context())
        return Response(serializer.data, status=status_code)

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_s = FarmerProductWriteSerializer(
            data=request.data, context=self.get_serializer_context()
        )
        write_s.is_valid(raise_exception=True)
        product = write_s.save(farmer=request.user.farmer_profile)
        return self._read_response(product, http_status.HTTP_201_CREATED)

    def partial_update(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        write_s = FarmerProductWriteSerializer(
            instance, data=request.data, partial=True,
            context=self.get_serializer_context(),
        )
        write_s.is_valid(raise_exception=True)
        product = write_s.save()
        return self._read_response(product, http_status.HTTP_200_OK)


class FarmerOrderViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Orders containing this farmer's products (read + status transitions).

    URL map (registered at ``farmer/orders/`` by the router):
        GET   /api/v1/farmer/orders/              — list
        GET   /api/v1/farmer/orders/{id}/         — retrieve
        PATCH /api/v1/farmer/orders/{id}/status/  — status transition

    The queryset filters by ``items__product__farmer`` so farmers only see
    orders that contain at least one of their products.  Ownership is
    enforced at the object level via ``get_object()`` which calls
    ``get_queryset()``.
    """

    permission_classes = [IsAuthenticated, IsFarmerUser]
    serializer_class   = OrderSerializer
    pagination_class   = None  # orders panel shows the full stream

    def get_queryset(self) -> QuerySet[Order]:
        farmer = self.request.user.farmer_profile
        return (
            Order.objects.filter(items__product__farmer=farmer)
            .select_related("user")   # needed by OrderSerializer.customer_* fields
            .distinct()
            .prefetch_related(
                Prefetch(
                    "items",
                    queryset=OrderItem.objects.select_related("product"),
                ),
                Prefetch(
                    "status_history",
                    queryset=OrderStatusHistory.objects.select_related(
                        "changed_by"
                    ).order_by("-changed_at"),
                ),
            )
            .order_by("-created_at")
        )

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request: Request, pk=None) -> Response:
        """PATCH /api/v1/farmer/orders/{id}/status/ — advance the order status.

        Validates the transition against ``FarmerOrderStatusSerializer``.
        Attaches ``_changed_by`` so the post_save signal records the farmer
        as the actor in ``OrderStatusHistory``.
        """
        order = self.get_object()
        serializer = FarmerOrderStatusSerializer(
            data=request.data,
            context={"order": order, "request": request},
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            order._changed_by = request.user
            order._status_notes = serializer.validated_data.get("notes", "")
            order.status = serializer.validated_data["status"]
            # Persist delivery info when transitioning to shipped
            if order.status == "shipped":
                order.delivery_method  = serializer.validated_data.get("delivery_method") or None
                order.courier          = serializer.validated_data.get("courier", "")
                order.tracking_number  = serializer.validated_data.get("tracking_number", "")
            order.save()

        # Reload with prefetches so the response has no N+1
        order = self.get_queryset().get(pk=order.pk)
        return Response(OrderSerializer(order, context={"request": request}).data)


class FarmerNotificationViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """GET  /api/v1/farmer/notifications/           — list (unread first)
    POST /api/v1/farmer/notifications/mark-read/  — mark all read
    """

    permission_classes = [IsAuthenticated, IsFarmerUser]
    serializer_class   = NotificationSerializer
    pagination_class   = None

    def get_queryset(self):
        return self.request.user.notifications.all().order_by("is_read", "-created_at")

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request: Request, *args, **kwargs) -> Response:
        self.request.user.notifications.filter(is_read=False).update(is_read=True)
        return Response({"marked_read": True})
