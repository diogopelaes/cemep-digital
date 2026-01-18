"""
Views para o App Pedagogical

Re-exporta todos os ViewSets para manter compatibilidade com imports existentes.
"""
from .plano_aula import PlanoAulaViewSet
from .aula_faltas import AulaFaltasViewSet
from .minhas_turmas import MinhasTurmasViewSet
from .grade_professor import grade_professor_view
from .grade_turma import grade_turma_view
from .descritor_ocorrencia import (
    DescritorOcorrenciaPedagogicaViewSet,
    DescritorOcorrenciaPedagogicaAnoLetivoViewSet
)


__all__ = [
    'PlanoAulaViewSet',
    'AulaFaltasViewSet',
    'MinhasTurmasViewSet',
    'grade_professor_view',
    'grade_turma_view',
    'DescritorOcorrenciaPedagogicaViewSet',
    'DescritorOcorrenciaPedagogicaAnoLetivoViewSet',
]
