from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from apps.core.models import GradeHoraria, AnoLetivo
from apps.core.serializers import GradeHorariaSerializer
from apps.users.permissions import GestaoWritePublicReadMixin


class GradeHorariaViewSet(GestaoWritePublicReadMixin, viewsets.ModelViewSet):
    """
    ViewSet para GradeHoraria.
    Leitura: Público (Autenticado) | Escrita: Gestão
    """
    queryset = GradeHoraria.objects.filter(
        turma__ano_letivo__in=AnoLetivo.objects.filter(is_active=True).values('ano')
    ).select_related(
        'turma', 'horario_aula', 'disciplina'
    )
    serializer_class = GradeHorariaSerializer
    pagination_class = None  # Retorna todos os registros

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['turma', 'horario_aula', 'disciplina', 'horario_aula__dia_semana']
    ordering_fields = ['horario_aula__dia_semana', 'horario_aula__hora_inicio']
    ordering = ['horario_aula__dia_semana', 'horario_aula__hora_inicio']
