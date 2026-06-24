from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import FarmerMeView, FarmerOrderViewSet, FarmerProductViewSet, FarmerViewSet

# Public profile endpoints: /api/v1/farmers/
router = DefaultRouter()
router.register(r"farmers", FarmerViewSet, basename="farmer")

# Private dashboard endpoints: /api/v1/farmer/products/ and /api/v1/farmer/orders/
farmer_router = DefaultRouter()
farmer_router.register(r"farmer/products", FarmerProductViewSet, basename="farmer-product")
farmer_router.register(r"farmer/orders", FarmerOrderViewSet, basename="farmer-order")

urlpatterns = [
    path("farmer/me/", FarmerMeView.as_view(), name="farmer-me"),
    *router.urls,
    *farmer_router.urls,
]
