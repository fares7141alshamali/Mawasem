from __future__ import annotations

from decimal import Decimal

from django.db import connection, transaction
from django.db.models import F, Prefetch
from rest_framework import serializers

from apps.carts.models import Cart, CartItem
from apps.notifications.models import Notification
from apps.products.models import Product

from .models import Order, OrderItem, OrderStatusHistory


class ConsumerNotificationSerializer(serializers.ModelSerializer):
    """Read-only serializer for consumer (buyer) notifications."""

    class Meta:
        model  = Notification
        fields = ("id", "kind", "title", "body", "is_read", "order_id", "created_at")
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Status history serializer
# ---------------------------------------------------------------------------


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    """Read-only representation of a single status transition.

    Human-readable labels (``old_status_display``, ``new_status_display``)
    are derived at serialization time from ``Order.Status.choices`` so they
    automatically reflect any future label changes without a migration.
    """

    old_status_display = serializers.SerializerMethodField()
    new_status_display = serializers.SerializerMethodField()
    changed_by_username = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = (
            "id",
            "old_status",
            "old_status_display",
            "new_status",
            "new_status_display",
            "changed_by_username",
            "notes",
            "changed_at",
        )

    def _status_label(self, value: str | None) -> str | None:
        if value is None:
            return None
        return dict(Order.Status.choices).get(value, value)

    def get_old_status_display(self, obj: OrderStatusHistory) -> str | None:
        return self._status_label(obj.old_status)

    def get_new_status_display(self, obj: OrderStatusHistory) -> str:
        return self._status_label(obj.new_status)  # type: ignore[return-value]

    def get_changed_by_username(self, obj: OrderStatusHistory) -> str | None:
        return obj.changed_by.username if obj.changed_by_id else None


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
    """Full order representation including line items and complete status history.

    ``status_history`` is ordered newest-first (the Prefetch in
    ``OrderViewSet.get_queryset`` enforces the ordering at the DB level so
    this serializer adds zero extra queries).

    ``customer_username`` and ``customer_phone`` expose the buyer's contact
    details to the farmer dashboard.  They are resolved from the related
    ``user`` row — callers must use ``select_related("user")`` on the
    queryset to avoid N+1 queries.
    """

    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    customer_username = serializers.SerializerMethodField()
    customer_phone    = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "status",
            "status_display",
            "total_price",
            "shipping_address",
            "delivery_method",
            "courier",
            "tracking_number",
            "customer_username",
            "customer_phone",
            "items",
            "status_history",
            "created_at",
            "updated_at",
        )

    def get_customer_username(self, obj: Order) -> str:
        return obj.user.username

    def get_customer_phone(self, obj: Order) -> str | None:
        return obj.user.phone_number or None


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

    The ``post_save`` signal on ``Order`` automatically writes the initial
    ``OrderStatusHistory`` record (PENDING) during step 3.
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

            # Create the order header — the post_save signal will automatically
            # write the initial OrderStatusHistory(old_status=None, new_status=PENDING)
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

            # Notify farmers about the new order (after bulk_create so items exist)
            try:
                from apps.orders.signals import _notify_farmers_new_order
                _notify_farmers_new_order(order)
            except Exception:
                pass

        return order
