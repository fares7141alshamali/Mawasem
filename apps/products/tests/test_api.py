import pytest

from apps.products.tests.factories import ProductFactory, ProductImageFactory

LIST_URL = "/api/v1/products/"


def detail_url(slug):
    return f"/api/v1/products/{slug}/"


# ---------------------------------------------------------------------------
# 1. List returns only active products
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_list_returns_only_active_products(client):
    active = ProductFactory.create(is_active=True)
    ProductFactory.create(is_active=False)  # must be excluded

    response = client.get(LIST_URL)

    assert response.status_code == 200
    slugs = [p["slug"] for p in response.json()["results"]]
    assert active.slug in slugs
    assert len(slugs) == 1


# ---------------------------------------------------------------------------
# 2. farm_cost never appears in the response body
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_farm_cost_never_in_response(client):
    ProductFactory.create(farm_cost="3.50", selling_price="10.00")

    list_response = client.get(LIST_URL)
    assert "farm_cost" not in list_response.content.decode()

    product = ProductFactory.create()
    detail_response = client.get(detail_url(product.slug))
    assert "farm_cost" not in detail_response.content.decode()


# ---------------------------------------------------------------------------
# 3. List view uses ≤ 3 queries regardless of page size
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_list_uses_3_queries_or_fewer(client, django_assert_num_queries):
    ProductFactory.create_batch(5)

    with django_assert_num_queries(3):
        response = client.get(LIST_URL)

    assert response.status_code == 200


# ---------------------------------------------------------------------------
# 4. Inactive product returns 404 on detail endpoint
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_detail_returns_404_for_inactive_product(client):
    inactive = ProductFactory.create(is_active=False)

    response = client.get(detail_url(inactive.slug))

    assert response.status_code == 404
    assert response.json() == {"detail": "Not found."}


# ---------------------------------------------------------------------------
# 5. Detail response includes image gallery
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_detail_includes_image_gallery(client):
    product = ProductFactory.create()
    ProductImageFactory.create(product=product, sort_order=1)
    ProductImageFactory.create(product=product, sort_order=2)

    response = client.get(detail_url(product.slug))

    assert response.status_code == 200
    data = response.json()
    assert "images" in data
    assert len(data["images"]) == 2
    assert data["images"][0]["sort_order"] == 1
    assert data["images"][1]["sort_order"] == 2
