import pytest

from apps.farmers.models import Farmer
from apps.products.tests.factories import ProductFactory

FARMERS_URL = "/api/v1/farmers/"


def detail_url(pk: int) -> str:
    return f"{FARMERS_URL}{pk}/"


# ---------------------------------------------------------------------------
# 1. Authentication / visibility
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_list_farmers_is_public(api_client, farmer):
    response = api_client.get(FARMERS_URL)
    assert response.status_code == 200


@pytest.mark.django_db
def test_retrieve_farmer_is_public(api_client, farmer):
    response = api_client.get(detail_url(farmer.pk))
    assert response.status_code == 200


@pytest.mark.django_db
def test_create_farmer_requires_auth(api_client):
    response = api_client.post(FARMERS_URL, {"farm_name": "Ghost Farm"})
    assert response.status_code == 401


@pytest.mark.django_db
def test_update_farmer_requires_auth(api_client, farmer):
    response = api_client.patch(detail_url(farmer.pk), {"farm_name": "New Name"})
    assert response.status_code == 401


@pytest.mark.django_db
def test_delete_farmer_requires_auth(api_client, farmer):
    response = api_client.delete(detail_url(farmer.pk))
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# 2. Create
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_create_farmer_profile(auth_client):
    payload = {
        "farm_name": "Sunrise Organic Farm",
        "location_lat": "31.963158",
        "location_lng": "35.930359",
        "phone_number": "+962791234567",
        "bio": "Fresh produce straight from the Jordan Valley.",
    }
    response = auth_client.post(FARMERS_URL, payload)

    assert response.status_code == 201
    data = response.json()
    assert data["farm_name"] == "Sunrise Organic Farm"
    assert data["location_lat"] == "31.963158"
    assert data["is_verified"] is False


@pytest.mark.django_db
def test_create_farmer_auto_sets_user(auth_client, user):
    auth_client.post(FARMERS_URL, {"farm_name": "Auto-User Farm"})

    profile = Farmer.objects.get(farm_name="Auto-User Farm")
    assert profile.user_id == user.pk


@pytest.mark.django_db
def test_create_farmer_missing_farm_name_returns_400(auth_client):
    response = auth_client.post(FARMERS_URL, {"bio": "no name"})
    assert response.status_code == 400
    assert "farm_name" in response.json()


@pytest.mark.django_db
def test_farmer_cannot_set_is_verified(auth_client):
    """is_verified is read-only; any value in the payload is silently ignored."""
    response = auth_client.post(
        FARMERS_URL, {"farm_name": "Self-Verify Attempt", "is_verified": True}
    )
    assert response.status_code == 201
    assert response.json()["is_verified"] is False


@pytest.mark.django_db
def test_one_profile_per_user(auth_client, farmer):
    """Creating a second profile for the same user must return 400."""
    response = auth_client.post(FARMERS_URL, {"farm_name": "Duplicate Farm"})
    assert response.status_code == 400
    assert Farmer.objects.filter(user=farmer.user).count() == 1


# ---------------------------------------------------------------------------
# 3. List
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_list_returns_all_farmer_profiles(api_client, farmer, other_farmer):
    response = api_client.get(FARMERS_URL)
    assert response.status_code == 200
    assert response.json()["count"] == 2


@pytest.mark.django_db
def test_list_response_includes_username(api_client, farmer):
    response = api_client.get(FARMERS_URL)
    result = response.json()["results"][0]
    assert result["username"] == farmer.user.username


@pytest.mark.django_db
def test_list_does_not_include_products(api_client, farmer):
    """Products are only nested in the detail endpoint, not the list."""
    response = api_client.get(FARMERS_URL)
    result = response.json()["results"][0]
    assert "products" not in result


# ---------------------------------------------------------------------------
# 4. Retrieve (detail)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_retrieve_farmer_includes_products_field(api_client, farmer):
    response = api_client.get(detail_url(farmer.pk))
    assert response.status_code == 200
    assert "products" in response.json()


@pytest.mark.django_db
def test_retrieve_shows_only_active_products(api_client, farmer):
    ProductFactory(farmer=farmer, is_active=True)
    ProductFactory(farmer=farmer, is_active=False)

    response = api_client.get(detail_url(farmer.pk))

    assert response.status_code == 200
    assert len(response.json()["products"]) == 1


@pytest.mark.django_db
def test_retrieve_farmer_with_no_products(api_client, farmer):
    response = api_client.get(detail_url(farmer.pk))
    assert response.status_code == 200
    assert response.json()["products"] == []


@pytest.mark.django_db
def test_retrieve_nonexistent_farmer_returns_404(api_client):
    response = api_client.get(detail_url(99999))
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# 5. Update (owner only)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_partial_update_own_profile(auth_client, farmer):
    response = auth_client.patch(detail_url(farmer.pk), {"bio": "Updated bio."})
    assert response.status_code == 200
    farmer.refresh_from_db()
    assert farmer.bio == "Updated bio."


@pytest.mark.django_db
def test_full_update_own_profile(auth_client, farmer):
    payload = {
        "farm_name": "Renamed Farm",
        "location_lat": farmer.location_lat,
        "location_lng": farmer.location_lng,
        "phone_number": farmer.phone_number,
        "bio": "Fully updated.",
    }
    response = auth_client.put(detail_url(farmer.pk), payload)
    assert response.status_code == 200
    farmer.refresh_from_db()
    assert farmer.farm_name == "Renamed Farm"


@pytest.mark.django_db
def test_cannot_update_another_farmers_profile(auth_client, other_farmer):
    response = auth_client.patch(detail_url(other_farmer.pk), {"bio": "Hijacked"})
    assert response.status_code == 403


@pytest.mark.django_db
def test_update_cannot_override_is_verified(auth_client, farmer):
    """PATCH with is_verified=True must not verify the farmer."""
    response = auth_client.patch(detail_url(farmer.pk), {"is_verified": True})
    assert response.status_code == 200
    farmer.refresh_from_db()
    assert farmer.is_verified is False


# ---------------------------------------------------------------------------
# 6. Delete (owner only)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_delete_own_profile(auth_client, farmer):
    response = auth_client.delete(detail_url(farmer.pk))
    assert response.status_code == 204
    assert not Farmer.objects.filter(pk=farmer.pk).exists()


@pytest.mark.django_db
def test_cannot_delete_another_farmers_profile(auth_client, other_farmer):
    response = auth_client.delete(detail_url(other_farmer.pk))
    assert response.status_code == 403
    assert Farmer.objects.filter(pk=other_farmer.pk).exists()
