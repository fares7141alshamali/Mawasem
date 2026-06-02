import django_filters
from django.db.models import Q, QuerySet

from .models import Category, Product


class ProductFilterSet(django_filters.FilterSet):
    """FilterSet for the Product catalog endpoint.

    Supported query parameters
    --------------------------
    min_price : decimal  selling_price >= value
    max_price : decimal  selling_price <= value
    category  : str      category slug; a top-level slug automatically expands
                         to include products from all direct child subcategories
    """

    min_price = django_filters.NumberFilter(
        field_name="selling_price",
        lookup_expr="gte",
        label="Minimum price",
    )
    max_price = django_filters.NumberFilter(
        field_name="selling_price",
        lookup_expr="lte",
        label="Maximum price",
    )
    category = django_filters.CharFilter(
        method="filter_by_category_slug",
        label="Category slug",
    )

    class Meta:
        model = Product
        fields: list[str] = ["min_price", "max_price", "category"]

    def filter_by_category_slug(
        self, queryset: QuerySet, name: str, value: str
    ) -> QuerySet:
        """Filter products by category slug with automatic top-level fan-out.

        A top-level category slug (parent IS NULL) expands the filter to
        include both its own products and products in any of its direct
        children — so the client never needs to issue separate requests
        per subcategory.

        An unknown or inactive slug returns an empty queryset rather than
        silently ignoring the parameter.
        """
        try:
            cat = Category.objects.only("id", "parent_id").get(
                slug=value, is_active=True
            )
        except Category.DoesNotExist:
            return queryset.none()

        if cat.parent_id is not None:
            # Subcategory: direct match only
            return queryset.filter(category=cat)

        # Top-level: own products OR products whose category is a direct child
        return queryset.filter(Q(category=cat) | Q(category__parent=cat))
