import pytest
from rest_framework.test import APIClient

from apps.carts.tests.factories import UserFactory

from .factories import FarmerFactory


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def other_user(db):
    return UserFactory()


@pytest.fixture
def auth_client(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def other_auth_client(other_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=other_user)
    return client


@pytest.fixture
def farmer(db, user):
    return FarmerFactory(user=user)


@pytest.fixture
def other_farmer(db, other_user):
    return FarmerFactory(user=other_user)
