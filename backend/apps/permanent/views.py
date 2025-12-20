"""
Views para o App Permanent
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.http import FileResponse

from .models import (
    DadosPermanenteEstudante, DadosPermanenteResponsavel,
    HistoricoEscolar, HistoricoEscolarAnoLetivo, HistoricoEscolarNotas,
    OcorrenciaDisciplinar
)
from .serializers import (
    DadosPermanenteEstudanteSerializer, DadosPermanenteResponsavelSerializer,
    HistoricoEscolarSerializer, HistoricoEscolarAnoLetivoSerializer,
    HistoricoEscolarNotasSerializer, OcorrenciaDisciplinarSerializer,
    HistoricoCompletoSerializer
)
from apps.users.permissions import IsGestao, IsGestaoOrSecretaria


class DadosPermanenteEstudanteViewSet(viewsets.ModelViewSet):
    queryset = DadosPermanenteEstudante.objects.prefetch_related('responsaveis')
    serializer_class = DadosPermanenteEstudanteSerializer
    filter_backends = [DjangoFilterBackend]
    search_fields = ['nome', 'cpf']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsGestaoOrSecretaria()]
    
    @action(detail=True, methods=['get'])
    def historico_completo(self, request, pk=None):
        """Retorna o histórico completo do estudante com ocorrências."""
        estudante = self.get_object()
        ocorrencias = OcorrenciaDisciplinar.objects.filter(cpf=estudante.cpf)
        
        data = {
            'estudante': DadosPermanenteEstudanteSerializer(estudante).data,
            'ocorrencias': OcorrenciaDisciplinarSerializer(ocorrencias, many=True).data
        }
        
        return Response(data)


class DadosPermanenteResponsavelViewSet(viewsets.ModelViewSet):
    queryset = DadosPermanenteResponsavel.objects.select_related('estudante')
    serializer_class = DadosPermanenteResponsavelSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['estudante']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsGestaoOrSecretaria()]


class HistoricoEscolarViewSet(viewsets.ModelViewSet):
    queryset = HistoricoEscolar.objects.select_related('estudante').prefetch_related('anos_letivos__notas')
    serializer_class = HistoricoEscolarSerializer
    filter_backends = [DjangoFilterBackend]
    search_fields = ['estudante__nome', 'estudante__cpf', 'numero_matricula']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsGestaoOrSecretaria()]


class HistoricoEscolarAnoLetivoViewSet(viewsets.ModelViewSet):
    queryset = HistoricoEscolarAnoLetivo.objects.select_related('historico__estudante').prefetch_related('notas')
    serializer_class = HistoricoEscolarAnoLetivoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['historico', 'ano_letivo', 'status_final']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsGestaoOrSecretaria()]


class HistoricoEscolarNotasViewSet(viewsets.ModelViewSet):
    queryset = HistoricoEscolarNotas.objects.select_related('ano_letivo_ref')
    serializer_class = HistoricoEscolarNotasSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ano_letivo_ref']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsGestaoOrSecretaria()]


class OcorrenciaDisciplinarViewSet(viewsets.ModelViewSet):
    queryset = OcorrenciaDisciplinar.objects.all()
    serializer_class = OcorrenciaDisciplinarSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['cpf']
    search_fields = ['nome_estudante', 'cpf', 'descricao']
    
    def get_permissions(self):
        return [IsGestao()]
    
    @action(detail=True, methods=['get'])
    def download_anexo(self, request, pk=None):
        """Download protegido do anexo da ocorrência."""
        ocorrencia = self.get_object()
        
        if not ocorrencia.anexos:
            return Response(
                {'error': 'Nenhum anexo disponível'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return FileResponse(
            ocorrencia.anexos.open('rb'),
            as_attachment=True,
            filename=ocorrencia.anexos.name.split('/')[-1]
        )

