"""
URLs para o App Users
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, PasswordResetRequestView

router = DefaultRouter()
router.register('', UserViewSet, basename='users')

urlpatterns = [
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('', include(router.urls)),
]

