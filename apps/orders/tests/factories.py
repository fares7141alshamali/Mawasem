from decimal import Decimal

import factory

from apps.carts.tests.factories import UserFactory
from apps.orders.models import Order, OrderItem
from apps.products.tests.factories import ProductFactory


class OrderFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Order

    user = factory.SubFactory(UserFactory)
    status = Order.Status.PENDING
    total_price = Decimal("100.00")
    shipping_address = "123 Test Street, Test City, TC 00000"


class OrderItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OrderItem

    order = factory.SubFactory(OrderFactory)
    product = factory.SubFactory(ProductFactory)
    quantity = 1
    price = factory.LazyAttribute(lambda o: o.product.selling_price)
