from decimal import Decimal

from django.contrib import admin
from django.db.models import F, QuerySet
from django.http import HttpRequest

from .models import Category, Product, ProductImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("name_en",)}
    list_display = ("name_en", "name_ar", "parent", "slug", "is_active")
    list_select_related = ("parent",)
    list_filter = ("is_active",)
    search_fields = ("name_en", "name_ar", "slug")
    fieldsets = (
        (None, {"fields": ("name_en", "name_ar", "description_en", "description_ar", "slug", "parent")}),
        ("Media & Visibility", {"fields": ("image", "is_active")}),
    )


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ("image", "alt_text", "sort_order")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("name_en",)}
    inlines = [ProductImageInline]
    list_display = (
        "name_en",
        "name_ar",
        "category",
        "farmer",
        "selling_price",
        "discount_price",
        "stock",
        "slug",
    )
    list_select_related = ("category", "farmer")
    search_fields = ("name_en", "name_ar", "slug")
    list_filter = ("category", "is_active", "is_organic")
    readonly_fields = ("current_price", "gross_profit", "margin", "is_in_stock", "is_low_stock")
    actions = ["apply_10_percent_discount"]
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "name_en",
                    "name_ar",
                    "slug",
                    "category",
                    "farmer",
                    "description_en",
                    "description_ar",
                )
            },
        ),
        (
            "Pricing",
            {
                "fields": (
                    "farm_cost",
                    "selling_price",
                    "discount_price",
                    "current_price",
                    "gross_profit",
                    "margin",
                )
            },
        ),
        (
            "Inventory",
            {
                "fields": (
                    "stock",
                    "low_stock_threshold",
                    "is_in_stock",
                    "is_low_stock",
                )
            },
        ),
        (
            "Details",
            {
                "fields": (
                    "sku",
                    "weight_value",
                    "weight_unit",
                    "is_organic",
                    "is_active",
                )
            },
        ),
    )

    # ------------------------------------------------------------------
    # Data isolation — farmers see only their own products
    # ------------------------------------------------------------------

    def get_queryset(self, request: HttpRequest) -> QuerySet[Product]:
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        farmer = getattr(request.user, "farmer_profile", None)
        if farmer is not None:
            return qs.filter(farmer=farmer)
        return qs

    # ------------------------------------------------------------------
    # Auto-assign farmer on product creation
    # ------------------------------------------------------------------

    def save_model(
        self, request: HttpRequest, obj: Product, form, change: bool
    ) -> None:
        if not change and obj.farmer_id is None:
            farmer = getattr(request.user, "farmer_profile", None)
            if farmer is not None:
                obj.farmer = farmer
        super().save_model(request, obj, form, change)

    # ------------------------------------------------------------------
    # Prevent farmers from reassigning ownership
    # ------------------------------------------------------------------

    def get_readonly_fields(self, request: HttpRequest, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        if not request.user.is_superuser:
            farmer = getattr(request.user, "farmer_profile", None)
            if farmer is not None and "farmer" not in readonly:
                readonly.append("farmer")
        return readonly

    # ------------------------------------------------------------------
    # Bulk action — apply 10 % discount to selected products
    # ------------------------------------------------------------------

    @admin.action(description="Apply 10%% discount to selected products")
    def apply_10_percent_discount(
        self, request: HttpRequest, queryset: QuerySet[Product]
    ) -> None:
        count = queryset.update(
            discount_price=F("selling_price") * Decimal("0.90")
        )
        self.message_user(request, f"10% discount applied to {count} product(s).")


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ("product", "alt_text", "sort_order")
    list_select_related = ("product",)
