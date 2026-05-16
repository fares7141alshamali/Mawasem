from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        (
            _("Additional Info"),
            {"fields": ("phone_number", "address", "is_consumer")},
        ),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (
            _("Additional Info"),
            {"fields": ("phone_number", "address", "is_consumer")},
        ),
    )
    list_display = (
        "username",
        "email",
        "phone_number",
        "is_consumer",
        "is_staff",
        "is_active",
    )
    list_filter = ("is_consumer", "is_staff", "is_superuser", "is_active")
    search_fields = ("username", "email", "phone_number")
