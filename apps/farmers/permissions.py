from __future__ import annotations

from rest_framework.permissions import BasePermission


class IsFarmerUser(BasePermission):
    """Permit only authenticated users who have an active Farmer profile.

    Returns HTTP 403 (not 401) for logged-in users without a profile, so the
    frontend knows to redirect to home rather than to the login page.
    """

    message = "A farmer profile is required to access this resource."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'farmer'
        )
