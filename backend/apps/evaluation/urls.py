from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AvaliacaoViewSet

router = DefaultRouter()
router.register('avaliacoes', AvaliacaoViewSet, basename='avaliacoes')

app_name = 'evaluation'

urlpatterns = [
    path('', include(router.urls)),
]
