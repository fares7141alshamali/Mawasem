from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class OrdersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.orders"
    verbose_name = _("Orders")

    def ready(self) -> None:
        # Import the signals module so the @receiver decorators are evaluated
        # and the handlers are registered with Django's signal dispatcher.
        # This runs exactly once after all models are loaded.
        import apps.orders.signals  # noqa: F401
