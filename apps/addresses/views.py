from __future__ import annotations

from django.db.models import QuerySet
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Address
from .serializers import AddressSerializer


class AddressViewSet(viewsets.ModelViewSet):
    """Consumer's saved delivery address book.

    GET    /api/v1/addresses/                 — list own addresses
    POST   /api/v1/addresses/                 — create a new address
    GET    /api/v1/addresses/{id}/             — retrieve
    PATCH  /api/v1/addresses/{id}/             — partial update
    DELETE /api/v1/addresses/{id}/             — delete
    POST   /api/v1/addresses/{id}/set-default/ — mark as the default

    Security: queryset is scoped to ``request.user`` so a consumer can never
    see, edit, or delete another user's address — cross-user access 404s via
    the normal DRF ``get_object()`` -> ``get_queryset()`` lookup path.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = AddressSerializer
    pagination_class = None

    def get_queryset(self) -> QuerySet[Address]:
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer: AddressSerializer) -> None:
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance: Address) -> None:
        """Promote the newest remaining address to default if the deleted
        one was the default, so a user is never left with zero defaults.
        """
        was_default = instance.is_default
        user = instance.user
        instance.delete()
        if was_default:
            fallback = Address.objects.filter(user=user).order_by("-created_at").first()
            if fallback is not None:
                fallback.is_default = True
                fallback.save(update_fields=["is_default"])

    @action(detail=True, methods=["post"], url_path="set-default")
    def set_default(self, request: Request, pk=None) -> Response:
        """Relies on ``Address.save()`` to atomically unset every sibling's
        ``is_default`` — no duplicated logic here.
        """
        address = self.get_object()
        address.is_default = True
        address.save(update_fields=["is_default"])
        return Response(
            AddressSerializer(address, context=self.get_serializer_context()).data,
            status=status.HTTP_200_OK,
        )
