"""
Serializers para o App Permanent

Re-exporta todos os Serializers para manter compatibilidade.
"""
from .dados_permanente import (
    DadosPermanenteEstudanteSerializer,
    DadosPermanenteResponsavelSerializer,
)
from .historico import (
    HistoricoEscolarSerializer,
    HistoricoEscolarAnoLetivoSerializer,
    HistoricoEscolarNotasSerializer,
)
from .prontuario import (
    RegistroProntuarioSerializer,
    HistoricoCompletoSerializer,
)


__all__ = [
    'DadosPermanenteEstudanteSerializer', 'DadosPermanenteResponsavelSerializer',
    'HistoricoEscolarSerializer', 'HistoricoEscolarAnoLetivoSerializer',
    'HistoricoEscolarNotasSerializer', 'RegistroProntuarioSerializer',
    'HistoricoCompletoSerializer',
]
