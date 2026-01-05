"""
Serializers para o App Pedagogical

Re-exporta todos os Serializers para manter compatibilidade com imports existentes.
"""
from .plano_aula import PlanoAulaSerializer
from .aula import AulaSerializer
from .faltas import FaltasSerializer, FaltasRegistroSerializer
from .ocorrencia import (
    DescritorOcorrenciaPedagogicaSerializer,
    OcorrenciaPedagogicaSerializer,
    OcorrenciaResponsavelCienteSerializer
)
from .nota import NotaBimestralSerializer, NotificacaoRecuperacaoSerializer


__all__ = [
    'PlanoAulaSerializer',
    'AulaSerializer',
    'FaltasSerializer',
    'FaltasRegistroSerializer',
    'DescritorOcorrenciaPedagogicaSerializer',
    'OcorrenciaPedagogicaSerializer',
    'OcorrenciaResponsavelCienteSerializer',
    'NotaBimestralSerializer',
    'NotificacaoRecuperacaoSerializer',
]
