from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.products.models import Product


class Order(models.Model):
    """A confirmed purchase placed by a user.

    ``total_price`` is denormalised at checkout time so historical records
    remain accurate even after product price changes.
    """

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        PROCESSING = "processing", _("Processing")
        SHIPPED = "shipped", _("Shipped")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
        verbose_name=_("user"),
    )
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    total_price = models.DecimalField(
        _("total price"),
        max_digits=12,
        decimal_places=2,
    )
    shipping_address = models.TextField(_("shipping address"))
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("order")
        verbose_name_plural = _("orders")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Order #{self.pk} — {self.user} ({self.status})"


class OrderItem(models.Model):
    """A single product line within a confirmed order.

    ``price`` is the unit price captured at the moment of checkout.
    It is intentionally decoupled from ``product.selling_price`` so that
    future price edits never alter historical order records.
    """

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name=_("order"),
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="order_items",
        verbose_name=_("product"),
    )
    quantity = models.PositiveIntegerField(_("quantity"))
    price = models.DecimalField(
        _("unit price at purchase"),
        max_digits=10,
        decimal_places=2,
    )

    class Meta:
        verbose_name = _("order item")
        verbose_name_plural = _("order items")

    def __str__(self) -> str:
        return f"{self.quantity}× {self.product.name_en} @ {self.price}"

    @property
    def total_price(self) -> Decimal:
        return self.price * self.quantity
