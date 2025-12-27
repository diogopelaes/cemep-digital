"""
View para Calendário Escolar
"""
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.models import CalendarioEscolar
from apps.core.serializers import CalendarioEscolarSerializer
from apps.users.permissions import GestaoWritePublicReadMixin


class CalendarioEscolarViewSet(GestaoWritePublicReadMixin, viewsets.ModelViewSet):
    """ViewSet de Calendário Escolar. Leitura: Todos autenticados | Escrita: Gestão"""
    queryset = CalendarioEscolar.objects.all()
    serializer_class = CalendarioEscolarSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['letivo', 'tipo']
