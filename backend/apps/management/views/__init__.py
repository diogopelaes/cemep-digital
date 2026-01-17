"""
Views para o App Management

Re-exporta todos os ViewSets para manter compatibilidade com imports existentes.
"""
from .tarefa import TarefaViewSet, NotificacaoTarefaViewSet
from .htpc import ReuniaoHTPCViewSet, NotificacaoHTPCViewSet
from .aviso import AvisoViewSet, AvisoVisualizacaoViewSet
from .dashboard import DashboardViewSet

__all__ = [
    'TarefaViewSet', 'NotificacaoTarefaViewSet',
    'ReuniaoHTPCViewSet', 'NotificacaoHTPCViewSet',
    'AvisoViewSet', 'AvisoVisualizacaoViewSet',
    'DashboardViewSet',
]
