from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Farmer(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="farmer_profile",
        verbose_name=_("user"),
    )
    farm_name = models.CharField(_("farm name"), max_length=255)
    location_lat = models.DecimalField(
        _("latitude"),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text=_("GPS latitude coordinate (e.g. 31.963158)"),
    )
    location_lng = models.DecimalField(
        _("longitude"),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text=_("GPS longitude coordinate (e.g. 35.930359)"),
    )
    city         = models.CharField(_("city"), max_length=100, blank=True)
    phone_number = models.CharField(_("phone number"), max_length=20, blank=True)
    bio = models.TextField(_("bio"), blank=True)
    is_verified = models.BooleanField(_("verified"), default=False, db_index=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("farmer")
        verbose_name_plural = _("farmers")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.farm_name
