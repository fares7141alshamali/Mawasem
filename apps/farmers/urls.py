from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import FarmerMeView, FarmerNotificationViewSet, FarmerOrderViewSet, FarmerProductViewSet, FarmerViewSet

# Public profile endpoints: /api/v1/farmers/
router = DefaultRouter()
router.register(r"farmers", FarmerViewSet, basename="farmer")

# Private dashboard endpoints
farmer_router = DefaultRouter()
farmer_router.register(r"farmer/products", FarmerProductViewSet, basename="farmer-product")
farmer_router.register(r"farmer/orders", FarmerOrderViewSet, basename="farmer-order")
farmer_router.register(r"farmer/notifications", FarmerNotificationViewSet, basename="farmer-notification")

urlpatterns = [
    path("farmer/me/", FarmerMeView.as_view(), name="farmer-me"),
    *router.urls,
    *farmer_router.urls,
]
