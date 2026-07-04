import pytest

from apps.addresses.models import Address
from apps.addresses.tests.factories import AddressFactory
from apps.carts.models import CartItem
from apps.carts.tests.factories import CartFactory, CartItemFactory, UserFactory
from apps.orders.models import Order
from apps.orders.tests.factories import OrderFactory
from apps.products.tests.factories import ProductFactory

CHECKOUT_URL = "/api/v1/orders/checkout/"
ORDERS_URL = "/api/v1/orders/"

SHIPPING = "456 Farm Road, Amman, Jordan 11118"
SHIPPING_LAT = "31.963158"
SHIPPING_LNG = "35.930359"
CHECKOUT_PAYLOAD = {
    "shipping_address": SHIPPING,
    "latitude": SHIPPING_LAT,
    "longitude": SHIPPING_LNG,
}


# ---------------------------------------------------------------------------
# 1. Authentication guard
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_checkout_requires_authentication(api_client):
    assert api_client.post(CHECKOUT_URL, {}).status_code == 401


@pytest.mark.django_db
def test_orders_list_requires_authentication(api_client):
    assert api_client.get(ORDERS_URL).status_code == 401


# ---------------------------------------------------------------------------
# 2. Checkout — happy path
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_checkout_creates_order_from_cart(auth_client, user):
    cart = CartFactory(user=user)
    product = ProductFactory(selling_price="20.00", discount_price=None, stock=50)
    CartItemFactory(cart=cart, product=product, quantity=3)

    response = auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["total_price"] == "60.00"  # 3 × 20.00
    assert data["shipping_address"] == SHIPPING
    assert len(data["items"]) == 1
    assert data["items"][0]["quantity"] == 3
    assert data["items"][0]["price"] == "20.00"


@pytest.mark.django_db
def test_checkout_uses_discount_price_when_lower(auth_client, user):
    cart = CartFactory(user=user)
    product = ProductFactory(selling_price="30.00", discount_price="18.00", stock=10)
    CartItemFactory(cart=cart, product=product, quantity=2)

    response = auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)

    assert response.status_code == 201
    data = response.json()
    assert data["total_price"] == "36.00"       # 2 × 18.00 (discount)
    assert data["items"][0]["price"] == "18.00"  # captured discount price


@pytest.mark.django_db
def test_checkout_multi_item_cart(auth_client, user):
    cart = CartFactory(user=user)
    product_a = ProductFactory(selling_price="10.00", discount_price=None, stock=100)
    product_b = ProductFactory(selling_price="25.00", discount_price=None, stock=100)
    CartItemFactory(cart=cart, product=product_a, quantity=4)
    CartItemFactory(cart=cart, product=product_b, quantity=2)

    response = auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)

    assert response.status_code == 201
    data = response.json()
    assert data["total_price"] == "90.00"  # (4×10) + (2×25)
    assert len(data["items"]) == 2


# ---------------------------------------------------------------------------
# 3. Checkout — stock management
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_checkout_deducts_stock(auth_client, user):
    cart = CartFactory(user=user)
    product = ProductFactory(stock=50)
    CartItemFactory(cart=cart, product=product, quantity=7)

    auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)

    product.refresh_from_db()
    assert product.stock == 43


@pytest.mark.django_db
def test_checkout_insufficient_stock_returns_400(auth_client, user):
    cart = CartFactory(user=user)
    product = ProductFactory(stock=3)
    CartItemFactory(cart=cart, product=product, quantity=5)

    response = auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)

    assert response.status_code == 400
    assert Order.objects.count() == 0  # transaction was rolled back


@pytest.mark.django_db
def test_checkout_exact_stock_succeeds(auth_client, user):
    """Ordering exactly the available quantity must succeed."""
    cart = CartFactory(user=user)
    product = ProductFactory(stock=5)
    CartItemFactory(cart=cart, product=product, quantity=5)

    response = auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)

    assert response.status_code == 201
    product.refresh_from_db()
    assert product.stock == 0


# ---------------------------------------------------------------------------
# 4. Checkout — cart lifecycle
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_checkout_clears_cart(auth_client, user):
    cart = CartFactory(user=user)
    CartItemFactory.create_batch(3, cart=cart)

    auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)

    assert not CartItem.objects.filter(cart=cart).exists()


@pytest.mark.django_db
def test_failed_checkout_does_not_clear_cart(auth_client, user):
    """A 400 response must leave the cart intact (transaction rollback)."""
    cart = CartFactory(user=user)
    product = ProductFactory(stock=0)
    CartItemFactory(cart=cart, product=product, quantity=1)

    auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)

    assert CartItem.objects.filter(cart=cart).exists()


# ---------------------------------------------------------------------------
# 5. Checkout — input validation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_checkout_empty_cart_returns_400(auth_client):
    response = auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)
    assert response.status_code == 400


@pytest.mark.django_db
def test_checkout_no_cart_at_all_returns_400(auth_client):
    """User has never had a cart — must still return 400, not 500."""
    response = auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)
    assert response.status_code == 400


