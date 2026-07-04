import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.carts.tests.factories import CartItemFactory, UserFactory
from apps.farmers.tests.factories import FarmerFactory
from apps.notifications.models import Notification
from apps.products.tests.factories import ProductFactory


def auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


@pytest.mark.django_db
def test_new_order_and_status_change_notify_correctly():
    farmer_user = UserFactory(username="farmer1", role="farmer")
    farmer = FarmerFactory(user=farmer_user)
    product = ProductFactory(farmer=farmer, stock=50, selling_price="20.00")
    consumer = UserFactory(username="consumer1")
    from apps.carts.tests.factories import CartFactory
    cart = CartFactory(user=consumer)
    CartItemFactory(cart=cart, product=product, quantity=2)

    consumer_client = auth_client(consumer)
    farmer_client = auth_client(farmer_user)

    resp = consumer_client.post(
        "/api/v1/orders/checkout/",
        {
            "shipping_address": "123 Test Street, Test City, Test Region",
            "latitude": "31.963158",
            "longitude": "35.930359",
        },
        format="json",
    )
    assert resp.status_code == 201, resp.data
    order_id = resp.data["id"]

    r = farmer_client.get("/api/v1/farmer/notifications/")
    assert r.status_code == 200
    assert len(r.data) == 1
    assert r.data[0]["kind"] == Notification.Kind.NEW_ORDER

    r = consumer_client.get("/api/v1/consumer/notifications/")
    assert r.status_code == 200
    assert r.data == []

    r = farmer_client.patch(
        f"/api/v1/farmer/orders/{order_id}/status/", {"status": "processing"}, format="json"
    )
    assert r.status_code == 200, r.data

    r = consumer_client.get("/api/v1/consumer/notifications/")
    assert r.status_code == 200
    assert len(r.data) == 1
    assert r.data[0]["kind"] == Notification.Kind.ORDER_STATUS
    assert r.data[0]["is_read"] is False

    r = consumer_client.post("/api/v1/consumer/notifications/mark-read/")
    assert r.status_code == 200

    r = consumer_client.get("/api/v1/consumer/notifications/")
    assert r.data[0]["is_read"] is True
