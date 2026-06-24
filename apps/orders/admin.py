from django.contrib import admin

from .models import Order, OrderItem, OrderStatusHistory


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ("product", "quantity", "price")
    readonly_fields = ("price",)
    raw_id_fields = ("product",)


class OrderStatusHistoryInline(admin.TabularInline):
    """Read-only audit log displayed beneath the order in the admin."""

    model = OrderStatusHistory
    extra = 0
    fields = ("old_status", "new_status", "changed_by", "notes", "changed_at")
    readonly_fields = ("old_status", "new_status", "changed_by", "notes", "changed_at")
    ordering = ("-changed_at",)
    can_delete = False

    def has_add_permission(self, request, obj=None) -> bool:
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    inlines = [OrderItemInline, OrderStatusHistoryInline]
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

    def save_model(self, request, obj, form, change) -> None:
        """Inject the acting admin user so the signal can attribute the change."""
        obj._changed_by = request.user
        super().save_model(request, obj, form, change)
