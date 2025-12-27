"""
Views para Ocorrências Pedagógicas
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from apps.pedagogical.models import (
    DescritorOcorrenciaPedagogica, OcorrenciaPedagogica,
    OcorrenciaResponsavelCiente
)
from apps.pedagogical.serializers import (
    DescritorOcorrenciaPedagogicaSerializer, OcorrenciaPedagogicaSerializer,
    OcorrenciaResponsavelCienteSerializer
)
from apps.users.permissions import (
    GestaoWriteFuncionarioReadMixin, GestaoSecretariaWritePublicReadMixin
)


class DescritorOcorrenciaPedagogicaViewSet(GestaoWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Tipos de Ocorrência. Leitura: Funcionários | Escrita: Gestão"""
    queryset = DescritorOcorrenciaPedagogica.objects.select_related('gestor__usuario')
    serializer_class = DescritorOcorrenciaPedagogicaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ativo']
    
    def perform_create(self, serializer):
        serializer.save(gestor=self.request.user.funcionario)


class OcorrenciaPedagogicaViewSet(GestaoSecretariaWritePublicReadMixin, viewsets.ModelViewSet):
    """ViewSet de Ocorrências. Leitura: Todos autenticados | Escrita: Gestão/Secretaria"""
    queryset = OcorrenciaPedagogica.objects.select_related(
        'estudante__usuario', 'autor__usuario', 'tipo'
    )
    serializer_class = OcorrenciaPedagogicaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['estudante', 'tipo', 'autor']
    
    def perform_create(self, serializer):
        ocorrencia = serializer.save(autor=self.request.user.funcionario)
        
        from apps.academic.models import ResponsavelEstudante
        vinculos = ResponsavelEstudante.objects.filter(estudante=ocorrencia.estudante)
        
        for vinculo in vinculos:
            OcorrenciaResponsavelCiente.objects.create(
                responsavel=vinculo.responsavel,
                ocorrencia=ocorrencia
            )


class OcorrenciaResponsavelCienteViewSet(viewsets.ModelViewSet):
    queryset = OcorrenciaResponsavelCiente.objects.select_related(
        'responsavel__usuario', 'ocorrencia'
    )
    serializer_class = OcorrenciaResponsavelCienteSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['responsavel', 'ciente']
    
    def get_permissions(self):
        return [IsAuthenticated()]
    
    @action(detail=True, methods=['post'])
    def marcar_ciente(self, request, pk=None):
        """Marca a ocorrência como ciente."""
        obj = self.get_object()
        
        if request.user.tipo_usuario == 'RESPONSAVEL':
            if obj.responsavel.usuario != request.user:
                return Response(
                    {'error': 'Acesso não autorizado'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        obj.ciente = True
        obj.data_ciencia = timezone.now()
        obj.save()
        
        return Response(OcorrenciaResponsavelCienteSerializer(obj).data)
