from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AvaliacaoViewSet, DigitarNotaViewSet

router = DefaultRouter()
router.register('avaliacoes', AvaliacaoViewSet, basename='avaliacoes')
router.register('digitar-notas', DigitarNotaViewSet, basename='digitar-notas')

app_name = 'evaluation'

urlpatterns = [
    path('', include(router.urls)),
]
