from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, PriceComparisonView, ProductViewSet

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"categories", CategoryViewSet, basename="category")

# The explicit path must come BEFORE router.urls so "compare" is never
# mistaken for a product slug by the router's <slug> pattern.
urlpatterns = [
    path("products/compare/", PriceComparisonView.as_view(), name="product-price-compare"),
    *router.urls,
]
