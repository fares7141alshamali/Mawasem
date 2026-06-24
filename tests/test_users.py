import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_create_consumer_with_phone_and_address():
    user = User.objects.create_user(
        username="consumer1",
        password="testpass123",
        phone_number="+962791234567",
        address="Amman, Jordan",
    )
    assert user.is_consumer is True
    assert user.phone_number == "+962791234567"
    assert user.address == "Amman, Jordan"
    assert user.is_staff is False
    assert user.is_superuser is False


@pytest.mark.django_db
def test_consumer_is_true_by_default():
    user = User.objects.create_user(username="consumer2", password="testpass123")
    assert user.is_consumer is True


@pytest.mark.django_db
def test_create_superuser():
    admin = User.objects.create_superuser(
        username="admintest",
        password="adminpass123",
        email="admin@mawasem.com",
    )
    assert admin.is_superuser is True
    assert admin.is_staff is True
    assert admin.is_consumer is True  # inherits default; admin sets is_consumer manually
