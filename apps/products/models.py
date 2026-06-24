from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class Category(models.Model):
    name_en = models.CharField(_("name (EN)"), max_length=255)
    name_ar = models.CharField(_("name (AR)"), max_length=255)
    description_en = models.TextField(_("description (EN)"))
    description_ar = models.TextField(_("description (AR)"))
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
        verbose_name=_("parent category"),
    )
    slug = models.SlugField(_("slug"), unique=True, max_length=255)
    image = models.ImageField(_("image"), upload_to="categories/", blank=True, null=True)
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        verbose_name = _("category")
        verbose_name_plural = _("categories")

    def __str__(self) -> str:
        return self.name_en


class Product(models.Model):
    name_en = models.CharField(_("name (EN)"), max_length=255)
    name_ar = models.CharField(_("name (AR)"), max_length=255)
    description_en = models.TextField(_("description (EN)"))
    description_ar = models.TextField(_("description (AR)"))
    slug = models.SlugField(_("slug"), unique=True, max_length=255)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
        verbose_name=_("category"),
    )

    farm_cost = models.DecimalField(
        _("farm cost"),
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    selling_price = models.DecimalField(
        _("selling price"),
        max_digits=10,
        decimal_places=2,
    )
    discount_price = models.DecimalField(
        _("discount price"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    farmer = models.ForeignKey(
        "farmers.Farmer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
        verbose_name=_("farmer"),
    )

    stock = models.PositiveIntegerField(_("stock"), default=0)
    low_stock_threshold = models.PositiveIntegerField(
        _("low stock threshold"),
        default=10,
    )
    sku = models.CharField(_("SKU"), max_length=100, unique=True, blank=True, null=True)
    weight_value = models.DecimalField(
        _("weight value"), max_digits=8, decimal_places=3, null=True, blank=True
    )
    weight_unit = models.CharField(_("weight unit"), max_length=10, blank=True, default="kg")
    is_organic = models.BooleanField(_("organic"), default=False)
    is_active = models.BooleanField(_("active"), default=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        verbose_name = _("product")
        verbose_name_plural = _("products")

    def __str__(self) -> str:
        return self.name_en

    @property
    def current_price(self):
        """Return discount_price when active, otherwise selling_price."""
        if self.discount_price is not None and self.discount_price < self.selling_price:
            return self.discount_price
        return self.selling_price

    @property
    def gross_profit(self):
        """الربح الصافي بالدينار الأردني."""
        if self.current_price is not None and self.farm_cost is not None:
            return self.current_price - self.farm_cost
        return 0

    @property
    def margin(self):
        """نسبة هامش الربح المئوية؛ تضمن عدم حدوث خطأ عند القيم الفارغة."""
        if not self.current_price or self.farm_cost is None:
            return 0
        return round(
            (self.current_price - self.farm_cost) / self.current_price * 100,
            2,
        )

    @property
    def is_in_stock(self) -> bool:
        return self.stock > 0

    @property
    def is_low_stock(self) -> bool:
        return 0 < self.stock <= self.low_stock_threshold


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name=_("product"),
    )
    image = models.ImageField(_("image"), upload_to="products/")
    alt_text = models.CharField(_("alt text"), max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(_("sort order"), default=0)

    class Meta:
        verbose_name = _("product image")
        verbose_name_plural = _("product images")
        ordering = ["sort_order"]

    def __str__(self) -> str:
        return f"{self.product.name_en} — image {self.sort_order}"