@pytest.mark.django_db
def test_checkout_missing_shipping_address_returns_400(auth_client, user):
    cart = CartFactory(user=user)
    CartItemFactory(cart=cart)

    response = auth_client.post(CHECKOUT_URL, {})

    assert response.status_code == 400
    assert "non_field_errors" in response.json()


# ---------------------------------------------------------------------------
# 5b. Checkout — saved address / inline location
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_checkout_with_address_id_snapshots_coordinates(auth_client, user):
    cart = CartFactory(user=user)
    CartItemFactory(cart=cart)
    address = AddressFactory(user=user)

    response = auth_client.post(CHECKOUT_URL, {"address_id": address.id}, format="json")

    assert response.status_code == 201, response.data
    data = response.json()
    assert data["shipping_address"] == address.full_address
    assert data["shipping_lat"] == str(address.latitude)
    assert data["shipping_lng"] == str(address.longitude)

    order = Order.objects.get(pk=data["id"])
    assert str(order.shipping_lat) == str(address.latitude)
    assert str(order.shipping_lng) == str(address.longitude)


@pytest.mark.django_db
def test_checkout_with_other_users_address_id_returns_400(auth_client, user, other_user):
    cart = CartFactory(user=user)
    CartItemFactory(cart=cart)
    foreign_address = AddressFactory(user=other_user)

    response = auth_client.post(CHECKOUT_URL, {"address_id": foreign_address.id}, format="json")

    assert response.status_code == 400
    assert "address_id" in response.json()
    assert Order.objects.count() == 0


@pytest.mark.django_db
def test_checkout_inline_location_without_saving(auth_client, user):
    cart = CartFactory(user=user)
    CartItemFactory(cart=cart)

    response = auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD, format="json")

    assert response.status_code == 201, response.data
    data = response.json()
    assert data["shipping_lat"] == SHIPPING_LAT
    assert data["shipping_lng"] == SHIPPING_LNG
    assert Address.objects.filter(user=user).count() == 0


@pytest.mark.django_db
def test_checkout_inline_location_with_save_address_creates_address(auth_client, user):
    cart = CartFactory(user=user)
    CartItemFactory(cart=cart)

    payload = dict(CHECKOUT_PAYLOAD, save_address=True, label="work")
    response = auth_client.post(CHECKOUT_URL, payload, format="json")

    assert response.status_code == 201, response.data
    assert Address.objects.filter(user=user).count() == 1
    saved = Address.objects.get(user=user)
    assert saved.label == "work"
    assert str(saved.latitude) == SHIPPING_LAT
    assert saved.is_default is True  # auto-promoted as the user's first address


@pytest.mark.django_db
def test_checkout_rejects_both_address_id_and_inline(auth_client, user):
    cart = CartFactory(user=user)
    CartItemFactory(cart=cart)
    address = AddressFactory(user=user)

    payload = dict(CHECKOUT_PAYLOAD, address_id=address.id)
    response = auth_client.post(CHECKOUT_URL, payload, format="json")

    assert response.status_code == 400
    assert "non_field_errors" in response.json()


@pytest.mark.django_db
def test_orders_without_coordinates_serialize_with_null_lat_lng(auth_client, user):
    """Regression: pre-existing orders (OrderFactory sets no lat/lng) must
    still serialize cleanly with nullable coordinate fields."""
    OrderFactory(user=user)

    response = auth_client.get(ORDERS_URL)

    assert response.status_code == 200
    order_data = response.json()["results"][0]
    assert order_data["shipping_lat"] is None
    assert order_data["shipping_lng"] is None


# ---------------------------------------------------------------------------
# 6. Price history integrity
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_order_item_price_is_frozen_at_checkout(auth_client, user):
    """Changing the product price after checkout must not affect the order."""
    cart = CartFactory(user=user)
    product = ProductFactory(selling_price="20.00", discount_price=None, stock=10)
    CartItemFactory(cart=cart, product=product, quantity=1)

    auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)

    # Simulate a price change after the order was placed
    product.selling_price = "99.00"
    product.save()

    response = auth_client.get(ORDERS_URL)
    assert response.json()["results"][0]["items"][0]["price"] == "20.00"


# ---------------------------------------------------------------------------
# 7. Order list
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_list_orders_returns_only_current_users_orders(auth_client, user, other_user):
    OrderFactory.create_batch(2, user=user)
    OrderFactory(user=other_user)

    response = auth_client.get(ORDERS_URL)

    assert response.status_code == 200
    assert response.json()["count"] == 2


@pytest.mark.django_db
def test_list_orders_newest_first(auth_client, user):
    order_a = OrderFactory(user=user)
    order_b = OrderFactory(user=user)

    response = auth_client.get(ORDERS_URL)

    ids = [o["id"] for o in response.json()["results"]]
    # order_b was created after order_a; it should appear first
    assert ids.index(order_b.pk) < ids.index(order_a.pk)


