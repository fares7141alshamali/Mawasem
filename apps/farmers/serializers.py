from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from apps.products.models import Category, Product as ProductModel, ProductImage
from apps.products.serializers import ProductListSerializer

from .models import Farmer


# ---------------------------------------------------------------------------
# Public farmer serializers
# ---------------------------------------------------------------------------


class FarmerSerializer(serializers.ModelSerializer):
    """Used for list, create, and update operations.

    ``is_verified`` is always read-only — admins set it via the admin panel.
    ``user`` is injected by ``FarmerViewSet.perform_create``; it never appears
    in writable input. The derived ``username`` field is read-only.
    """

    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Farmer
        fields = (
            "id",
            "username",
            "farm_name",
            "city",
            "location_lat",
            "location_lng",
            "phone_number",
            "bio",
            "is_verified",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "is_verified", "created_at", "updated_at")

    def validate(self, attrs: dict) -> dict:
        request = self.context.get("request")
        if request and request.user.is_authenticated and self.instance is None:
            if Farmer.objects.filter(user=request.user).exists():
                raise serializers.ValidationError(
                    {"non_field_errors": ["You already have a farmer profile."]}
                )
        return attrs


class FarmerDetailSerializer(FarmerSerializer):
    """Used for ``retrieve``. Extends the base serializer with nested products.

    Only active products are included; they are loaded from the prefetch cache
    set up in ``FarmerViewSet.get_queryset`` so this adds zero extra queries.
    """

    products = ProductListSerializer(many=True, read_only=True)

    class Meta(FarmerSerializer.Meta):
        fields = FarmerSerializer.Meta.fields + ("products",)


# ---------------------------------------------------------------------------
# Farmer dashboard serializers  (used by the /farmer/* private endpoints)
# ---------------------------------------------------------------------------


class FarmerProductReadSerializer(ProductListSerializer):
    """Extends the public ProductListSerializer with farmer-only fields.

    Adds ``stock``, ``is_low_stock``, and ``is_active`` so the dashboard can
    render stock indicators and active/inactive toggles without a second
    request.
    """

    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ("stock", "is_low_stock", "is_active")


class FarmerProductWriteSerializer(serializers.ModelSerializer):
    """Write serializer for farmer-owned products.

    - Auto-generates a URL-safe unique slug from ``name_en`` on creation.
    - Accepts an optional ``image`` file; creates a ``ProductImage`` row
      automatically so the thumbnail appears immediately in the dashboard.
    - ``farmer`` is never user-supplied; it is injected by the view via
      ``serializer.save(farmer=...)``.
    """

    image = serializers.ImageField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = ProductModel
        fields = (
            "id",
            "name_en",
            "name_ar",
            "description_en",
            "description_ar",
            "farm_cost",
            "selling_price",
            "discount_price",
            "stock",
            "category",
            "is_organic",
            "weight_value",
            "weight_unit",
            "is_active",
            "image",
        )
        read_only_fields = ("id",)
        extra_kwargs = {
            "description_en": {"required": False, "allow_blank": True, "default": ""},
            "description_ar": {"required": False, "allow_blank": True, "default": ""},
            "farm_cost":      {"required": False, "default": Decimal("0.00")},
            "discount_price": {"required": False, "allow_null": True},
            "category":       {"required": False, "allow_null": True},
            "weight_value":   {"required": False, "allow_null": True},
            "weight_unit":    {"required": False, "default": "kg"},
            "is_active":      {"required": False, "default": True},
        }

    def validate(self, attrs: dict) -> dict:
        discount = attrs.get("discount_price")
        selling = attrs.get("selling_price") or (
            self.instance.selling_price if self.instance else None
        )
        if discount is not None and selling is not None and discount >= selling:
            raise serializers.ValidationError(
                {"discount_price": "Discount price must be less than selling price."}
            )
        return attrs

    @staticmethod
    def _unique_slug(name_en: str) -> str:
        from django.utils.text import slugify

        base = slugify(name_en)[:230] or "product"
        slug, n = base, 1
        while ProductModel.objects.filter(slug=slug).exists():
            slug = f"{base}-{n}"
            n += 1
        return slug

    def create(self, validated_data: dict) -> ProductModel:
        image = validated_data.pop("image", None)
        validated_data["slug"] = self._unique_slug(validated_data["name_en"])
        product = ProductModel.objects.create(**validated_data)
        if image:
            ProductImage.objects.create(product=product, image=image, sort_order=0)
        return product

    def update(self, instance: ProductModel, validated_data: dict) -> ProductModel:
        validated_data.pop("image", None)  # image changes go through admin
        return super().update(instance, validated_data)


class FarmerOrderStatusSerializer(serializers.Serializer):
    """Input serializer for farmer-initiated order status transitions.

    Only forward transitions are permitted.  The ``order`` instance must be
    provided in ``context`` so ``validate_status`` can check the current
    status before the write hits the database.

    Delivery fields (``delivery_method``, ``courier``, ``tracking_number``)
    are required when transitioning to ``shipped`` and ignored otherwise.
    """

    _TRANSITIONS: dict[str, list[str]] = {
        "pending":    ["processing", "cancelled"],
        "processing": ["shipped",    "cancelled"],
        "shipped":    ["completed"],
    }

    status = serializers.ChoiceField(
        choices=["processing", "shipped", "completed", "cancelled"]
    )
    notes           = serializers.CharField(required=False, allow_blank=True, default="")
    delivery_method = serializers.ChoiceField(
        choices=["self", "partner"],
        required=False,
        allow_null=True,
        default=None,
    )
    courier         = serializers.CharField(required=False, allow_blank=True, default="")
    tracking_number = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_status(self, value: str) -> str:
        order = self.context.get("order")
        if order is not None:
            allowed = self._TRANSITIONS.get(order.status, [])
            if value not in allowed:
                raise serializers.ValidationError(
                    f"Cannot transition '{order.status}' → '{value}'. "
                    f"Allowed: {allowed or ['none']}."
                )
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs.get("status") == "shipped" and not attrs.get("delivery_method"):
            raise serializers.ValidationError(
                {"delivery_method": "Delivery method is required when marking an order as shipped."}
            )
        return attrs


class NotificationSerializer(serializers.Serializer):
    """Read-only serializer for farmer notifications."""

    id         = serializers.IntegerField(read_only=True)
    kind       = serializers.CharField(read_only=True)
    title      = serializers.CharField(read_only=True)
    body       = serializers.CharField(read_only=True)
    is_read    = serializers.BooleanField(read_only=True)
    order_id   = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
