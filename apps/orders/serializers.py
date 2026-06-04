from __future__ import annotations

from decimal import Decimal

from django.db import connection, transaction
from django.db.models import F, Prefetch
from rest_framework import serializers

from apps.carts.models import Cart, CartItem
from apps.products.models import Product

from .models import Order, OrderItem


# ---------------------------------------------------------------------------
# Read serializers — used for GET /api/v1/orders/
# ---------------------------------------------------------------------------


class OrderItemSerializer(serializers.ModelSerializer):
    """Snapshot of a single product line as it existed at purchase time.

    ``price`` reflects the captured unit price, not the product's current price,
    so historical orders remain accurate after catalogue price changes.
    """

    product_name = serializers.CharField(source="product.name_en", read_only=True)
    product_name_ar = serializers.CharField(source="product.name_ar", read_only=True)
    product_slug = serializers.SlugField(source="product.slug", read_only=True)
    total_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_slug",
            "product_name",
            "product_name_ar",
            "quantity",
            "price",
            "total_price",
        )


class OrderSerializer(serializers.ModelSerializer):
    """Full order representation including all line items."""

    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "status",
            "status_display",
            "total_price",
            "shipping_address",
            "items",
            "created_at",
            "updated_at",
        )


# ---------------------------------------------------------------------------
# Write serializer — used for POST /api/v1/orders/checkout/
# ---------------------------------------------------------------------------


class OrderCheckoutSerializer(serializers.Serializer):
    """Converts the current user's cart into a confirmed order.

    Validation
    ----------
    - Cart must exist and contain at least one item.
    - Every product must have sufficient stock for the requested quantity.

    Creation (inside a single DB transaction)
    -----------------------------------------
    1. Lock product rows with SELECT FOR UPDATE (PostgreSQL) to prevent
       overselling under concurrent requests.
    2. Re-verify stock under the lock — the window between validate() and
       create() is small but non-zero.
    3. Snapshot cart items → OrderItem rows, capturing ``current_price`` so
       future price changes never alter the historical record.
    4. Deduct stock atomically via F() expressions.
    5. Clear the cart.
    """

    shipping_address = serializers.CharField(
        min_length=10,
        error_messages={"min_length": "Please provide a complete shipping address."},
    )

    def validate(self, attrs: dict) -> dict:
        user = self.context["request"].user

        try:
            cart = Cart.objects.prefetch_related(
                Prefetch(
                    "items",
                    queryset=CartItem.objects.select_related("product"),
                )
            ).get(user=user)
        except Cart.DoesNotExist:
            raise serializers.ValidationError({"non_field_errors": ["Your cart is empty."]})

        cart_items = list(cart.items.all())
        if not cart_items:
            raise serializers.ValidationError({"non_field_errors": ["Your cart is empty."]})

        # First-pass stock check — catches obvious failures before touching the DB
        errors = []
        for item in cart_items:
            if item.product.stock < item.quantity:
                errors.append(
                    f"Insufficient stock for '{item.product.name_en}'. "
                    f"Available: {item.product.stock}, requested: {item.quantity}."
                )
        if errors:
            raise serializers.ValidationError({"non_field_errors": errors})

        # Stash resolved objects for create() — avoids re-querying the cart
        attrs["cart"] = cart
        attrs["cart_items"] = cart_items
        return attrs

    def create(self, validated_data: dict) -> Order:
        cart: Cart = validated_data.pop("cart")
        cart_items: list[CartItem] = validated_data.pop("cart_items")
        shipping_address: str = validated_data["shipping_address"]
        user = self.context["request"].user

        with transaction.atomic():
            product_ids = [item.product_id for item in cart_items]

            # Lock rows on PostgreSQL to prevent race conditions.
            # SQLite has no row-level locking, so we fall back to a plain read;
            # the atomic() block still prevents partial writes.
            qs = Product.objects.filter(pk__in=product_ids)
            if connection.vendor != "sqlite":
                qs = qs.select_for_update()
            products = {p.pk: p for p in qs}

            # Second-pass stock check under lock — guards against the race between
            # validate() and create() when two requests arrive simultaneously.
            errors = []
            for item in cart_items:
                product = products[item.product_id]
                if product.stock < item.quantity:
                    errors.append(
                        f"'{product.name_en}' stock changed. "
                        f"Only {product.stock} units available."
                    )
            if errors:
                raise serializers.ValidationError({"non_field_errors": errors})

            # Calculate total from locked product data
            total: Decimal = sum(
                (products[item.product_id].current_price * item.quantity for item in cart_items),
                Decimal("0.00"),
            )

            # Create the order header
            order = Order.objects.create(
                user=user,
                status=Order.Status.PENDING,
                total_price=total,
                shipping_address=shipping_address,
            )

            # Snapshot cart items into immutable order item rows
            OrderItem.objects.bulk_create(
                [
                    OrderItem(
                        order=order,
                        product_id=item.product_id,
                        quantity=item.quantity,
                        price=products[item.product_id].current_price,
                    )
                    for item in cart_items
                ]
            )

            # Deduct stock atomically — F() ensures no read-modify-write race
            for item in cart_items:
                Product.objects.filter(pk=item.product_id).update(
                    stock=F("stock") - item.quantity
                )

            # Clear the cart so the user starts fresh
            cart.items.all().delete()

        return order
