from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.permanent.models import DadosPermanenteEstudante, DadosPermanenteResponsavel, RegistroProntuario
from apps.permanent.serializers import DadosPermanenteEstudanteSerializer, DadosPermanenteResponsavelSerializer, RegistroProntuarioSerializer
from core_project.permissions import Policy, GESTAO, SECRETARIA, NONE


class DadosPermanenteEstudanteViewSet(viewsets.ModelViewSet):
    """ViewSet de Dados Permanentes (Estudante). Leitura: Gestão/Secretaria | Escrita: Gestão"""
    queryset = DadosPermanenteEstudante.objects.prefetch_related('responsaveis')
    serializer_class = DadosPermanenteEstudanteSerializer
    filter_backends = [DjangoFilterBackend]
    search_fields = ['nome', 'cpf']
    
    permission_classes = [Policy(
        create=[GESTAO],
        read=[GESTAO, SECRETARIA],
        update=[GESTAO],
        delete=NONE,
        custom={
            'historico_completo': [GESTAO, SECRETARIA]
        }
    )]

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    @action(detail=True, methods=['get'])
    def historico_completo(self, request, pk=None):
        estudante = self.get_object()
        ocorrencias = RegistroProntuario.objects.filter(cpf=estudante.cpf)
        return Response({
            'estudante': DadosPermanenteEstudanteSerializer(estudante).data,
            'ocorrencias': RegistroProntuarioSerializer(ocorrencias, many=True).data
        })


class DadosPermanenteResponsavelViewSet(viewsets.ModelViewSet):
    """ViewSet de Dados Permanentes (Responsável). Leitura: Gestão/Secretaria | Escrita: Gestão"""
    queryset = DadosPermanenteResponsavel.objects.select_related('estudante')
    serializer_class = DadosPermanenteResponsavelSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['estudante']
    
    permission_classes = [Policy(
        create=[GESTAO],
        read=[GESTAO, SECRETARIA],
        update=[GESTAO],
        delete=NONE,
    )]


    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
