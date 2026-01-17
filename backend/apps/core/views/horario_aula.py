from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from apps.core.models import HorarioAula
from apps.core.serializers import HorarioAulaSerializer
from apps.core.mixins import AnoLetivoFilterMixin



class HorarioAulaViewSet(AnoLetivoFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet para HorarioAula.
    Leitura: Público (Autenticado) | Escrita: Gestão
    
    Filtrado pelo ano letivo selecionado do usuário.
    """
    queryset = HorarioAula.objects.all()
    serializer_class = HorarioAulaSerializer
    pagination_class = None  # Desabilita paginação - retorna todos os registros
    
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['ano_letivo', 'ano_letivo__ano', 'dia_semana', 'numero']
    ordering_fields = ['dia_semana', 'hora_inicio', 'numero']
    ordering = ['dia_semana', 'hora_inicio']
    
    ano_letivo_field = 'ano_letivo__ano'  # Campo de filtro do AnoLetivoFilterMixin
