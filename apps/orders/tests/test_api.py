import pytest

from apps.carts.models import CartItem
from apps.carts.tests.factories import CartFactory, CartItemFactory
from apps.orders.models import Order
from apps.orders.tests.factories import OrderFactory
from apps.products.tests.factories import ProductFactory

CHECKOUT_URL = "/api/v1/orders/checkout/"
ORDERS_URL = "/api/v1/orders/"

SHIPPING = "456 Farm Road, Amman, Jordan 11118"


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

    response = auth_client.post(CHECKOUT_URL, {"shipping_address": SHIPPING})

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

    response = auth_client.post(CHECKOUT_URL, {"shipping_address": SHIPPING})

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

    response = auth_client.post(CHECKOUT_URL, {"shipping_address": SHIPPING})

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

    auth_client.post(CHECKOUT_URL, {"shipping_address": SHIPPING})

    product.refresh_from_db()
    assert product.stock == 43


@pytest.mark.django_db
def test_checkout_insufficient_stock_returns_400(auth_client, user):
    cart = CartFactory(user=user)
    product = ProductFactory(stock=3)
    CartItemFactory(cart=cart, product=product, quantity=5)

    response = auth_client.post(CHECKOUT_URL, {"shipping_address": SHIPPING})

    assert response.status_code == 400
    assert Order.objects.count() == 0  # transaction was rolled back


@pytest.mark.django_db
def test_checkout_exact_stock_succeeds(auth_client, user):
    """Ordering exactly the available quantity must succeed."""
    cart = CartFactory(user=user)
    product = ProductFactory(stock=5)
    CartItemFactory(cart=cart, product=product, quantity=5)

    response = auth_client.post(CHECKOUT_URL, {"shipping_address": SHIPPING})

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

    auth_client.post(CHECKOUT_URL, {"shipping_address": SHIPPING})

    assert not CartItem.objects.filter(cart=cart).exists()


@pytest.mark.django_db
def test_failed_checkout_does_not_clear_cart(auth_client, user):
    """A 400 response must leave the cart intact (transaction rollback)."""
    cart = CartFactory(user=user)
    product = ProductFactory(stock=0)
    CartItemFactory(cart=cart, product=product, quantity=1)

    auth_client.post(CHECKOUT_URL, {"shipping_address": SHIPPING})

    assert CartItem.objects.filter(cart=cart).exists()


# ---------------------------------------------------------------------------
# 5. Checkout — input validation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_checkout_empty_cart_returns_400(auth_client):
    response = auth_client.post(CHECKOUT_URL, {"shipping_address": SHIPPING})
    assert response.status_code == 400


@pytest.mark.django_db
def test_checkout_no_cart_at_all_returns_400(auth_client):
    """User has never had a cart — must still return 400, not 500."""
    response = auth_client.post(CHECKOUT_URL, {"shipping_address": SHIPPING})
    assert response.status_code == 400


@pytest.mark.django_db
def test_checkout_missing_shipping_address_returns_400(auth_client, user):
    cart = CartFactory(user=user)
    CartItemFactory(cart=cart)

    response = auth_client.post(CHECKOUT_URL, {})

    assert response.status_code == 400
    assert "shipping_address" in response.json()


# ---------------------------------------------------------------------------
# 6. Price history integrity
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_order_item_price_is_frozen_at_checkout(auth_client, user):
    """Changing the product price after checkout must not affect the order."""
    cart = CartFactory(user=user)
    product = ProductFactory(selling_price="20.00", discount_price=None, stock=10)
    CartItemFactory(cart=cart, product=product, quantity=1)

    auth_client.post(CHECKOUT_URL, {"shipping_address": SHIPPING})

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

    auth_client.post(CHECKOUT_URL, {"shipping_address": SHIPPING})

    response = auth_client.get(ORDERS_URL)
    assert response.status_code == 200
    results = response.json()["results"]
    assert len(results) == 1
    assert results[0]["status"] == "pending"
    assert len(results[0]["items"]) == 1
