"""
Serializers para o App Management

Re-exporta todos os Serializers para manter compatibilidade.
"""
from .tarefa import TarefaSerializer, NotificacaoTarefaSerializer
from .htpc import ReuniaoHTPCSerializer, NotificacaoHTPCSerializer
from .aviso import AvisoSerializer, AvisoVisualizacaoSerializer


__all__ = [
    'TarefaSerializer', 'NotificacaoTarefaSerializer',
    'ReuniaoHTPCSerializer', 'NotificacaoHTPCSerializer',
    'AvisoSerializer', 'AvisoVisualizacaoSerializer',
]
