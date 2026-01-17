"""
View para Período de Trabalho
"""
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.models import PeriodoTrabalho
from apps.core.serializers import PeriodoTrabalhoSerializer



class PeriodoTrabalhoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para PeriodoTrabalho.
    Leitura: Gestão, Secretaria, Professor, Monitor | Escrita: Gestão
    """
    queryset = PeriodoTrabalho.objects.select_related('funcionario').all()
    serializer_class = PeriodoTrabalhoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['funcionario']
