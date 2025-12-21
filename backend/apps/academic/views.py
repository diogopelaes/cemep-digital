"""
Views para o App Academic
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.http import FileResponse
from django.shortcuts import get_object_or_404

from .models import (
    Estudante, Responsavel, ResponsavelEstudante,
    MatriculaCEMEP, MatriculaTurma, Atestado
)
from .serializers import (
    EstudanteSerializer, EstudanteCreateSerializer,
    ResponsavelSerializer, ResponsavelCreateSerializer,
    ResponsavelEstudanteSerializer,
    MatriculaCEMEPSerializer, MatriculaTurmaSerializer,
    AtestadoSerializer
)
from apps.users.permissions import IsGestao, IsGestaoOrSecretaria, IsFuncionario, IsOwnerOrGestao


class EstudanteViewSet(viewsets.ModelViewSet):
    queryset = Estudante.objects.select_related('usuario').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['bolsa_familia', 'pe_de_meia', 'usa_onibus']
    search_fields = ['usuario__first_name', 'usuario__last_name', 'cpf', 'nome_social']
    
    def get_serializer_class(self):
        if self.action in ['create']:
            return EstudanteCreateSerializer
        return EstudanteSerializer
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestaoOrSecretaria()]
        return [IsFuncionario()]
    
    @action(detail=True, methods=['get'])
    def prontuario(self, request, pk=None):
        """Retorna o prontuário completo do estudante."""
        estudante = self.get_object()
        
        # Dados do estudante
        dados = EstudanteSerializer(estudante).data
        
        # Matrículas
        matriculas_cemep = MatriculaCEMEPSerializer(
            estudante.matriculas_cemep.all(), many=True
        ).data
        matriculas_turma = MatriculaTurmaSerializer(
            estudante.matriculas_turma.select_related('turma__curso').all(), many=True
        ).data
        
        # Responsáveis
        responsaveis = ResponsavelEstudanteSerializer(
            ResponsavelEstudante.objects.filter(estudante=estudante).select_related('responsavel__usuario'),
            many=True
        ).data
        
        return Response({
            'estudante': dados,
            'matriculas_cemep': matriculas_cemep,
            'matriculas_turma': matriculas_turma,
            'responsaveis': responsaveis
        })


class ResponsavelViewSet(viewsets.ModelViewSet):
    queryset = Responsavel.objects.select_related('usuario').all()
    filter_backends = [DjangoFilterBackend]
    search_fields = ['usuario__first_name', 'usuario__last_name', 'usuario__email']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ResponsavelCreateSerializer
        return ResponsavelSerializer
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestaoOrSecretaria()]
        return [IsFuncionario()]
    
    @action(detail=True, methods=['post'])
    def vincular_estudante(self, request, pk=None):
        """Vincula um estudante ao responsável."""
        responsavel = self.get_object()
        estudante_id = request.data.get('estudante_id')
        parentesco = request.data.get('parentesco')
        
        if not estudante_id or not parentesco:
            return Response(
                {'error': 'estudante_id e parentesco são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        estudante = get_object_or_404(Estudante, id=estudante_id)
        
        vinculo, created = ResponsavelEstudante.objects.get_or_create(
            responsavel=responsavel,
            estudante=estudante,
            defaults={'parentesco': parentesco}
        )
        
        if not created:
            vinculo.parentesco = parentesco
            vinculo.save()
        
        return Response(ResponsavelSerializer(responsavel).data)


class MatriculaCEMEPViewSet(viewsets.ModelViewSet):
    queryset = MatriculaCEMEP.objects.select_related('estudante__usuario', 'curso').all()
    serializer_class = MatriculaCEMEPSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'curso', 'estudante']
    search_fields = ['numero_matricula', 'estudante__usuario__first_name']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestaoOrSecretaria()]
        return [IsFuncionario()]


class MatriculaTurmaViewSet(viewsets.ModelViewSet):
    queryset = MatriculaTurma.objects.select_related(
        'matricula_cemep__estudante__usuario', 'turma__curso'
    ).all()
    serializer_class = MatriculaTurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'turma', 'matricula_cemep', 'turma__ano_letivo']
    search_fields = ['matricula_cemep__estudante__usuario__first_name', 'matricula_cemep__numero_matricula']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestaoOrSecretaria()]
        return [IsFuncionario()]


class AtestadoViewSet(viewsets.ModelViewSet):
    queryset = Atestado.objects.select_related('usuario_alvo', 'criado_por').all()
    serializer_class = AtestadoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['usuario_alvo']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestaoOrSecretaria()]
        return [IsFuncionario()]
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download protegido do arquivo do atestado."""
        atestado = self.get_object()
        
        # Verifica permissões adicionais
        user = request.user
        if user.tipo_usuario not in ['GESTAO', 'SECRETARIA']:
            # Estudante só vê próprios atestados
            if hasattr(user, 'estudante') and atestado.usuario_alvo != user:
                return Response(
                    {'error': 'Acesso não autorizado'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return FileResponse(
            atestado.arquivo.open('rb'),
            as_attachment=True,
            filename=atestado.arquivo.name.split('/')[-1]
        )

