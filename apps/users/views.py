from __future__ import annotations

from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    ConsumerRegisterSerializer,
    FarmerRegisterSerializer,
    MawasemTokenObtainPairSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    VerifyEmailSerializer,
)
from .utils import send_verification_email


class MawasemTokenObtainPairView(TokenObtainPairView):
    """Login — returns JWT access + refresh tokens with role embedded."""
    serializer_class = MawasemTokenObtainPairSerializer


class ConsumerRegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/consumer/ — create a consumer account.

    The account is inactive until the user clicks the verification link.
    Returns a message prompting them to check email instead of tokens.
    """
    permission_classes = [AllowAny]
    serializer_class   = ConsumerRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_verification_email(user)
        return Response(
            {"detail": "Registration successful. Please check your email to verify your account."},
            status=status.HTTP_201_CREATED,
        )


class FarmerRegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/farmer/ — create a farmer account + profile.

    The account is inactive until the user clicks the verification link.
    Returns a message prompting them to check email instead of tokens.
    """
    permission_classes = [AllowAny]
    serializer_class   = FarmerRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_verification_email(user)
        return Response(
            {"detail": "Registration successful. Please check your email to verify your account."},
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(generics.GenericAPIView):
    """POST /api/v1/auth/verify-email/ — activate account via uid + token."""
    permission_classes = [AllowAny]
    serializer_class   = VerifyEmailSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Email verified successfully. You can now log in."})


class PasswordResetRequestView(generics.GenericAPIView):
    """POST /api/v1/auth/password-reset/ — send a password-reset email.

    Always returns 200 regardless of whether the email is registered, to
    prevent account enumeration attacks.
    """
    permission_classes = [AllowAny]
    serializer_class   = PasswordResetRequestSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "If an account with that email exists, a reset link has been sent."}
        )


class PasswordResetConfirmView(generics.GenericAPIView):
    """POST /api/v1/auth/password-reset/confirm/ — set a new password."""
    permission_classes = [AllowAny]
    serializer_class   = PasswordResetConfirmSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password reset successfully. You can now log in."})
