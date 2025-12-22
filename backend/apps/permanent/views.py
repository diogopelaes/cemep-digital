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
from apps.users.permissions import (
    GestaoOnlyMixin, GestaoWriteSecretariaReadMixin, IsGestao
)


class DadosPermanenteEstudanteViewSet(GestaoWriteSecretariaReadMixin, viewsets.ModelViewSet):
    """ViewSet de Dados Permanentes (Estudante). Leitura: Gestão/Secretaria | Escrita: Gestão"""
    queryset = DadosPermanenteEstudante.objects.prefetch_related('responsaveis')
    serializer_class = DadosPermanenteEstudanteSerializer
    filter_backends = [DjangoFilterBackend]
    search_fields = ['nome', 'cpf']
    
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


class DadosPermanenteResponsavelViewSet(GestaoWriteSecretariaReadMixin, viewsets.ModelViewSet):
    """ViewSet de Dados Permanentes (Responsável). Leitura: Gestão/Secretaria | Escrita: Gestão"""
    queryset = DadosPermanenteResponsavel.objects.select_related('estudante')
    serializer_class = DadosPermanenteResponsavelSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['estudante']


class HistoricoEscolarViewSet(GestaoWriteSecretariaReadMixin, viewsets.ModelViewSet):
    """ViewSet de Histórico Escolar. Leitura: Gestão/Secretaria | Escrita: Gestão"""
    queryset = HistoricoEscolar.objects.select_related('estudante').prefetch_related('anos_letivos__notas')
    serializer_class = HistoricoEscolarSerializer
    filter_backends = [DjangoFilterBackend]
    search_fields = ['estudante__nome', 'estudante__cpf', 'numero_matricula']


class HistoricoEscolarAnoLetivoViewSet(GestaoWriteSecretariaReadMixin, viewsets.ModelViewSet):
    """ViewSet de Histórico por Ano Letivo. Leitura: Gestão/Secretaria | Escrita: Gestão"""
    queryset = HistoricoEscolarAnoLetivo.objects.select_related('historico__estudante').prefetch_related('notas')
    serializer_class = HistoricoEscolarAnoLetivoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['historico', 'ano_letivo', 'status_final']


class HistoricoEscolarNotasViewSet(GestaoWriteSecretariaReadMixin, viewsets.ModelViewSet):
    """ViewSet de Histórico de Notas. Leitura: Gestão/Secretaria | Escrita: Gestão"""
    queryset = HistoricoEscolarNotas.objects.select_related('ano_letivo_ref')
    serializer_class = HistoricoEscolarNotasSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ano_letivo_ref']


class RegistroProntuarioViewSet(GestaoOnlyMixin, viewsets.ModelViewSet):
    """ViewSet de Prontuário. Leitura e Escrita: Gestão"""
    queryset = RegistroProntuario.objects.all()
    serializer_class = RegistroProntuarioSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['cpf']
    search_fields = ['nome_estudante', 'cpf', 'descricao']
    
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

