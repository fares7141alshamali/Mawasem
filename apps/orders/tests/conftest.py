import pytest
from rest_framework.test import APIClient

from apps.carts.tests.factories import UserFactory


@pytest.fixture
def api_client() -> APIClient:
    """Unauthenticated DRF test client."""
    return APIClient()


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def other_user(db):
    return UserFactory()


@pytest.fixture
def auth_client(user) -> APIClient:
    """DRF test client authenticated as ``user``."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client
