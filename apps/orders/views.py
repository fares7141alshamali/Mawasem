from __future__ import annotations

from django.db.models import Prefetch, QuerySet
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Order, OrderItem
from .serializers import OrderCheckoutSerializer, OrderSerializer


class OrderViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Order history and checkout endpoints.

    URL map (router registers this at ``orders/``):
        GET  /api/v1/orders/             list()      — paginated order history
        POST /api/v1/orders/checkout/    checkout()  — place order from cart

    Performance
    -----------
    ``get_queryset`` prefetches ``items → select_related(product)`` so
    the full order list serializes without N+1 queries.
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "checkout":
            return OrderCheckoutSerializer
        return OrderSerializer

    def get_queryset(self) -> QuerySet[Order]:
        """Return only the authenticated user's orders, newest first."""
        return (
            Order.objects.filter(user=self.request.user)
            .prefetch_related(
                Prefetch(
                    "items",
                    queryset=OrderItem.objects.select_related("product"),
                )
            )
            .order_by("-created_at")
        )

    @action(detail=False, methods=["post"], url_path="checkout")
    def checkout(self, request: Request) -> Response:
        """POST /api/v1/orders/checkout/ — convert the current cart into an order.

        Returns the newly created order (``OrderSerializer``) with HTTP 201.
        Returns HTTP 400 if the cart is empty or any product is out of stock.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order: Order = serializer.save()

        # Reload with prefetched items so the response serializer has no N+1
        order = (
            Order.objects.prefetch_related(
                Prefetch(
                    "items",
                    queryset=OrderItem.objects.select_related("product"),
                )
            )
            .get(pk=order.pk)
        )

        return Response(
            OrderSerializer(order, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
