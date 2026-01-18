"""
Serializers para o App Pedagogical

Re-exporta todos os Serializers para manter compatibilidade com imports existentes.
"""
from .plano_aula import PlanoAulaSerializer
from .aula_faltas import (
    AulaFaltasSerializer,
    AulaFaltasListSerializer,
    ContextoAulaSerializer,
    AtualizarFaltasSerializer
)
from .minhas_turmas import (
    MinhasTurmasSerializer,
    MinhaTurmaDetalhesSerializer
)


__all__ = [
    'PlanoAulaSerializer',
    'AulaFaltasSerializer',
    'AulaFaltasListSerializer',
    'ContextoAulaSerializer',
    'AtualizarFaltasSerializer',
    'MinhasTurmasSerializer',
    'MinhaTurmaDetalhesSerializer',
]
