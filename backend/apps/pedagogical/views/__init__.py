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
from .minhas_turmas import MinhasTurmasViewSet
from .grade_professor import grade_professor_view
from .grade_turma import grade_turma_view


__all__ = [
    'PlanoAulaViewSet',
    'AulaFaltasViewSet',
    'DescritorOcorrenciaPedagogicaViewSet',
    'OcorrenciaPedagogicaViewSet',
    'OcorrenciaResponsavelCienteViewSet',
    'MinhasTurmasViewSet',
    'grade_professor_view',
    'grade_turma_view',
]