@pytest.mark.django_db
def test_order_history_after_checkout(auth_client, user):
    cart = CartFactory(user=user)
    CartItemFactory(cart=cart)

    auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)

    response = auth_client.get(ORDERS_URL)
    assert response.status_code == 200
    results = response.json()["results"]
    assert len(results) == 1
    assert results[0]["status"] == "pending"
    assert len(results[0]["items"]) == 1


# ---------------------------------------------------------------------------
# 8. Status history — signal behaviour
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_initial_history_entry_written_on_order_creation(user):
    """Every new order must have exactly one history entry: the PENDING creation."""
    order = OrderFactory(user=user)

    assert order.status_history.count() == 1
    entry = order.status_history.first()
    assert entry.old_status is None
    assert entry.new_status == Order.Status.PENDING


@pytest.mark.django_db
def test_history_entry_written_on_status_transition(user):
    order = OrderFactory(user=user)
    count_before = order.status_history.count()

    order.status = Order.Status.PROCESSING
    order.save(update_fields=["status"])

    assert order.status_history.count() == count_before + 1
    latest = order.status_history.order_by("-changed_at").first()
    assert latest.old_status == Order.Status.PENDING
    assert latest.new_status == Order.Status.PROCESSING


@pytest.mark.django_db
def test_no_history_entry_when_status_unchanged(user):
    """Saving other fields (e.g. shipping_address) must not add a history row."""
    order = OrderFactory(user=user)
    count_before = order.status_history.count()

    order.shipping_address = "Updated street, Same City, 99999"
    order.save(update_fields=["shipping_address"])

    assert order.status_history.count() == count_before


@pytest.mark.django_db
def test_history_records_changed_by_and_notes(user):
    """_changed_by and _status_notes are picked up by the signal handler."""
    order = OrderFactory(user=user)
    actor = UserFactory()

    order._changed_by = actor
    order._status_notes = "Handed over to the delivery company"
    order.status = Order.Status.SHIPPED
    order.save(update_fields=["status"])

    latest = order.status_history.order_by("-changed_at").first()
    assert latest.changed_by == actor
    assert latest.notes == "Handed over to the delivery company"
    assert latest.new_status == Order.Status.SHIPPED


@pytest.mark.django_db
def test_transient_attributes_cleaned_up_after_save(user):
    """_changed_by and _status_notes must not linger after save()."""
    order = OrderFactory(user=user)
    order._changed_by = user
    order._status_notes = "test"
    order.status = Order.Status.PROCESSING
    order.save(update_fields=["status"])

    assert not hasattr(order, "_changed_by")
    assert not hasattr(order, "_status_notes")


@pytest.mark.django_db
def test_full_transition_chain_is_recorded(user):
    """A complete lifecycle should produce one entry per transition."""
    order = OrderFactory(user=user)
    transitions = [
        Order.Status.PROCESSING,
        Order.Status.SHIPPED,
        Order.Status.COMPLETED,
    ]
    for new_status in transitions:
        order.status = new_status
        order.save(update_fields=["status"])

    # 1 initial (PENDING) + 3 transitions = 4 entries
    assert order.status_history.count() == 4
    statuses = list(
        order.status_history.order_by("changed_at").values_list("new_status", flat=True)
    )
    assert statuses == [
        Order.Status.PENDING,
        Order.Status.PROCESSING,
        Order.Status.SHIPPED,
        Order.Status.COMPLETED,
    ]


# ---------------------------------------------------------------------------
# 9. Status history — API responses
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_checkout_response_includes_initial_status_history(auth_client, user):
    """The 201 checkout response must already contain the PENDING history entry."""
    cart = CartFactory(user=user)
    CartItemFactory(cart=cart)

    response = auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)

    assert response.status_code == 201
    history = response.json()["status_history"]
    assert len(history) == 1
    assert history[0]["old_status"] is None
    assert history[0]["new_status"] == "pending"
    assert history[0]["new_status_display"] == "Pending"


@pytest.mark.django_db
def test_order_list_includes_status_history_field(auth_client, user):
    """GET /api/v1/orders/ must include status_history on every order."""
    cart = CartFactory(user=user)
    CartItemFactory(cart=cart)
    auth_client.post(CHECKOUT_URL, CHECKOUT_PAYLOAD)

    response = auth_client.get(ORDERS_URL)

    order_data = response.json()["results"][0]
    assert "status_history" in order_data
    assert len(order_data["status_history"]) >= 1


@pytest.mark.django_db
def test_status_history_newest_first_in_api(user):
    """status_history entries must be ordered newest → oldest in the API response."""
    order = OrderFactory(user=user)
    order.status = Order.Status.PROCESSING
    order.save(update_fields=["status"])
    order.status = Order.Status.SHIPPED
    order.save(update_fields=["status"])

    from rest_framework.test import APIClient

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get(ORDERS_URL)

    history = response.json()["results"][0]["status_history"]
    new_statuses = [h["new_status"] for h in history]
    assert new_statuses[0] == Order.Status.SHIPPED    # newest first
    assert new_statuses[-1] == Order.Status.PENDING   # oldest last
