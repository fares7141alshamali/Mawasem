from rest_framework.routers import DefaultRouter

from .views import ConsumerNotificationViewSet, OrderViewSet

router = DefaultRouter()
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"consumer/notifications", ConsumerNotificationViewSet, basename="consumer-notification")

urlpatterns = router.urls
