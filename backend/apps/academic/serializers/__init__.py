"""
Serializers para o App Academic

Re-exporta todos os Serializers para manter compatibilidade com imports existentes.
"""
from .estudante import EstudanteSerializer, EstudanteCreateSerializer
from .responsavel import (
    ResponsavelSerializer, 
    ResponsavelCreateSerializer,
    ResponsavelSummarySerializer,
    ResponsavelEstudanteSerializer
)
from .matricula import MatriculaCEMEPSerializer, MatriculaTurmaSerializer
from .atestado import AtestadoSerializer


__all__ = [
    'EstudanteSerializer',
    'EstudanteCreateSerializer',
    'ResponsavelSerializer',
    'ResponsavelCreateSerializer',
    'ResponsavelSummarySerializer',
    'ResponsavelEstudanteSerializer',
    'MatriculaCEMEPSerializer',
    'MatriculaTurmaSerializer',
    'AtestadoSerializer',
]
