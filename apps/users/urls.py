from django.urls import path

from .views import (
    ConsumerRegisterView,
    FarmerRegisterView,
    MawasemTokenObtainPairView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    VerifyEmailView,
)

urlpatterns = [
    path('auth/token/',                   MawasemTokenObtainPairView.as_view(),  name='token_obtain_pair'),
    path('auth/register/consumer/',       ConsumerRegisterView.as_view(),        name='consumer-register'),
    path('auth/register/farmer/',         FarmerRegisterView.as_view(),          name='farmer-register'),
    path('auth/verify-email/',            VerifyEmailView.as_view(),             name='verify-email'),
    path('auth/password-reset/',          PasswordResetRequestView.as_view(),    name='password-reset'),
    path('auth/password-reset/confirm/',  PasswordResetConfirmView.as_view(),    name='password-reset-confirm'),
]
