"""
URLs para o App Pedagogical
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlanoAulaViewSet, AulaViewSet, FaltasViewSet,
    TipoOcorrenciaViewSet, OcorrenciaPedagogicaViewSet,
    OcorrenciaResponsavelCienteViewSet, NotaBimestralViewSet,
    RecuperacaoViewSet, NotificacaoRecuperacaoViewSet
)

router = DefaultRouter()
router.register('planos-aula', PlanoAulaViewSet)
router.register('aulas', AulaViewSet)
router.register('faltas', FaltasViewSet)
router.register('tipos-ocorrencia', TipoOcorrenciaViewSet)
router.register('ocorrencias', OcorrenciaPedagogicaViewSet)
router.register('ciencias-ocorrencias', OcorrenciaResponsavelCienteViewSet)
router.register('notas', NotaBimestralViewSet)
router.register('recuperacoes', RecuperacaoViewSet)
router.register('notificacoes-recuperacao', NotificacaoRecuperacaoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

