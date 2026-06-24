import pytest
from rest_framework.test import APIClient

from apps.carts.models import Cart, CartItem
from apps.carts.tests.factories import CartFactory, CartItemFactory
from apps.products.tests.factories import ProductFactory

CART_URL = "/api/v1/cart/"
ADD_URL = "/api/v1/cart/add/"
CLEAR_URL = "/api/v1/cart/clear/"


def update_url(item_id: int) -> str:
    return f"/api/v1/cart/update-item/{item_id}/"


def remove_url(item_id: int) -> str:
    return f"/api/v1/cart/remove-item/{item_id}/"


# ---------------------------------------------------------------------------
# 1. Authentication guard
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_cart_requires_authentication(api_client):
    assert api_client.get(CART_URL).status_code == 401


@pytest.mark.django_db
def test_add_requires_authentication(api_client):
    assert api_client.post(ADD_URL, {}).status_code == 401


# ---------------------------------------------------------------------------
# 2. GET /api/v1/cart/ — fetch cart
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_get_cart_creates_empty_cart_on_first_access(auth_client, user):
    response = auth_client.get(CART_URL)

    assert response.status_code == 200
    data = response.json()
    assert data["item_count"] == 0
    assert data["items"] == []
    assert data["total_price"] == "0.00"
    assert Cart.objects.filter(user=user).exists()


@pytest.mark.django_db
def test_get_cart_returns_existing_items(auth_client, user):
    cart = CartFactory(user=user)
    item = CartItemFactory(cart=cart, quantity=3)

    response = auth_client.get(CART_URL)

    assert response.status_code == 200
    data = response.json()
    assert data["item_count"] == 1
    assert data["items"][0]["quantity"] == 3
    assert data["items"][0]["product"]["slug"] == item.product.slug


# ---------------------------------------------------------------------------
# 3. POST /api/v1/cart/add/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_add_new_item_to_cart(auth_client):
    product = ProductFactory()

    response = auth_client.post(ADD_URL, {"product_id": product.pk, "quantity": 5})

    assert response.status_code == 200
    data = response.json()
    assert data["item_count"] == 1
    assert data["items"][0]["quantity"] == 5
    assert data["items"][0]["product"]["slug"] == product.slug


@pytest.mark.django_db
def test_add_item_defaults_quantity_to_1(auth_client):
    product = ProductFactory()

    response = auth_client.post(ADD_URL, {"product_id": product.pk})

    assert response.status_code == 200
    assert response.json()["items"][0]["quantity"] == 1


@pytest.mark.django_db
def test_add_existing_item_increments_quantity(auth_client, user):
    cart = CartFactory(user=user)
    product = ProductFactory()
    CartItemFactory(cart=cart, product=product, quantity=2)

    response = auth_client.post(ADD_URL, {"product_id": product.pk, "quantity": 3})

    assert response.status_code == 200
    assert response.json()["items"][0]["quantity"] == 5  # 2 + 3


@pytest.mark.django_db
def test_add_inactive_product_returns_400(auth_client):
    product = ProductFactory(is_active=False)

    response = auth_client.post(ADD_URL, {"product_id": product.pk, "quantity": 1})

    assert response.status_code == 400


@pytest.mark.django_db
def test_add_nonexistent_product_returns_400(auth_client):
    response = auth_client.post(ADD_URL, {"product_id": 99999, "quantity": 1})

    assert response.status_code == 400


@pytest.mark.django_db
def test_add_zero_quantity_returns_400(auth_client):
    product = ProductFactory()

    response = auth_client.post(ADD_URL, {"product_id": product.pk, "quantity": 0})

    assert response.status_code == 400


@pytest.mark.django_db
def test_add_negative_quantity_returns_400(auth_client):
    product = ProductFactory()

    response = auth_client.post(ADD_URL, {"product_id": product.pk, "quantity": -1})

    assert response.status_code == 400


# ---------------------------------------------------------------------------
# 4. PATCH /api/v1/cart/update-item/<item_id>/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_update_item_quantity(auth_client, user):
    cart = CartFactory(user=user)
    item = CartItemFactory(cart=cart, quantity=2)

    response = auth_client.patch(update_url(item.pk), {"quantity": 10})

    assert response.status_code == 200
    item.refresh_from_db()
    assert item.quantity == 10


@pytest.mark.django_db
def test_update_item_quantity_reflected_in_response(auth_client, user):
    cart = CartFactory(user=user)
    item = CartItemFactory(cart=cart, quantity=1)

    response = auth_client.patch(update_url(item.pk), {"quantity": 7})

    assert response.status_code == 200
    assert response.json()["items"][0]["quantity"] == 7


