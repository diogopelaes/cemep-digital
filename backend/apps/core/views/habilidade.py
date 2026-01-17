"""
View para Habilidade
"""
from rest_framework import viewsets
from rest_framework.filters import SearchFilter

from apps.core.models import Habilidade
from apps.core.serializers import HabilidadeSerializer



class HabilidadeViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Habilidade.
    Leitura: Qualquer autenticado | Escrita: Gestão e Secretaria
    """
    queryset = Habilidade.objects.all()
    serializer_class = HabilidadeSerializer
    filter_backends = [SearchFilter]
    search_fields = ['codigo', 'descricao']
    filterset_fields = ['is_active']

