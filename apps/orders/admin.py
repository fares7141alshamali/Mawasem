from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ("product", "quantity", "price")
    readonly_fields = ("price",)
    raw_id_fields = ("product",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    inlines = [OrderItemInline]
    list_display = ("id", "user", "status", "total_price", "created_at")
    list_display_links = ("id", "user")
    list_filter = ("status",)
    list_select_related = ("user",)
    readonly_fields = ("total_price", "created_at", "updated_at")
    search_fields = ("user__username", "user__email", "shipping_address")
    date_hierarchy = "created_at"
    fieldsets = (
        (None, {"fields": ("user", "status", "shipping_address")}),
        ("Financials", {"fields": ("total_price",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
