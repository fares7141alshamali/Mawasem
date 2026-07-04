from django.conf import settings
from django.db import models, transaction
from django.utils.translation import gettext_lazy as _


class Address(models.Model):
    """A consumer's saved delivery address (Talabat-style address book).

    ``latitude``/``longitude`` mirror the convention used by
    ``Farmer.location_lat``/``location_lng`` (max_digits=9, decimal_places=6),
    but are required here since every Address is created from a map pick.

    Only one Address per user may have ``is_default=True`` at a time. That
    invariant is enforced in ``save()`` (not the serializer/view) so it holds
    regardless of entry point — API, admin, or the checkout
    ``save_address=True`` inline-creation path.
    """

    class Label(models.TextChoices):
        HOME = "home", _("Home")
        WORK = "work", _("Work")
        OTHER = "other", _("Other")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="addresses",
        verbose_name=_("user"),
    )
    label = models.CharField(
        _("label"),
        max_length=10,
        choices=Label.choices,
        default=Label.HOME,
    )
    custom_label = models.CharField(
        _("custom label"),
        max_length=50,
        blank=True,
        help_text=_("Display name when label is 'Other', e.g. 'Mom's House'."),
    )
    full_address = models.TextField(
        _("full address"),
        help_text=_("Human-readable address text, e.g. from map reverse-geocoding."),
    )
    extra_details = models.CharField(
        _("extra details"),
        max_length=255,
        blank=True,
        help_text=_("Building / floor / apartment number, landmark, etc."),
    )
    city = models.CharField(_("city"), max_length=100, blank=True)
    latitude = models.DecimalField(
        _("latitude"),
        max_digits=9,
        decimal_places=6,
        help_text=_("GPS latitude coordinate (e.g. 31.963158)"),
    )
    longitude = models.DecimalField(
        _("longitude"),
        max_digits=9,
        decimal_places=6,
        help_text=_("GPS longitude coordinate (e.g. 35.930359)"),
    )
    is_default = models.BooleanField(_("default address"), default=False, db_index=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("address")
        verbose_name_plural = _("addresses")
        ordering = ["-is_default", "-created_at"]

    def __str__(self) -> str:
        return f"{self.get_label_display()} — {self.full_address[:40]}"

    def save(self, *args, **kwargs) -> None:
        """Enforce 'only one default address per user'.

        A user's very first address is auto-promoted to default (a lone
        address is always usable with no extra "set default" round trip).
        Whenever ``is_default=True`` is being saved, every sibling address
        belonging to the same user is atomically unset.
        """
        with transaction.atomic():
            is_first_address = (
                self._state.adding
                and not Address.objects.filter(user_id=self.user_id).exists()
            )
            if is_first_address:
                self.is_default = True

            super().save(*args, **kwargs)

            if self.is_default:
                Address.objects.filter(
                    user_id=self.user_id, is_default=True
                ).exclude(pk=self.pk).update(is_default=False)
