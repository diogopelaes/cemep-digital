"""
View para Habilidade
"""
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.models import Habilidade
from apps.core.serializers import HabilidadeSerializer
from apps.users.permissions import GestaoWriteFuncionarioReadMixin


class HabilidadeViewSet(GestaoWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Habilidades. Leitura: Funcionários | Escrita: Gestão"""
    queryset = Habilidade.objects.select_related('disciplina').all()
    serializer_class = HabilidadeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['disciplina', 'is_active']
    search_fields = ['codigo', 'descricao']
