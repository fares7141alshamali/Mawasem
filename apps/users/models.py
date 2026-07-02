from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN    = 'admin',    _('Admin')
        FARMER   = 'farmer',   _('Farmer')
        CONSUMER = 'consumer', _('Consumer')

    role = models.CharField(
        _("role"),
        max_length=10,
        choices=Role.choices,
        default=Role.CONSUMER,
        db_index=True,
    )
    phone_number = models.CharField(
        _("phone number"),
        max_length=15,
        blank=True,
        null=True,
    )
    address = models.TextField(
        _("address"),
        blank=True,
        null=True,
    )
    is_email_verified = models.BooleanField(
        _("email verified"),
        default=False,
    )

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")

    def __str__(self) -> str:
        return self.username
