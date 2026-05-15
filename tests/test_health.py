import pytest


@pytest.mark.django_db
def test_health_check_status_and_body(client):
    response = client.get("/api/v1/health/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}


@pytest.mark.django_db
def test_health_check_requires_no_auth(client):
    """Endpoint must return 200 for unauthenticated requests (AllowAny)."""
    response = client.get("/api/v1/health/")
    assert response.status_code == 200
