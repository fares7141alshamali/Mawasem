from django.contrib import admin

from .models import Farmer


@admin.register(Farmer)
class FarmerAdmin(admin.ModelAdmin):
    list_display = ("farm_name", "user", "phone_number", "is_verified", "created_at")
    list_display_links = ("farm_name", "user")
    list_filter = ("is_verified",)
    search_fields = ("farm_name", "user__username", "user__email", "phone_number")
    readonly_fields = ("created_at", "updated_at")
    list_select_related = ("user",)
    fieldsets = (
        (None, {"fields": ("user", "farm_name", "phone_number", "bio")}),
        ("Location", {"fields": ("location_lat", "location_lng")}),
        ("Status", {"fields": ("is_verified",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
    actions = ["verify_farmers", "unverify_farmers"]

    @admin.action(description="Mark selected farmers as verified")
    def verify_farmers(self, request, queryset):
        queryset.update(is_verified=True)

    @admin.action(description="Remove verification from selected farmers")
    def unverify_farmers(self, request, queryset):
        queryset.update(is_verified=False)
