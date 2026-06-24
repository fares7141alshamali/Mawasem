from rest_framework import serializers

from apps.products.models import Product
from apps.products.serializers import ProductListSerializer

from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    """Read-only representation of a single cart line item.

    Embeds the full ``ProductListSerializer`` so the client has all product
    details (name, price, main image, stock status) without a second request.
    ``total_price`` is computed from ``quantity × product.current_price`` and
    reads from the prefetch cache — no extra queries.
    """

    product = ProductListSerializer(read_only=True)
    total_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = CartItem
        fields = ("id", "product", "quantity", "total_price", "created_at")


class CartSerializer(serializers.ModelSerializer):
    """Full cart representation including all line items and aggregated totals.

    Relies on the queryset having ``items`` prefetched (with
    ``select_related('product__category')`` and
    ``prefetch_related('product__images')``). All computed fields
    (``total_price``, ``item_count``) walk the prefetch cache so the
    serialization adds zero additional database queries.
    """

    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("id", "item_count", "total_price", "items", "created_at", "updated_at")

    def get_item_count(self, obj: Cart) -> int:
        return len(obj.items.all())  # reads prefetch cache — no extra query


class AddToCartSerializer(serializers.Serializer):
    """Input serializer for ``POST /api/v1/cart/add/``.

    ``product_id`` is validated against active products only; an inactive or
    missing product returns a 400 with a descriptive message.
    """

    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True),
        error_messages={"does_not_exist": "Product not found or is no longer available."},
    )
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    """Input serializer for ``PATCH /api/v1/cart/update-item/<id>/``."""

    quantity = serializers.IntegerField(min_value=1)
