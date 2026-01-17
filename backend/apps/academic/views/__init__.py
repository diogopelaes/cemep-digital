"""
Views para o App Academic

Re-exporta todos os ViewSets para manter compatibilidade com imports existentes.
"""
from .estudante import EstudanteViewSet
from .responsavel import ResponsavelViewSet
from .matricula import MatriculaCEMEPViewSet, MatriculaTurmaViewSet
from .atestado import AtestadoViewSet
from .carometro import CarometroViewSet



__all__ = [
    'EstudanteViewSet',
    'ResponsavelViewSet',
    'MatriculaCEMEPViewSet',
    'MatriculaTurmaViewSet',
    'AtestadoViewSet',
    'CarometroViewSet',
]

