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
from .descritor_ocorrencia import (
    DescritorOcorrenciaPedagogicaSerializer,
    DescritorOcorrenciaPedagogicaAnoLetivoSerializer,
    SalvarLoteDescritoresSerializer
)


__all__ = [
    'PlanoAulaSerializer',
    'AulaFaltasSerializer',
    'AulaFaltasListSerializer',
    'ContextoAulaSerializer',
    'AtualizarFaltasSerializer',
    'MinhasTurmasSerializer',
    'MinhaTurmaDetalhesSerializer',
    'DescritorOcorrenciaPedagogicaSerializer',
    'DescritorOcorrenciaPedagogicaAnoLetivoSerializer',
    'SalvarLoteDescritoresSerializer',
]
