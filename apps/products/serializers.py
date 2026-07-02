from rest_framework import serializers

from .models import Category, Product, ProductImage


class CategoryNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name_en", "name_ar", "slug")


class ChildCategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "slug", "name_en", "name_ar", "image", "product_count")


class CategorySerializer(serializers.ModelSerializer):
    children = ChildCategorySerializer(many=True, read_only=True)
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "slug", "name_en", "name_ar", "image", "product_count", "children")


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "alt_text", "sort_order")


class FarmerNestedSerializer(serializers.Serializer):
    """Minimal farmer representation embedded in product responses."""

    id = serializers.IntegerField(read_only=True)
    farm_name = serializers.CharField(read_only=True)
    city = serializers.CharField(read_only=True)
    is_verified = serializers.BooleanField(read_only=True)


class ProductListSerializer(serializers.ModelSerializer):
    category = CategoryNestedSerializer(read_only=True)
    farmer = FarmerNestedSerializer(read_only=True)
    current_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    is_in_stock = serializers.BooleanField(read_only=True)
    main_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "slug",
            "name_en",
            "name_ar",
            "sku",
            "selling_price",
            "discount_price",
            "current_price",
            "main_image",
            "is_in_stock",
            "category",
            "farmer",
        )

    def get_main_image(self, obj):
        # Use next(iter(...)) so the prefetch cache is respected — no extra query.
        first_image = next(iter(obj.images.all()), None)
        if first_image and first_image.image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        return None


class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + (
            "description_en",
            "description_ar",
            "weight_value",
            "weight_unit",
            "is_organic",
            "images",
        )
