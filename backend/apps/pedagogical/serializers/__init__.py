"""
Serializers para o App Pedagogical

Re-exporta todos os Serializers para manter compatibilidade com imports existentes.
"""
from .plano_aula import PlanoAulaSerializer
from .aula_faltas import (
    AulaFaltasSerializer,
    AulaFaltasListSerializer,
    ContextoAulaSerializer,
    EstudanteChamadaSerializer,
    AtualizarFaltasSerializer
)
from .ocorrencia import (
    DescritorOcorrenciaPedagogicaSerializer,
    OcorrenciaPedagogicaSerializer,
    OcorrenciaResponsavelCienteSerializer
)
from .nota import NotaBimestralSerializer, NotificacaoRecuperacaoSerializer


__all__ = [
    'PlanoAulaSerializer',
    'AulaFaltasSerializer',
    'AulaFaltasListSerializer',
    'ContextoAulaSerializer',
    'EstudanteChamadaSerializer',
    'AtualizarFaltasSerializer',
    'DescritorOcorrenciaPedagogicaSerializer',
    'OcorrenciaPedagogicaSerializer',
    'OcorrenciaResponsavelCienteSerializer',
    'NotaBimestralSerializer',
    'NotificacaoRecuperacaoSerializer',
]
