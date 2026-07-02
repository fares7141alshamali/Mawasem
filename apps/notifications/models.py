from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Notification(models.Model):
    class Kind(models.TextChoices):
        ORDER_STATUS = "order_status", _("Order Status Change")
        NEW_ORDER    = "new_order",    _("New Order Received")

    recipient  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    kind       = models.CharField(
        max_length=30,
        choices=Kind.choices,
        default=Kind.ORDER_STATUS,
        db_index=True,
    )
    title      = models.CharField(max_length=255)
    body       = models.TextField()
    order      = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    is_read    = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.kind}] {self.title} → {self.recipient_id}"
