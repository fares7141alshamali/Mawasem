from django.urls import path

from .views import ConsumerRegisterView, FarmerRegisterView, MawasemTokenObtainPairView

urlpatterns = [
    path('auth/token/',             MawasemTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/register/consumer/', ConsumerRegisterView.as_view(),       name='consumer-register'),
    path('auth/register/farmer/',   FarmerRegisterView.as_view(),         name='farmer-register'),
]
