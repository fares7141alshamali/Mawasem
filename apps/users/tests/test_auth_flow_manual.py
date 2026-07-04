import re

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient

User = get_user_model()


def extract_uid_token(email_body):
    m = re.search(r"uid=([^&\s]+)&token=([^&\s]+)", email_body)
    assert m, f"no verification link found in email body:\n{email_body}"
    return m.group(1), m.group(2)


@pytest.mark.django_db
def test_consumer_register_login_verify_flow():
    client = APIClient()

    # 1. Register
    resp = client.post(
        "/api/v1/auth/register/consumer/",
        {
            "username": "buyer1",
            "email": "buyer1@example.com",
            "password": "StrongPass123",
            "password2": "StrongPass123",
            "phone_number": "+962791234567",
        },
        format="json",
    )
    assert resp.status_code == 201, resp.data

    user = User.objects.get(username="buyer1")
    assert user.is_active is False
    assert user.is_email_verified is False
    assert user.role == User.Role.CONSUMER

    # A verification email should have been "sent" (console backend captures it)
    assert len(mail.outbox) == 1
    assert "verify" in mail.outbox[0].subject.lower()

    # 2. Login BEFORE verifying should fail (account inactive)
    resp = client.post(
        "/api/v1/auth/token/",
        {"username": "buyer1", "password": "StrongPass123"},
        format="json",
    )
    assert resp.status_code == 401, resp.data

    # 3. Verify email using the uid/token from the email
    uid, token = extract_uid_token(mail.outbox[0].body)
    resp = client.post(
        "/api/v1/auth/verify-email/",
        {"uid": uid, "token": token},
        format="json",
    )
    assert resp.status_code == 200, resp.data

    user.refresh_from_db()
    assert user.is_active is True
    assert user.is_email_verified is True

    # 4. Re-using the same verification link should now be rejected
    resp = client.post(
        "/api/v1/auth/verify-email/",
        {"uid": uid, "token": token},
        format="json",
    )
    assert resp.status_code == 400, resp.data

    # 5. Login AFTER verifying should succeed and embed role in the JWT
    resp = client.post(
        "/api/v1/auth/token/",
        {"username": "buyer1", "password": "StrongPass123"},
        format="json",
    )
    assert resp.status_code == 200, resp.data
    assert "access" in resp.data and "refresh" in resp.data

    import base64
    import json

    payload_b64 = resp.data["access"].split(".")[1]
    padded = payload_b64 + "=" * (-len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded))
    assert payload["role"] == "consumer"


@pytest.mark.django_db
def test_farmer_register_creates_user_and_profile():
    client = APIClient()
    resp = client.post(
        "/api/v1/auth/register/farmer/",
        {
            "username": "farmerjoe",
            "email": "farmerjoe@example.com",
            "password": "StrongPass123",
            "password2": "StrongPass123",
            "farm_name": "Joe's Farm",
            "city": "Amman",
        },
        format="json",
    )
    assert resp.status_code == 201, resp.data

    user = User.objects.get(username="farmerjoe")
    assert user.role == User.Role.FARMER
    assert user.is_active is False
    assert hasattr(user, "farmer_profile")
    assert user.farmer_profile.farm_name == "Joe's Farm"


@pytest.mark.django_db
def test_duplicate_username_rejected():
    client = APIClient()
    payload = {
        "username": "dupe",
        "email": "dupe1@example.com",
        "password": "StrongPass123",
        "password2": "StrongPass123",
    }
    resp = client.post("/api/v1/auth/register/consumer/", payload, format="json")
    assert resp.status_code == 201, resp.data

    payload2 = dict(payload, email="dupe2@example.com")
    resp = client.post("/api/v1/auth/register/consumer/", payload2, format="json")
    assert resp.status_code == 400, resp.data
    assert "username" in resp.data


@pytest.mark.django_db
def test_password_mismatch_rejected():
    client = APIClient()
    resp = client.post(
        "/api/v1/auth/register/consumer/",
        {
            "username": "mismatch1",
            "email": "mismatch1@example.com",
            "password": "StrongPass123",
            "password2": "DifferentPass123",
        },
        format="json",
    )
    assert resp.status_code == 400, resp.data
    assert "password2" in resp.data
