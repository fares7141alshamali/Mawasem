from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.products.models import Product


class Cart(models.Model):
    """One active cart per authenticated user."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart",
        verbose_name=_("user"),
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("cart")
        verbose_name_plural = _("carts")

    def __str__(self) -> str:
        return f"Cart({self.user})"

    @property
    def total_price(self) -> Decimal:
        """Sum of all item totals; reads from prefetch cache when available."""
        return sum(
            (item.total_price for item in self.items.all()),
            Decimal("0.00"),
        )


class CartItem(models.Model):
    """A single product line inside a cart, representing wholesale units."""

    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name=_("cart"),
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="cart_items",
        verbose_name=_("product"),
    )
    quantity = models.PositiveIntegerField(_("quantity"), default=1)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        verbose_name = _("cart item")
        verbose_name_plural = _("cart items")
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product"],
                name="unique_cart_product",
            )
        ]

    def __str__(self) -> str:
        return f"{self.quantity}× {self.product.name_en}"

    @property
    def total_price(self) -> Decimal:
        """quantity × current_price (respects active discount)."""
        return self.product.current_price * self.quantity
