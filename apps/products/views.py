from django.db.models import Case, Count, F, Prefetch, Q, When
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, mixins, viewsets
from rest_framework.exceptions import NotFound
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .filters import ProductFilterSet
from .models import Category, Product
from .serializers import CategorySerializer, ProductDetailSerializer, ProductListSerializer


class CategoryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = CategorySerializer

    def get_queryset(self):
        children_qs = Category.objects.filter(is_active=True).annotate(
            product_count=Count("products", filter=Q(products__is_active=True))
        )
        return (
            Category.objects.filter(parent__isnull=True, is_active=True)
            .annotate(product_count=Count("products", filter=Q(products__is_active=True)))
            .prefetch_related(Prefetch("children", queryset=children_qs))
            .order_by("name_en")
        )


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only catalog endpoint for active products.

    Filtering  — via query parameters
    ----------
    ?min_price=<decimal>    selling_price >= value
    ?max_price=<decimal>    selling_price <= value
    ?category=<slug>        exact match for a subcategory; fans out to all
                            direct children when the slug is a top-level category

    Search     — ?search=<term>
    -------
    Matches against name_en and name_ar (case-insensitive).

    Ordering   — ?ordering=<field>
    --------
    Allowed fields: selling_price, stock (prefix with - to reverse).
    Default: newest first (-created_at).

    Performance
    -----------
    The base queryset is capped at 3 DB queries (COUNT + JOIN SELECT + image
    prefetch) regardless of page size. The ?category filter adds one extra
    lookup to resolve the slug; all other filters are applied in-queryset.
    """

    permission_classes = [AllowAny]
    lookup_field = "slug"
    filterset_class = ProductFilterSet
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name_en", "name_ar"]
    ordering_fields = ["selling_price", "stock"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            Product.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related("images")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductListSerializer

    def get_object(self):
        queryset = self.get_queryset()
        slug = self.kwargs[self.lookup_field]
        try:
            instance = queryset.get(slug=slug)
        except Product.DoesNotExist:
            raise NotFound()
        self.check_object_permissions(self.request, instance)
        return instance


class PriceComparisonView(generics.ListAPIView):
    """GET /api/v1/products/compare/?q=<term>

    Returns all active, in-stock products whose name matches the search term,
    sorted cheapest-first by effective price (discount_price when valid,
    otherwise selling_price).  No pagination — the response is always a plain
    array so the frontend can render a simple side-by-side table.
    """

    permission_classes = [AllowAny]
    serializer_class   = ProductListSerializer
    pagination_class   = None

    def get_queryset(self):
        q = self.request.query_params.get("q", "").strip()
        if not q:
            return Product.objects.none()

        effective_price = Case(
            When(
                discount_price__isnull=False,
                discount_price__lt=F("selling_price"),
                then=F("discount_price"),
            ),
            default=F("selling_price"),
        )

        return (
            Product.objects.filter(is_active=True, stock__gt=0)
            .filter(Q(name_en__icontains=q) | Q(name_ar__icontains=q))
            .select_related("category", "farmer")
            .prefetch_related("images")
            .annotate(effective_price=effective_price)
            .order_by("effective_price")
        )

    def list(self, request, *args, **kwargs):
        if not request.query_params.get("q", "").strip():
            return Response(
                {"detail": "Query parameter 'q' is required."},
                status=400,
            )
        return super().list(request, *args, **kwargs)
