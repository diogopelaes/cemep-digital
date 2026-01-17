"""
Views para o App Permanent

Re-exporta todos os ViewSets para manter compatibilidade.
"""
from .dados_permanente import DadosPermanenteEstudanteViewSet, DadosPermanenteResponsavelViewSet
from .historico import HistoricoEscolarViewSet, HistoricoEscolarAnoLetivoViewSet, HistoricoEscolarNotasViewSet
from .prontuario import RegistroProntuarioViewSet

__all__ = [
    'DadosPermanenteEstudanteViewSet', 'DadosPermanenteResponsavelViewSet',
    'HistoricoEscolarViewSet', 'HistoricoEscolarAnoLetivoViewSet',
    'HistoricoEscolarNotasViewSet', 'RegistroProntuarioViewSet',
]
