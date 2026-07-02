from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


# ---------------------------------------------------------------------------
# Custom JWT — embeds role in both access and refresh tokens
# ---------------------------------------------------------------------------


class MawasemTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds ``role`` and ``display_name`` to every JWT payload."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role']         = user.role
        token['display_name'] = user.get_full_name() or user.username
        return token


# ---------------------------------------------------------------------------
# Consumer registration
# ---------------------------------------------------------------------------


class ConsumerRegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, label='Confirm password')

    class Meta:
        model  = User
        fields = ('username', 'email', 'password', 'password2', 'phone_number')
        extra_kwargs = {
            'email':        {'required': True},
            'phone_number': {'required': False, 'allow_null': True, 'allow_blank': True},
        }

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value

    def validate_email(self, value: str) -> str:
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data: dict):
        password = validated_data.pop('password')
        user = User(role=User.Role.CONSUMER, is_active=False, **validated_data)
        user.set_password(password)
        user.save()
        return user


# ---------------------------------------------------------------------------
# Farmer registration
# ---------------------------------------------------------------------------


class FarmerRegisterSerializer(serializers.Serializer):
    # User fields
    username     = serializers.CharField(max_length=150)
    email        = serializers.EmailField()
    password     = serializers.CharField(write_only=True, min_length=8)
    password2    = serializers.CharField(write_only=True, label='Confirm password')
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True, default='')
    # Farmer profile fields
    farm_name    = serializers.CharField(max_length=255)
    city         = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    bio          = serializers.CharField(required=False, allow_blank=True, default='')
    location_lat = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True,
    )
    location_lng = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True,
    )

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value

    def validate_email(self, value: str) -> str:
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return attrs

    @transaction.atomic
    def create(self, validated_data: dict):
        from apps.farmers.models import Farmer

        farm_name    = validated_data.pop('farm_name')
        city         = validated_data.pop('city',         '')
        bio          = validated_data.pop('bio',          '')
        location_lat = validated_data.pop('location_lat', None)
        location_lng = validated_data.pop('location_lng', None)
        phone_number = validated_data.pop('phone_number', '')
        password     = validated_data.pop('password')
        # remaining: username, email

        user = User(
            role=User.Role.FARMER,
            is_active=False,
            phone_number=phone_number or None,
            **validated_data,
        )
        user.set_password(password)
        user.save()

        Farmer.objects.create(
            user=user,
            farm_name=farm_name,
            city=city,
            bio=bio,
            phone_number=phone_number,
            location_lat=location_lat,
            location_lng=location_lng,
        )
        return user


# ---------------------------------------------------------------------------
# Email verification
# ---------------------------------------------------------------------------


class VerifyEmailSerializer(serializers.Serializer):
    uid   = serializers.CharField()
    token = serializers.CharField()

    def validate(self, attrs: dict) -> dict:
        try:
            pk   = force_str(urlsafe_base64_decode(attrs['uid']))
            user = User.objects.get(pk=pk)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({'uid': 'Invalid verification link.'})

        if user.is_email_verified:
            raise serializers.ValidationError({'detail': 'This email has already been verified.'})

        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({'token': 'Invalid or expired verification link.'})

        attrs['user'] = user
        return attrs

    def save(self) -> User:
        user: User = self.validated_data['user']
        user.is_email_verified = True
        user.is_active = True
        user.save(update_fields=['is_email_verified', 'is_active'])
        return user


# ---------------------------------------------------------------------------
# Password reset — request
# ---------------------------------------------------------------------------


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self) -> None:
        from apps.users.utils import send_password_reset_email
        try:
            user = User.objects.get(
                email__iexact=self.validated_data['email'],
                is_active=True,
            )
        except User.DoesNotExist:
            return  # silently succeed — prevents email enumeration
        send_password_reset_email(user)


# ---------------------------------------------------------------------------
# Password reset — confirm
# ---------------------------------------------------------------------------


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid          = serializers.CharField()
    token        = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs: dict) -> dict:
        try:
            pk   = force_str(urlsafe_base64_decode(attrs['uid']))
            user = User.objects.get(pk=pk, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({'uid': 'Invalid or expired reset link.'})

        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({'token': 'Invalid or expired reset link.'})

        try:
            validate_password(attrs['new_password'], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'new_password': list(exc.messages)})

        attrs['user'] = user
        return attrs

    def save(self) -> User:
        user: User = self.validated_data['user']
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user
