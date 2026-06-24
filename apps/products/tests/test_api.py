import pytest

from apps.products.tests.factories import CategoryFactory, ProductFactory, ProductImageFactory

LIST_URL = "/api/v1/products/"
CATEGORIES_URL = "/api/v1/categories/"


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


# ---------------------------------------------------------------------------
# 6. Categories: only top-level active categories are returned
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_categories_returns_only_top_level(client):
    top = CategoryFactory.create(is_active=True, parent=None)
    child = CategoryFactory.create(is_active=True, parent=top)
    inactive_top = CategoryFactory.create(is_active=False, parent=None)

    response = client.get(CATEGORIES_URL)

    assert response.status_code == 200
    data = response.json()
    slugs = [c["slug"] for c in data]
    assert top.slug in slugs
    assert inactive_top.slug not in slugs
    assert child.slug not in slugs


# ---------------------------------------------------------------------------
# 7. product_count excludes inactive products
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_product_count_excludes_inactive_products(client):
    category = CategoryFactory.create()
    ProductFactory.create(category=category, is_active=True)
    ProductFactory.create(category=category, is_active=True)
    ProductFactory.create(category=category, is_active=False)

    response = client.get(CATEGORIES_URL)

    assert response.status_code == 200
    cat_data = next(c for c in response.json() if c["slug"] == category.slug)
    assert cat_data["product_count"] == 2


# ---------------------------------------------------------------------------
# 8. Category list view uses ≤ 2 queries
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_category_query_count_is_bounded(client, django_assert_num_queries):
    top = CategoryFactory.create_batch(3)
    for cat in top:
        CategoryFactory.create(parent=cat)

    with django_assert_num_queries(2):
        response = client.get(CATEGORIES_URL)

    assert response.status_code == 200


# ---------------------------------------------------------------------------
# 9. Price range filtering
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_filter_by_price_range(client):
    ProductFactory.create(selling_price="5.00")
    ProductFactory.create(selling_price="15.00")
    ProductFactory.create(selling_price="25.00")

    response = client.get(LIST_URL, {"min_price": "10", "max_price": "20"})

    assert response.status_code == 200
    prices = [p["selling_price"] for p in response.json()["results"]]
    assert len(prices) == 1
    assert prices[0] == "15.00"


# ---------------------------------------------------------------------------
# 10. Category filter — top-level slug fans out to include child products
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_category_filter_top_level_includes_children(client):
    parent = CategoryFactory.create()
    child = CategoryFactory.create(parent=parent)
    unrelated = CategoryFactory.create()

    in_parent = ProductFactory.create(category=parent)
    in_child = ProductFactory.create(category=child)
    in_other = ProductFactory.create(category=unrelated)

    response = client.get(LIST_URL, {"category": parent.slug})

    assert response.status_code == 200
    slugs = {p["slug"] for p in response.json()["results"]}
    assert in_parent.slug in slugs
    assert in_child.slug in slugs
    assert in_other.slug not in slugs


# ---------------------------------------------------------------------------
# 11. Search matches name_en and name_ar
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_search_matches_en_and_ar_names(client):
    ProductFactory.create(name_en="Tomato", name_ar="طماطم", slug="tomato")
    ProductFactory.create(name_en="Cucumber", name_ar="خيار", slug="cucumber")

    en_response = client.get(LIST_URL, {"search": "Tomato"})
    assert len(en_response.json()["results"]) == 1
    assert en_response.json()["results"][0]["slug"] == "tomato"

    ar_response = client.get(LIST_URL, {"search": "خيار"})
    assert len(ar_response.json()["results"]) == 1
    assert ar_response.json()["results"][0]["slug"] == "cucumber"


# ---------------------------------------------------------------------------
# 12. Ordering by selling_price ascending
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_ordering_by_selling_price_ascending(client):
    ProductFactory.create(selling_price="30.00")
    ProductFactory.create(selling_price="10.00")
    ProductFactory.create(selling_price="20.00")

    response = client.get(LIST_URL, {"ordering": "selling_price"})

    assert response.status_code == 200
    prices = [p["selling_price"] for p in response.json()["results"]]
    assert prices == sorted(prices)