@pytest.mark.django_db
def test_update_item_zero_quantity_returns_400(auth_client, user):
    cart = CartFactory(user=user)
    item = CartItemFactory(cart=cart)

    response = auth_client.patch(update_url(item.pk), {"quantity": 0})

    assert response.status_code == 400


@pytest.mark.django_db
def test_update_item_from_other_user_returns_404(auth_client, other_user):
    other_cart = CartFactory(user=other_user)
    item = CartItemFactory(cart=other_cart)

    response = auth_client.patch(update_url(item.pk), {"quantity": 5})

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# 5. DELETE /api/v1/cart/remove-item/<item_id>/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_remove_item_from_cart(auth_client, user):
    cart = CartFactory(user=user)
    item = CartItemFactory(cart=cart)

    response = auth_client.delete(remove_url(item.pk))

    assert response.status_code == 200
    assert not CartItem.objects.filter(pk=item.pk).exists()
    assert response.json()["item_count"] == 0


@pytest.mark.django_db
def test_remove_item_returns_updated_cart(auth_client, user):
    cart = CartFactory(user=user)
    product_a = ProductFactory()
    product_b = ProductFactory()
    item_a = CartItemFactory(cart=cart, product=product_a)
    CartItemFactory(cart=cart, product=product_b)

    response = auth_client.delete(remove_url(item_a.pk))

    assert response.status_code == 200
    data = response.json()
    assert data["item_count"] == 1
    assert data["items"][0]["product"]["slug"] == product_b.slug


@pytest.mark.django_db
def test_remove_item_from_other_user_returns_404(auth_client, other_user):
    other_cart = CartFactory(user=other_user)
    item = CartItemFactory(cart=other_cart)

    response = auth_client.delete(remove_url(item.pk))

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# 6. POST /api/v1/cart/clear/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_clear_removes_all_items(auth_client, user):
    cart = CartFactory(user=user)
    CartItemFactory.create_batch(3, cart=cart)

    response = auth_client.post(CLEAR_URL)

    assert response.status_code == 200
    assert response.json()["item_count"] == 0
    assert not CartItem.objects.filter(cart=cart).exists()


@pytest.mark.django_db
def test_clear_empty_cart_is_idempotent(auth_client):
    response = auth_client.post(CLEAR_URL)

    assert response.status_code == 200
    assert response.json()["item_count"] == 0


# ---------------------------------------------------------------------------
# 7. Price calculation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_item_total_price_uses_selling_price(auth_client, user):
    cart = CartFactory(user=user)
    product = ProductFactory(selling_price="15.00", discount_price=None)
    CartItemFactory(cart=cart, product=product, quantity=4)

    data = auth_client.get(CART_URL).json()

    assert data["items"][0]["total_price"] == "60.00"  # 4 × 15.00


@pytest.mark.django_db
def test_item_total_price_uses_discount_when_lower(auth_client, user):
    cart = CartFactory(user=user)
    product = ProductFactory(selling_price="20.00", discount_price="12.00")
    CartItemFactory(cart=cart, product=product, quantity=3)

    data = auth_client.get(CART_URL).json()

    assert data["items"][0]["total_price"] == "36.00"  # 3 × 12.00


@pytest.mark.django_db
def test_cart_total_price_sums_all_items(auth_client, user):
    cart = CartFactory(user=user)
    product_a = ProductFactory(selling_price="10.00", discount_price=None)
    product_b = ProductFactory(selling_price="25.00", discount_price=None)
    CartItemFactory(cart=cart, product=product_a, quantity=2)
    CartItemFactory(cart=cart, product=product_b, quantity=1)

    data = auth_client.get(CART_URL).json()

    assert data["total_price"] == "45.00"  # (2×10) + (1×25)


@pytest.mark.django_db
def test_cart_total_price_is_zero_when_empty(auth_client):
    data = auth_client.get(CART_URL).json()

    assert data["total_price"] == "0.00"


# ---------------------------------------------------------------------------
# 8. Cart isolation between users
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_users_see_only_their_own_cart(user, other_user):
    cart_a = CartFactory(user=user)
    CartItemFactory(cart=cart_a)

    other_cart = CartFactory(user=other_user)
    CartItemFactory.create_batch(3, cart=other_cart)

    client_a = APIClient()
    client_a.force_authenticate(user=user)
    assert client_a.get(CART_URL).json()["item_count"] == 1

    client_b = APIClient()
    client_b.force_authenticate(user=other_user)
    assert client_b.get(CART_URL).json()["item_count"] == 3
