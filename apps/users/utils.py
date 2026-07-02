from __future__ import annotations

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

_VERIFY_SUBJECT = "Verify your Mawasem account"
_VERIFY_BODY = """\
Hello {username},

Welcome to Mawasem! Please verify your email address by clicking the link below:

{url}

This link is valid for 3 days.
If you did not create a Mawasem account, you can safely ignore this email.

— The Mawasem Team
"""

_RESET_SUBJECT = "Reset your Mawasem password"
_RESET_BODY = """\
Hello {username},

We received a request to reset your Mawasem account password.
Click the link below to set a new password:

{url}

This link is valid for 3 days.
If you did not request a password reset, you can safely ignore this email.

— The Mawasem Team
"""


def _make_uid_token(user) -> tuple[str, str]:
    uid   = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return uid, token


def send_verification_email(user) -> None:
    uid, token = _make_uid_token(user)
    url = f"{settings.FRONTEND_URL}/verify-email?uid={uid}&token={token}"
    send_mail(
        subject=_VERIFY_SUBJECT,
        message=_VERIFY_BODY.format(username=user.username, url=url),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def send_password_reset_email(user) -> None:
    uid, token = _make_uid_token(user)
    url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
    send_mail(
        subject=_RESET_SUBJECT,
        message=_RESET_BODY.format(username=user.username, url=url),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )
