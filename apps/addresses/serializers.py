from __future__ import annotations

from rest_framework import serializers

from .models import Address


class AddressSerializer(serializers.ModelSerializer):
    """CRUD serializer for a consumer's saved delivery addresses.

    ``user`` is never client-supplied — it's injected by
    ``AddressViewSet.perform_create`` from ``request.user``.

    ``is_default`` is a plain writable boolean. Uniqueness ("only one default
    per user") is enforced in ``Address.save()``, not here, so the invariant
    also holds for the admin panel and checkout's ``save_address=True`` path.
    """

    label_display = serializers.CharField(source="get_label_display", read_only=True)

    class Meta:
        model = Address
        fields = (
            "id",
            "label",
            "label_display",
            "custom_label",
            "full_address",
            "extra_details",
            "city",
            "latitude",
            "longitude",
            "is_default",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_latitude(self, value):
        if not (-90 <= value <= 90):
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if not (-180 <= value <= 180):
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value

    def validate(self, attrs: dict) -> dict:
        label = attrs.get("label", getattr(self.instance, "label", None))
        custom_label = attrs.get("custom_label", getattr(self.instance, "custom_label", ""))
        if label == Address.Label.OTHER and not custom_label:
            raise serializers.ValidationError(
                {"custom_label": "Please provide a name for this custom address."}
            )
        return attrs
