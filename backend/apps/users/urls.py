"""
URLs para o App Users
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, LoginView, LogoutView

router = DefaultRouter()
router.register('', UserViewSet, basename='users')

urlpatterns = [
    # Login/Logout Híbrido (Sessão + JWT)
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    # ViewSets
    path('', include(router.urls)),
]
