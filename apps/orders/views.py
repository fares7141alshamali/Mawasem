from __future__ import annotations

from django.db.models import Prefetch, QuerySet  # noqa: F401 – QuerySet used in type hints
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.notifications.models import Notification

from .models import Order, OrderItem, OrderStatusHistory
from .serializers import ConsumerNotificationSerializer, OrderCheckoutSerializer, OrderSerializer


def _order_queryset_with_prefetch(user) -> QuerySet[Order]:
    """Shared queryset used by both list and the post-checkout reload.

    Prefetches:
    - ``items`` (with select_related product) — for order line items
    - ``status_history`` ordered newest-first — for the audit log

    All data for ``OrderSerializer`` is loaded in 3 queries regardless
    of how many orders or history entries exist.
    """
    return (
        Order.objects.filter(user=user)
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


class OrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Order history and checkout endpoints.

    URL map (router registers this at ``orders/``):
        GET  /api/v1/orders/             list()      — order history
        GET  /api/v1/orders/{id}/        retrieve()  — single order detail (used by tooltip)
        POST /api/v1/orders/checkout/    checkout()  — place order from cart

    Performance
    -----------
    Both endpoints share ``_order_queryset_with_prefetch`` which loads
    orders + items + status_history in 3 queries flat.
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "checkout":
            return OrderCheckoutSerializer
        return OrderSerializer

    def get_queryset(self) -> QuerySet[Order]:
        return _order_queryset_with_prefetch(self.request.user)

    @action(detail=False, methods=["post"], url_path="checkout")
    def checkout(self, request: Request) -> Response:
        """POST /api/v1/orders/checkout/ — convert the current cart into an order.

        Returns the newly created order (``OrderSerializer``) with HTTP 201.
        Returns HTTP 400 if the cart is empty or any product is out of stock.

        The response includes ``status_history`` with the initial PENDING entry
        that was written automatically by the ``post_save`` signal.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order: Order = serializer.save()

        # Reload with all prefetches so the response has no N+1 and includes
        # the status_history entry written by the post_save signal
        order = _order_queryset_with_prefetch(request.user).get(pk=order.pk)

        return Response(
            OrderSerializer(order, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ConsumerNotificationViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """GET  /api/v1/consumer/notifications/           — list own notifications (unread first)
    POST /api/v1/consumer/notifications/mark-read/  — mark all as read

    Security: queryset is scoped to ``request.user`` so a consumer can never
    see another user's notifications, and farmers' NEW_ORDER notifications are
    never in a consumer's recipient list.
    """

    permission_classes  = [IsAuthenticated]
    serializer_class    = ConsumerNotificationSerializer
    pagination_class    = None

    def get_queryset(self) -> QuerySet:
        return (
            Notification.objects.filter(recipient=self.request.user)
            .select_related("order")
            .order_by("is_read", "-created_at")
        )

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request: Request, *args, **kwargs) -> Response:
        Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({"marked_read": True})
