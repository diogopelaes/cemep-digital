"""
View para Bimestre
"""
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.models import Bimestre
from apps.core.serializers import BimestreSerializer
from apps.users.permissions import GestaoSecretariaWritePublicReadMixin


class BimestreViewSet(GestaoSecretariaWritePublicReadMixin, viewsets.ModelViewSet):
    """ViewSet de Bimestres. Leitura: Todos autenticados | Escrita: Gestão/Secretaria"""
    queryset = Bimestre.objects.all()
    serializer_class = BimestreSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ano_letivo']
