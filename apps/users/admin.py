from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        (
            _("Additional Info"),
            {"fields": ("role", "phone_number", "address")},
        ),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (
            _("Additional Info"),
            {"fields": ("role", "phone_number", "address")},
        ),
    )
    list_display = (
        "username",
        "email",
        "role",
        "phone_number",
        "is_staff",
        "is_active",
    )
    list_filter = ("role", "is_staff", "is_superuser", "is_active")
    search_fields = ("username", "email", "phone_number")
