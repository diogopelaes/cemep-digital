"""
Views para o App Pedagogical

Re-exporta todos os ViewSets para manter compatibilidade com imports existentes.
"""
from .plano_aula import PlanoAulaViewSet
from .aula_faltas import AulaFaltasViewSet
from .ocorrencia import (
    DescritorOcorrenciaPedagogicaViewSet,
    OcorrenciaPedagogicaViewSet,
    OcorrenciaResponsavelCienteViewSet
)


__all__ = [
    'PlanoAulaViewSet',
    'AulaFaltasViewSet',
    'DescritorOcorrenciaPedagogicaViewSet',
    'OcorrenciaPedagogicaViewSet',
    'OcorrenciaResponsavelCienteViewSet',
]
