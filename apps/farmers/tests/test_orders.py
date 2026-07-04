import pytest
from rest_framework.test import APIClient

from apps.farmers.tests.factories import FarmerFactory
from apps.orders.tests.factories import OrderFactory, OrderItemFactory
from apps.products.tests.factories import ProductFactory

FARMER_ORDERS_URL = "/api/v1/farmer/orders/"


@pytest.mark.django_db
def test_farmer_order_view_includes_shipping_coordinates():
    farmer = FarmerFactory()
    farmer.user.role = "farmer"
    farmer.user.save(update_fields=["role"])

    product = ProductFactory(farmer=farmer)
    order = OrderFactory(shipping_lat="31.963158", shipping_lng="35.930359")
    OrderItemFactory(order=order, product=product)

    client = APIClient()
    client.force_authenticate(user=farmer.user)
    response = client.get(FARMER_ORDERS_URL)

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["shipping_lat"] == "31.963158"
    assert data[0]["shipping_lng"] == "35.930359"
