from rest_framework import viewsets
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny

from .models import Product
from .serializers import ProductDetailSerializer, ProductListSerializer


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
