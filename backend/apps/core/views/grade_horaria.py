from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from apps.core.models import GradeHoraria
from apps.core.serializers import GradeHorariaSerializer
from apps.users.permissions import GestaoWritePublicReadMixin, AnoLetivoFilterMixin


class GradeHorariaViewSet(AnoLetivoFilterMixin, GestaoWritePublicReadMixin, viewsets.ModelViewSet):
    """
    ViewSet para GradeHoraria.
    Leitura: Público (Autenticado) | Escrita: Gestão
    
    Filtrado pelo ano letivo selecionado do usuário.
    """
    queryset = GradeHoraria.objects.select_related('turma', 'horario_aula', 'disciplina')
    serializer_class = GradeHorariaSerializer
    pagination_class = None  # Retorna todos os registros

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['turma', 'horario_aula', 'disciplina', 'horario_aula__dia_semana']
    ordering_fields = ['horario_aula__dia_semana', 'horario_aula__hora_inicio']
    ordering = ['horario_aula__dia_semana', 'horario_aula__hora_inicio']
    
    ano_letivo_field = 'turma__ano_letivo'  # Campo de filtro do AnoLetivoFilterMixin
