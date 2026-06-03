from __future__ import annotations

from django.db.models import F, Prefetch, QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.products.models import Product

from .models import Cart, CartItem
from .serializers import AddToCartSerializer, CartSerializer, UpdateCartItemSerializer


class CartViewSet(viewsets.GenericViewSet):
    """Cart management endpoints for authenticated users.

    All mutation actions (add, update-item, remove-item, clear) return the
    full updated ``CartSerializer`` response so the frontend can refresh its
    state without a follow-up GET request.

    URL map (router registers this at ``cart/``):
        GET    /api/v1/cart/                         list()
        POST   /api/v1/cart/add/                     add()
        PATCH  /api/v1/cart/update-item/<item_id>/   update_item()
        DELETE /api/v1/cart/remove-item/<item_id>/   remove_item()
        POST   /api/v1/cart/clear/                   clear()

    Performance
    -----------
    ``get_queryset`` applies ``prefetch_related`` with a custom inner
    queryset that joins ``product__category`` and prefetches
    ``product__images``. The full cart + items + products is loaded in
    exactly **2 DB queries** (one for the Cart row, one combined prefetch).
    """

    permission_classes = [IsAuthenticated]
    serializer_class = CartSerializer

    # ------------------------------------------------------------------
    # Queryset & helpers
    # ------------------------------------------------------------------

    def get_queryset(self) -> QuerySet[Cart]:
        """Return the current user's cart with all nested data prefetched."""
        return Cart.objects.filter(user=self.request.user).prefetch_related(
            Prefetch(
                "items",
                queryset=CartItem.objects.select_related(
                    "product__category"
                ).prefetch_related("product__images"),
            )
        )

    def _get_cart(self) -> Cart:
        """Get (or create) the current user's cart and return it with items prefetched."""
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return self.get_queryset().get(pk=cart.pk)

    def _get_item(self, item_id: int) -> CartItem:
        """Return the CartItem if it belongs to the current user's cart, or raise 404."""
        return get_object_or_404(CartItem, pk=item_id, cart__user=self.request.user)

    def _cart_response(
        self, cart: Cart, http_status: int = status.HTTP_200_OK
    ) -> Response:
        return Response(self.get_serializer(cart).data, status=http_status)

    # ------------------------------------------------------------------
    # Endpoints
    # ------------------------------------------------------------------

    def list(self, request: Request) -> Response:
        """GET /api/v1/cart/ — retrieve the current user's cart and all items."""
        return self._cart_response(self._get_cart())

    @action(detail=False, methods=["post"], url_path="add")
    def add(self, request: Request) -> Response:
        """POST /api/v1/cart/add/ — add a product or increment its quantity.

        If the product is already in the cart the quantities are combined
        atomically using an ``F()`` expression to prevent race conditions
        under concurrent requests.
        """
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product: Product = serializer.validated_data["product_id"]
        quantity: int = serializer.validated_data["quantity"]

        cart, _ = Cart.objects.get_or_create(user=request.user)
        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={"quantity": quantity},
        )
        if not created:
            item.quantity = F("quantity") + quantity
            item.save(update_fields=["quantity"])

        return self._cart_response(self._get_cart())

    @action(
        detail=False,
        methods=["patch"],
        url_path=r"update-item/(?P<item_id>\d+)",
    )
    def update_item(self, request: Request, item_id: str = "0") -> Response:
        """PATCH /api/v1/cart/update-item/<item_id>/ — replace an item's quantity.

        Quantity must be ≥ 1. Use ``remove-item`` to delete an item entirely.
        """
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = self._get_item(int(item_id))
        item.quantity = serializer.validated_data["quantity"]
        item.save(update_fields=["quantity"])
        return self._cart_response(self._get_cart())

    @action(
        detail=False,
        methods=["delete"],
        url_path=r"remove-item/(?P<item_id>\d+)",
    )
    def remove_item(self, request: Request, item_id: str = "0") -> Response:
        """DELETE /api/v1/cart/remove-item/<item_id>/ — remove one item."""
        self._get_item(int(item_id)).delete()
        return self._cart_response(self._get_cart())

    @action(detail=False, methods=["post"], url_path="clear")
    def clear(self, request: Request) -> Response:
        """POST /api/v1/cart/clear/ — remove all items from the cart."""
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart.items.all().delete()
        return self._cart_response(self._get_cart())
