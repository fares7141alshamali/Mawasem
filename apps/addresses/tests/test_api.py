import pytest

from apps.addresses.models import Address
from apps.addresses.tests.factories import AddressFactory

ADDRESSES_URL = "/api/v1/addresses/"


def detail_url(pk):
    return f"{ADDRESSES_URL}{pk}/"


def set_default_url(pk):
    return f"{ADDRESSES_URL}{pk}/set-default/"


# ---------------------------------------------------------------------------
# 1. Auth guard
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_list_requires_authentication(api_client):
    assert api_client.get(ADDRESSES_URL).status_code == 401


@pytest.mark.django_db
def test_create_requires_authentication(api_client):
    assert api_client.post(ADDRESSES_URL, {}).status_code == 401


# ---------------------------------------------------------------------------
# 2. CRUD happy path
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_create_address_auto_defaults_first_address(auth_client, user):
    response = auth_client.post(
        ADDRESSES_URL,
        {
            "label": "home",
            "full_address": "1 Test Street, Amman",
            "latitude": "31.963158",
            "longitude": "35.930359",
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    assert response.data["is_default"] is True


@pytest.mark.django_db
def test_list_returns_only_own_addresses(auth_client, user, other_user):
    AddressFactory(user=user)
    AddressFactory(user=other_user)

    response = auth_client.get(ADDRESSES_URL)

    assert response.status_code == 200
    assert len(response.data) == 1


@pytest.mark.django_db
def test_update_and_delete_own_address(auth_client, user):
    address = AddressFactory(user=user)

    response = auth_client.patch(detail_url(address.id), {"city": "Zarqa"}, format="json")
    assert response.status_code == 200
    assert response.data["city"] == "Zarqa"

    response = auth_client.delete(detail_url(address.id))
    assert response.status_code == 204
    assert not Address.objects.filter(pk=address.id).exists()


# ---------------------------------------------------------------------------
# 3. Cross-user isolation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_cannot_view_other_users_address(auth_client, other_user):
    other_address = AddressFactory(user=other_user)
    assert auth_client.get(detail_url(other_address.id)).status_code == 404


@pytest.mark.django_db
def test_cannot_update_other_users_address(auth_client, other_user):
    other_address = AddressFactory(user=other_user)
    response = auth_client.patch(detail_url(other_address.id), {"city": "Hacked"}, format="json")
    assert response.status_code == 404


@pytest.mark.django_db
def test_cannot_delete_other_users_address(auth_client, other_user):
    other_address = AddressFactory(user=other_user)
    assert auth_client.delete(detail_url(other_address.id)).status_code == 404
    assert Address.objects.filter(pk=other_address.id).exists()


# ---------------------------------------------------------------------------
# 4. Default-address uniqueness
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_creating_second_default_unsets_first(auth_client, user):
    first = AddressFactory(user=user)
    assert first.is_default is True  # auto-promoted as the first address

    response = auth_client.post(
        ADDRESSES_URL,
        {
            "label": "work",
            "full_address": "2 Test Street, Amman",
            "latitude": "31.9",
            "longitude": "35.9",
            "is_default": True,
        },
        format="json",
    )
    assert response.status_code == 201

    first.refresh_from_db()
    assert first.is_default is False


@pytest.mark.django_db
def test_set_default_action_flips_default(auth_client, user):
    first = AddressFactory(user=user)
    second = AddressFactory(user=user, is_default=False)

    response = auth_client.post(set_default_url(second.id))

    assert response.status_code == 200
    assert response.data["is_default"] is True
    first.refresh_from_db()
    assert first.is_default is False


@pytest.mark.django_db
def test_deleting_default_promotes_newest_remaining(auth_client, user):
    first = AddressFactory(user=user)
    second = AddressFactory(user=user, is_default=False)

    auth_client.delete(detail_url(first.id))

    second.refresh_from_db()
    assert second.is_default is True


@pytest.mark.django_db
def test_deleting_last_address_leaves_none(auth_client, user):
    only = AddressFactory(user=user)
    response = auth_client.delete(detail_url(only.id))
    assert response.status_code == 204
    assert Address.objects.filter(user=user).count() == 0


# ---------------------------------------------------------------------------
# 5. Validation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_other_label_requires_custom_label(auth_client):
    response = auth_client.post(
        ADDRESSES_URL,
        {
            "label": "other",
            "full_address": "3 Test Street, Amman",
            "latitude": "31.9",
            "longitude": "35.9",
        },
        format="json",
    )
    assert response.status_code == 400
    assert "custom_label" in response.data


@pytest.mark.django_db
def test_latitude_out_of_range_rejected(auth_client):
    response = auth_client.post(
        ADDRESSES_URL,
        {
            "label": "home",
            "full_address": "4 Test Street, Amman",
            "latitude": "999.0",
            "longitude": "35.9",
        },
        format="json",
    )
    assert response.status_code == 400
    assert "latitude" in response.data
