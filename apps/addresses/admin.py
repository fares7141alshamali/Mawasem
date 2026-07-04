from django.contrib import admin

from .models import Address


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("label", "custom_label", "user", "city", "is_default", "created_at")
    list_display_links = ("label", "user")
    list_filter = ("label", "is_default", "city")
    search_fields = ("user__username", "user__email", "full_address", "city")
    readonly_fields = ("created_at", "updated_at")
    list_select_related = ("user",)
    fieldsets = (
        (None, {"fields": ("user", "label", "custom_label")}),
        ("Address", {"fields": ("full_address", "extra_details", "city")}),
        ("Location", {"fields": ("latitude", "longitude")}),
        ("Status", {"fields": ("is_default",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
