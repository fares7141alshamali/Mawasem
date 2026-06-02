from django.db.models import Count, Prefetch, Q
from rest_framework import mixins, viewsets
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny

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
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return (
            Product.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related("images")
            .order_by("name_en")
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
