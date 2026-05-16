from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
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
    is_consumer = models.BooleanField(
        _("consumer"),
        default=True,
    )

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")

    def __str__(self) -> str:
        return self.username
