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
    class DeliveryMethod(models.TextChoices):
        SELF    = "self",    _("Self Delivery")
        PARTNER = "partner", _("Delivery Partner")

    shipping_address = models.TextField(_("shipping address"))
    shipping_lat = models.DecimalField(
        _("shipping latitude"),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text=_("GPS latitude captured at checkout time (e.g. 31.963158)."),
    )
    shipping_lng = models.DecimalField(
        _("shipping longitude"),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text=_("GPS longitude captured at checkout time (e.g. 35.930359)."),
    )
    shipping_label = models.CharField(
        _("delivery address label"),
        max_length=50,
        blank=True,
        help_text=_("e.g. 'Home', 'Work', or a custom label — denormalized at checkout."),
    )
    delivery_method = models.CharField(
        _("delivery method"),
        max_length=10,
        choices=DeliveryMethod.choices,
        blank=True,
        null=True,
    )
    courier = models.CharField(
        _("courier"),
        max_length=100,
        blank=True,
        null=True,
    )
    tracking_number = models.CharField(
        _("tracking number"),
        max_length=100,
        blank=True,
        null=True,
    )
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


class OrderStatusHistory(models.Model):
    """Immutable audit log of every status transition for an Order.

    Records are created automatically by the ``post_save`` signal on
    ``Order`` — do not create them manually. One record is always written
    on initial order creation (``old_status=None``) so the full lifecycle
    is always visible.

    Attribution
    -----------
    ``changed_by`` is NULL when the transition was made by the checkout
    system or any automated process. For admin or API-initiated changes,
    callers set ``order._changed_by = user`` before calling
    ``order.save()`` and the signal handler picks it up.

    Limitation
    ----------
    Queryset-level ``Order.objects.update(status=...)`` calls bypass
    Django's ``save()`` and therefore bypass this signal entirely.
    Always use instance-level ``save()`` when a transition must be logged.
    """

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="status_history",
        verbose_name=_("order"),
    )
    old_status = models.CharField(
        _("previous status"),
        max_length=20,
        null=True,
        blank=True,
    )
    new_status = models.CharField(
        _("new status"),
        max_length=20,
    )
    changed_at = models.DateTimeField(_("changed at"), auto_now_add=True, db_index=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_status_changes",
        verbose_name=_("changed by"),
    )
    notes = models.TextField(_("notes"), blank=True)

    class Meta:
        verbose_name = _("order status history")
        verbose_name_plural = _("order status histories")
        ordering = ["-changed_at"]

    def __str__(self) -> str:
        old = self.old_status or "—"
        ts = self.changed_at.strftime("%Y-%m-%d %H:%M") if self.changed_at else "?"
        return f"Order #{self.order_id}: {old} → {self.new_status} at {ts}"
