from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.evaluation.views import (
    ConfiguracaoAvaliacaoGeralViewSet,
    ConfiguracaoAvaliacaoProfessorViewSet,
    AvaliacaoViewSet,
    NotaAvaliacaoViewSet,
    NotaBimestralViewSet,
)

router = DefaultRouter()
router.register(r'config-geral', ConfiguracaoAvaliacaoGeralViewSet, basename='config-geral')
router.register(r'config-professor', ConfiguracaoAvaliacaoProfessorViewSet, basename='config-professor')
router.register(r'avaliacoes', AvaliacaoViewSet, basename='avaliacao')
router.register(r'notas-avaliacao', NotaAvaliacaoViewSet, basename='nota-avaliacao')
router.register(r'notas-bimestrais', NotaBimestralViewSet, basename='nota-bimestral')

app_name = 'evaluation'

urlpatterns = [
    path('', include(router.urls)),
]
