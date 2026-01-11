"""
Views do Professor - App Core
"""
from .minhas_turmas import MinhasTurmasViewSet
from .grade_professor import grade_professor_view

__all__ = [
    'MinhasTurmasViewSet',
    'grade_professor_view',
]
