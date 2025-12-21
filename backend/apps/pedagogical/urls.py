"""
URLs para o App Pedagogical
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlanoAulaViewSet, AulaViewSet, FaltasViewSet, DescritorOcorrenciaPedagogicaViewSet,
    OcorrenciaPedagogicaViewSet, OcorrenciaResponsavelCienteViewSet,
    NotaBimestralViewSet, NotificacaoRecuperacaoViewSet
)

router = DefaultRouter()
router.register('planos-aula', PlanoAulaViewSet)
router.register('aulas', AulaViewSet)
router.register('faltas', FaltasViewSet)
router.register('descritores-ocorrencia', DescritorOcorrenciaPedagogicaViewSet)
router.register('ocorrencias', OcorrenciaPedagogicaViewSet)
router.register('ciencias-ocorrencia', OcorrenciaResponsavelCienteViewSet)
router.register('notas', NotaBimestralViewSet)
router.register('notificacoes-recuperacao', NotificacaoRecuperacaoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
