import factory

from apps.addresses.models import Address
from apps.carts.tests.factories import UserFactory


class AddressFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Address

    user = factory.SubFactory(UserFactory)
    label = Address.Label.HOME
    full_address = factory.Sequence(lambda n: f"{n} Test Street, Amman")
    city = "Amman"
    latitude = "31.963158"
    longitude = "35.930359"
