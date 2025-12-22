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
    RegistroProntuario
)
from .serializers import (
    DadosPermanenteEstudanteSerializer, DadosPermanenteResponsavelSerializer,
    HistoricoEscolarSerializer, HistoricoEscolarAnoLetivoSerializer,
    HistoricoEscolarNotasSerializer, RegistroProntuarioSerializer,
    HistoricoCompletoSerializer
)
from apps.users.permissions import IsGestao, IsGestaoOrSecretaria


class DadosPermanenteEstudanteViewSet(viewsets.ModelViewSet):
    queryset = DadosPermanenteEstudante.objects.prefetch_related('responsaveis')
    serializer_class = DadosPermanenteEstudanteSerializer
    filter_backends = [DjangoFilterBackend]
    search_fields = ['nome', 'cpf']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsGestaoOrSecretaria()]
    
    @action(detail=True, methods=['get'])
    def historico_completo(self, request, pk=None):
        """Retorna o histórico completo do estudante com registros do prontuário."""
        estudante = self.get_object()
        ocorrencias = RegistroProntuario.objects.filter(cpf=estudante.cpf)
        
        data = {
            'estudante': DadosPermanenteEstudanteSerializer(estudante).data,
            'ocorrencias': RegistroProntuarioSerializer(ocorrencias, many=True).data
        }
        
        return Response(data)


class DadosPermanenteResponsavelViewSet(viewsets.ModelViewSet):
    queryset = DadosPermanenteResponsavel.objects.select_related('estudante')
    serializer_class = DadosPermanenteResponsavelSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['estudante']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsGestaoOrSecretaria()]


class HistoricoEscolarViewSet(viewsets.ModelViewSet):
    queryset = HistoricoEscolar.objects.select_related('estudante').prefetch_related('anos_letivos__notas')
    serializer_class = HistoricoEscolarSerializer
    filter_backends = [DjangoFilterBackend]
    search_fields = ['estudante__nome', 'estudante__cpf', 'numero_matricula']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsGestaoOrSecretaria()]


class HistoricoEscolarAnoLetivoViewSet(viewsets.ModelViewSet):
    queryset = HistoricoEscolarAnoLetivo.objects.select_related('historico__estudante').prefetch_related('notas')
    serializer_class = HistoricoEscolarAnoLetivoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['historico', 'ano_letivo', 'status_final']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsGestaoOrSecretaria()]


class HistoricoEscolarNotasViewSet(viewsets.ModelViewSet):
    queryset = HistoricoEscolarNotas.objects.select_related('ano_letivo_ref')
    serializer_class = HistoricoEscolarNotasSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ano_letivo_ref']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsGestaoOrSecretaria()]


class RegistroProntuarioViewSet(viewsets.ModelViewSet):
    queryset = RegistroProntuario.objects.all()
    serializer_class = RegistroProntuarioSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['cpf']
    search_fields = ['nome_estudante', 'cpf', 'descricao']
    
    # controle_de_permissao
    def get_permissions(self):
        return [IsGestao()]
    
    @action(detail=True, methods=['get'])
    def download_anexo(self, request, pk=None):
        """Download protegido de um anexo específico do registro."""
        from .models import RegistroProntuarioAnexo
        
        registro = self.get_object()
        anexo_id = request.query_params.get('anexo_id')
        
        if not anexo_id:
            return Response(
                {'error': 'anexo_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            anexo = registro.anexos.get(id=anexo_id)
        except RegistroProntuarioAnexo.DoesNotExist:
            return Response(
                {'error': 'Anexo não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return FileResponse(
            anexo.arquivo.open('rb'),
            as_attachment=True,
            filename=anexo.arquivo.name.split('/')[-1]
        )

