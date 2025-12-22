"""
URLs para o App Permanent
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DadosPermanenteEstudanteViewSet, DadosPermanenteResponsavelViewSet,
    HistoricoEscolarViewSet, HistoricoEscolarAnoLetivoViewSet,
    HistoricoEscolarNotasViewSet, RegistroProntuarioViewSet
)

router = DefaultRouter()
router.register('estudantes', DadosPermanenteEstudanteViewSet)
router.register('responsaveis', DadosPermanenteResponsavelViewSet)
router.register('historicos', HistoricoEscolarViewSet)
router.register('historicos-anos', HistoricoEscolarAnoLetivoViewSet)
router.register('historicos-notas', HistoricoEscolarNotasViewSet)
router.register('registros-prontuario', RegistroProntuarioViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

