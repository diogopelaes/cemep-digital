from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.evaluation.views import (
    ConfiguracaoAvaliacaoGeralViewSet,
    ConfiguracaoAvaliacaoProfessorViewSet,
)

router = DefaultRouter()
router.register(r'config-geral', ConfiguracaoAvaliacaoGeralViewSet, basename='config-geral')
router.register(r'config-professor', ConfiguracaoAvaliacaoProfessorViewSet, basename='config-professor')

app_name = 'evaluation'

urlpatterns = [
    path('', include(router.urls)),
]
