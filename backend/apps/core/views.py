"""
Views para o App Core
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from .models import (
    Funcionario, PeriodoTrabalho, Disciplina, Curso, Turma,
    DisciplinaTurma, ProfessorDisciplinaTurma, CalendarioEscolar, Habilidade
)
from .serializers import (
    FuncionarioSerializer, FuncionarioCreateSerializer, FuncionarioCompletoSerializer,
    FuncionarioUpdateSerializer, PeriodoTrabalhoSerializer, DisciplinaSerializer, 
    CursoSerializer, TurmaSerializer, DisciplinaTurmaSerializer, 
    ProfessorDisciplinaTurmaSerializer, CalendarioEscolarSerializer, HabilidadeSerializer
)
from apps.users.permissions import IsGestao, IsGestaoOrSecretaria, IsFuncionario
from apps.users.models import User


class FuncionarioViewSet(viewsets.ModelViewSet):
    queryset = Funcionario.objects.select_related('usuario').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ativo', 'usuario__tipo_usuario']
    
    def get_serializer_class(self):
        if self.action == 'criar_completo':
            return FuncionarioCompletoSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return FuncionarioCreateSerializer
        return FuncionarioSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'criar_completo', 'atualizar_completo']:
            return [IsGestao()]
        return [IsFuncionario()]
    
    @action(detail=False, methods=['post'], url_path='criar-completo')
    @transaction.atomic
    def criar_completo(self, request):
        """
        Cria usuário, funcionário e período de trabalho em uma única transação atômica.
        Se qualquer parte falhar, tudo é revertido.
        """
        serializer = FuncionarioCompletoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Criar usuário
        user = User.objects.create_user(
            username=data['username'],
            email=data.get('email', ''),
            password=data['password'],
            first_name=data['nome'],
            telefone=data.get('telefone', ''),
            tipo_usuario=data['tipo_usuario'],
        )
        
        # Criar funcionário
        funcionario = Funcionario.objects.create(
            usuario=user,
            matricula=data['matricula'],
            funcao=data['funcao'],
            ativo=True,
        )
        
        # Criar período de trabalho inicial
        PeriodoTrabalho.objects.create(
            funcionario=funcionario,
            data_entrada=data['data_entrada'],
            data_saida=None,  # Ainda em atividade
        )
        
        return Response(
            FuncionarioSerializer(funcionario).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['put'], url_path='atualizar-completo')
    @transaction.atomic
    def atualizar_completo(self, request, pk=None):
        """
        Atualiza funcionário, usuário e período de trabalho em uma única transação atômica.
        """
        funcionario = self.get_object()
        serializer = FuncionarioUpdateSerializer(
            data=request.data, 
            context={'funcionario': funcionario}
        )
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Atualizar usuário
        user = funcionario.usuario
        user.first_name = data['nome']
        user.email = data.get('email', '')
        user.telefone = data.get('telefone', '')
        user.save()
        
        # Atualizar funcionário
        funcionario.matricula = data['matricula']
        funcionario.funcao = data['funcao']
        funcionario.save()
        
        # Atualizar ou criar período de trabalho
        periodo = funcionario.periodos_trabalho.order_by('data_entrada').first()
        if periodo:
            periodo.data_entrada = data['data_entrada']
            periodo.save()
        else:
            PeriodoTrabalho.objects.create(
                funcionario=funcionario,
                data_entrada=data['data_entrada'],
                data_saida=None,
            )
        
        return Response(FuncionarioSerializer(funcionario).data)


class PeriodoTrabalhoViewSet(viewsets.ModelViewSet):
    queryset = PeriodoTrabalho.objects.select_related('funcionario').all()
    serializer_class = PeriodoTrabalhoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['funcionario']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsFuncionario()]


class DisciplinaViewSet(viewsets.ModelViewSet):
    queryset = Disciplina.objects.all()
    serializer_class = DisciplinaSerializer
    search_fields = ['nome', 'sigla']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsAuthenticated()]


class CursoViewSet(viewsets.ModelViewSet):
    queryset = Curso.objects.all()
    serializer_class = CursoSerializer
    search_fields = ['nome', 'sigla']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsAuthenticated()]


class TurmaViewSet(viewsets.ModelViewSet):
    queryset = Turma.objects.select_related('curso').all()
    serializer_class = TurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['numero', 'letra', 'ano_letivo', 'curso', 'nomenclatura']
    search_fields = ['numero', 'letra']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsAuthenticated()]


class DisciplinaTurmaViewSet(viewsets.ModelViewSet):
    queryset = DisciplinaTurma.objects.select_related('disciplina', 'turma').all()
    serializer_class = DisciplinaTurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['disciplina', 'turma', 'turma__ano_letivo']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsAuthenticated()]


class ProfessorDisciplinaTurmaViewSet(viewsets.ModelViewSet):
    queryset = ProfessorDisciplinaTurma.objects.select_related(
        'professor__usuario', 'disciplina_turma__disciplina', 'disciplina_turma__turma'
    ).all()
    serializer_class = ProfessorDisciplinaTurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['professor', 'disciplina_turma', 'disciplina_turma__turma', 'disciplina_turma__turma__ano_letivo']
    
    def get_queryset(self):
        qs = super().get_queryset()
        # Filtro customizado por turma
        turma = self.request.query_params.get('turma')
        if turma:
            qs = qs.filter(disciplina_turma__turma_id=turma)
        return qs
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsFuncionario()]


class CalendarioEscolarViewSet(viewsets.ModelViewSet):
    queryset = CalendarioEscolar.objects.all()
    serializer_class = CalendarioEscolarSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['letivo', 'tipo']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsAuthenticated()]


class HabilidadeViewSet(viewsets.ModelViewSet):
    queryset = Habilidade.objects.select_related('disciplina').all()
    serializer_class = HabilidadeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['disciplina']
    search_fields = ['codigo', 'descricao']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsFuncionario()]

