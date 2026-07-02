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

# Human-readable messages sent to the buyer on each status transition.
_STATUS_MESSAGES = {
    Order.Status.PROCESSING: (
        "Order #{id} is being processed",
        "Your order is now being prepared by the farmer.",
    ),
    Order.Status.SHIPPED: (
        "Order #{id} has been shipped",
        "Your order is on its way!",
    ),
    Order.Status.COMPLETED: (
        "Order #{id} completed",
        "Your order has been delivered. Thank you!",
    ),
    Order.Status.CANCELLED: (
        "Order #{id} was cancelled",
        "Your order has been cancelled.",
    ),
}


def _notify_order_status(order: Order) -> None:
    """Create a buyer notification for the new order status.

    Imported lazily to avoid a circular import between orders ↔ notifications.
    Wrapped in try/except so a DB hiccup never rolls back the status update.
    """
    template = _STATUS_MESSAGES.get(order.status)
    if template is None:
        return
    try:
        from apps.notifications.models import Notification

        title_tpl, body = template
        Notification.objects.create(
            recipient=order.user,
            kind=Notification.Kind.ORDER_STATUS,
            title=title_tpl.format(id=order.pk),
            body=body,
            order=order,
        )
    except Exception:
        pass  # never block a status update due to a notification failure


def _notify_farmers_new_order(order: Order) -> None:
    """Create a NEW_ORDER notification for each farmer with items in this order.

    Must be called AFTER OrderItem bulk_create so the items exist in the DB.
    Wrapped in try/except so a failure never rolls back the checkout transaction.
    """
    try:
        from apps.notifications.models import Notification

        farmer_user_ids = list(
            OrderItem.objects.filter(order=order)
            .values_list("product__farmer__user_id", flat=True)
            .distinct()
        )
        for uid in farmer_user_ids:
            if uid:
                Notification.objects.create(
                    recipient_id=uid,
                    kind=Notification.Kind.NEW_ORDER,
                    title=f"New order #{order.pk}",
                    body=f"A new order (#{order.pk}) was placed by {order.user.username}.",
                    order=order,
                )
    except Exception:
        pass


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

    # Notify the buyer whenever the status changes (skip the initial creation
    # since "pending" is implicit and needs no notification).
    if status_changed:
        _notify_order_status(instance)

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
