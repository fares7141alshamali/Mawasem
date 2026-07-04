from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from core.views import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api-auth/", include("rest_framework.urls")),
    path("api/v1/health/", health_check, name="health-check"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Users: login + registration (token_obtain_pair lives here now)
    path("api/v1/", include("apps.users.urls")),
    path("api/v1/", include("apps.farmers.urls")),
    path("api/v1/", include("apps.products.urls")),
    path("api/v1/", include("apps.carts.urls")),
    path("api/v1/", include("apps.addresses.urls")),
    path("api/v1/", include("apps.orders.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
