from __future__ import annotations

from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    ConsumerRegisterSerializer,
    FarmerRegisterSerializer,
    MawasemTokenObtainPairSerializer,
)


class MawasemTokenObtainPairView(TokenObtainPairView):
    """Login — returns JWT access + refresh tokens with role embedded."""
    serializer_class = MawasemTokenObtainPairSerializer


def _tokens_for(user) -> dict:
    refresh = MawasemTokenObtainPairSerializer.get_token(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


class ConsumerRegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/consumer/ — create a consumer account."""
    permission_classes = [AllowAny]
    serializer_class   = ConsumerRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(_tokens_for(user), status=status.HTTP_201_CREATED)


class FarmerRegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/farmer/ — create a farmer account + profile."""
    permission_classes = [AllowAny]
    serializer_class   = FarmerRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(_tokens_for(user), status=status.HTTP_201_CREATED)
