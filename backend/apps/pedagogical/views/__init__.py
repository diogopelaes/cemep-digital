"""
Views para o App Pedagogical

Re-exporta todos os ViewSets para manter compatibilidade com imports existentes.
"""
from .plano_aula import PlanoAulaViewSet
from .aula import AulaViewSet
from .faltas import FaltasViewSet
from .ocorrencia import (
    DescritorOcorrenciaPedagogicaViewSet,
    OcorrenciaPedagogicaViewSet,
    OcorrenciaResponsavelCienteViewSet
)
from .nota import NotaBimestralViewSet
from .notificacao import NotificacaoRecuperacaoViewSet


__all__ = [
    'PlanoAulaViewSet',
    'AulaViewSet',
    'FaltasViewSet',
    'DescritorOcorrenciaPedagogicaViewSet',
    'OcorrenciaPedagogicaViewSet',
    'OcorrenciaResponsavelCienteViewSet',
    'NotaBimestralViewSet',
    'NotificacaoRecuperacaoViewSet',
]
