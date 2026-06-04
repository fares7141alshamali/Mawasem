from django.contrib import admin
from django.urls import include, path

from core.views import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),
    path("api/v1/health/", health_check, name="health-check"),
    path("api/v1/", include("apps.products.urls")),
    path("api/v1/", include("apps.carts.urls")),
    path("api/v1/", include("apps.orders.urls")),
]
