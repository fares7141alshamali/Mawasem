"""Signal handlers for the orders app.

Connected via ``OrdersConfig.ready()`` in apps.py so they are registered
exactly once when Django starts, regardless of how the app is imported.

Status-change detection
-----------------------
Two signals cooperate:

1. ``order_pre_save`` (pre_save)
   Runs *before* the row is written.  Fetches the current ``status`` value
   from the database (one lean ``values_list`` query) and stores it on the
   instance as the private attribute ``_pre_save_status``.  For brand-new
   objects (``pk is None``) the attribute is set to ``None``.

2. ``order_post_save`` (post_save)
   Runs *after* the row is written.  Compares ``_pre_save_status`` with
   ``instance.status``.  A new ``OrderStatusHistory`` row is created only
   when:
   - the order was just created (``created=True``), OR
   - the status value genuinely changed.

   No history row is written for saves that touch other fields (e.g.
   ``shipping_address``, ``updated_at``), keeping the audit table clean.

Attribution (optional)
----------------------
Any caller that wants to record *who* triggered the transition can attach
two transient attributes to the instance before calling ``save()``:

    order._changed_by   = request.user  # a User instance or None
    order._status_notes = "Handed to courier"  # free-text reason

Both attributes are removed from the instance after use so they cannot
accidentally bleed into a subsequent save of the same object.

The Django Admin's ``OrderAdmin.save_model()`` override automatically
injects ``_changed_by = request.user`` so every admin status change is
attributed to the acting staff member.

Known limitation
----------------
``Order.objects.filter(...).update(status=...)`` bypasses Django's
``save()`` machinery entirely, so these signal handlers will NOT fire.
Always use instance-level ``save()`` (optionally with ``update_fields``)
when a status change must be audit-logged.
"""

from django.db.models import F
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.products.models import Product

from .models import Order, OrderItem, OrderStatusHistory


@receiver(pre_save, sender=Order)
def order_pre_save(sender, instance: Order, **kwargs) -> None:
    """Snapshot the current DB status before the save overwrites it."""
    if instance.pk is None:
        # Brand-new order — no previous status exists in the DB
        instance._pre_save_status = None
    else:
        # Fetch only the status column to keep the query as light as possible
        instance._pre_save_status = (
            Order.objects.values_list("status", flat=True)
            .filter(pk=instance.pk)
            .first()
        )


@receiver(post_save, sender=Order)
def order_post_save(sender, instance: Order, created: bool, **kwargs) -> None:
    """Write a history record when the order status changes.

    Also restores product stock when an order is cancelled so that
    products become available for purchase again.
    """
    old_status: str | None = getattr(instance, "_pre_save_status", None)
    changed_by = getattr(instance, "_changed_by", None)
    notes: str = getattr(instance, "_status_notes", "")

    status_changed = old_status != instance.status
    should_log = created or status_changed

    if should_log:
        OrderStatusHistory.objects.create(
            order=instance,
            old_status=None if created else old_status,
            new_status=instance.status,
            changed_by=changed_by,
            notes=notes,
        )

    # Restore stock for each item when an order is cancelled.
    # Guard: only fire on a genuine transition *to* cancelled so that
    # re-saving a cancelled order never double-restores stock.
    if status_changed and instance.status == Order.Status.CANCELLED:
        items = OrderItem.objects.filter(order_id=instance.pk).values(
            "product_id", "quantity"
        )
        for item in items:
            Product.objects.filter(pk=item["product_id"]).update(
                stock=F("stock") + item["quantity"]
            )

    # Remove transient attributes so they cannot accidentally persist across
    # multiple saves of the same in-memory instance
    instance.__dict__.pop("_changed_by", None)
    instance.__dict__.pop("_status_notes", None)
