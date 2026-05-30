from django.contrib import admin

from .models import Category, Product, ProductImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("name_en",)}
    list_display = ("name_en", "name_ar", "parent", "slug")
    list_select_related = ("parent",)
    search_fields = ("name_en", "name_ar", "slug")


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
        "selling_price",
        "discount_price",
        "stock",
        "slug",
    )
    list_select_related = ("category",)
    search_fields = ("name_en", "name_ar", "slug")
    list_filter = ("category", "is_active", "is_organic")
    readonly_fields = ("current_price", "gross_profit", "margin", "is_in_stock", "is_low_stock")
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "name_en",
                    "name_ar",
                    "slug",
                    "category",
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


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ("product", "alt_text", "sort_order")
    list_select_related = ("product",)
