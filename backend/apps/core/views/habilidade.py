"""
View para Habilidade
"""
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.models import Habilidade
from apps.core.serializers import HabilidadeSerializer
from apps.users.permissions import GestaoSecretariaWritePublicReadMixin


class HabilidadeViewSet(GestaoSecretariaWritePublicReadMixin, viewsets.ModelViewSet):
    """
    ViewSet para Habilidade.
    Leitura: Gestão, Secretaria, Professor, Monitor | Escrita: Gestão
    """
    queryset = Habilidade.objects.select_related('disciplina').all()
    serializer_class = HabilidadeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['disciplina', 'is_active']
    search_fields = ['codigo', 'descricao']
