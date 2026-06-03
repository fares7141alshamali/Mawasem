from django.contrib import admin

from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    fields = ("product", "quantity", "created_at")
    readonly_fields = ("created_at",)
    raw_id_fields = ("product",)


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    inlines = [CartItemInline]
    list_display = ("user", "item_count", "created_at", "updated_at")
    list_select_related = ("user",)
    readonly_fields = ("created_at", "updated_at")
    search_fields = ("user__username", "user__email")

    @admin.display(description="Items")
    def item_count(self, obj: Cart) -> int:
        return obj.items.count()
