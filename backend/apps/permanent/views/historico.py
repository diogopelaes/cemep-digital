from rest_framework import viewsets, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.permanent.models import HistoricoEscolar, HistoricoEscolarAnoLetivo, HistoricoEscolarNotas
from apps.permanent.serializers import HistoricoEscolarSerializer, HistoricoEscolarAnoLetivoSerializer, HistoricoEscolarNotasSerializer
from core_project.permissions import Policy, GESTAO, SECRETARIA, NONE


class HistoricoEscolarViewSet(viewsets.ModelViewSet):
    """ViewSet de Histórico Escolar. Leitura: Gestão/Secretaria | Escrita: Gestão"""
    queryset = HistoricoEscolar.objects.select_related('estudante').prefetch_related('anos_letivos__notas')
    serializer_class = HistoricoEscolarSerializer
    filter_backends = [DjangoFilterBackend]
    search_fields = ['estudante__nome', 'estudante__cpf', 'numero_matricula']
    
    permission_classes = [Policy(
        create=[GESTAO],
        read=[GESTAO, SECRETARIA],
        update=[GESTAO],
        delete=NONE,
    )]

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class HistoricoEscolarAnoLetivoViewSet(viewsets.ModelViewSet):
    """ViewSet de Histórico por Ano Letivo. Leitura: Gestão/Secretaria | Escrita: Gestão"""
    queryset = HistoricoEscolarAnoLetivo.objects.select_related('historico__estudante').prefetch_related('notas')
    serializer_class = HistoricoEscolarAnoLetivoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['historico', 'ano_letivo', 'status_final']
    
    permission_classes = [Policy(
        create=[GESTAO],
        read=[GESTAO, SECRETARIA],
        update=[GESTAO],
        delete=NONE,
    )]

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class HistoricoEscolarNotasViewSet(viewsets.ModelViewSet):
    """ViewSet de Histórico de Notas. Leitura: Gestão/Secretaria | Escrita: Gestão"""
    queryset = HistoricoEscolarNotas.objects.select_related('ano_letivo_ref')
    serializer_class = HistoricoEscolarNotasSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ano_letivo_ref']
    
    permission_classes = [Policy(
        create=[GESTAO],
        read=[GESTAO, SECRETARIA],
        update=[GESTAO],
        delete=NONE,
    )]

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

