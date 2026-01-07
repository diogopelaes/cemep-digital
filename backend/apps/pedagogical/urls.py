"""
URLs para o App Pedagogical
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlanoAulaViewSet, AulaFaltasViewSet, DescritorOcorrenciaPedagogicaViewSet,
    OcorrenciaPedagogicaViewSet, OcorrenciaResponsavelCienteViewSet,
    NotaBimestralViewSet, NotificacaoRecuperacaoViewSet
)

router = DefaultRouter()
router.register('planos-aula', PlanoAulaViewSet)
router.register('aulas-faltas', AulaFaltasViewSet, basename='aulas-faltas')
router.register('descritores-ocorrencia', DescritorOcorrenciaPedagogicaViewSet)
router.register('ocorrencias', OcorrenciaPedagogicaViewSet)
router.register('ciencias-ocorrencia', OcorrenciaResponsavelCienteViewSet)
router.register('notas', NotaBimestralViewSet)
router.register('notificacoes-recuperacao', NotificacaoRecuperacaoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
