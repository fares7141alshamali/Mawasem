import factory

from apps.carts.tests.factories import UserFactory
from apps.farmers.models import Farmer


class FarmerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Farmer

    user = factory.SubFactory(UserFactory)
    farm_name = factory.Sequence(lambda n: f"Farm {n}")
    location_lat = "31.963158"
    location_lng = "35.930359"
    phone_number = "+962791234567"
    bio = "A small organic farm in the Jordan Valley."
    is_verified = False
