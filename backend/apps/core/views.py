"""
Views para o App Core
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    Funcionario, PeriodoTrabalho, Disciplina, Curso, Turma,
    DisciplinaTurma, ProfessorDisciplinaTurma, CalendarioEscolar, Habilidade
)
from .serializers import (
    FuncionarioSerializer, FuncionarioCreateSerializer, PeriodoTrabalhoSerializer,
    DisciplinaSerializer, CursoSerializer, TurmaSerializer,
    DisciplinaTurmaSerializer, ProfessorDisciplinaTurmaSerializer,
    CalendarioEscolarSerializer, HabilidadeSerializer
)
from apps.users.permissions import IsGestao, IsGestaoOrSecretaria, IsFuncionario


class FuncionarioViewSet(viewsets.ModelViewSet):
    queryset = Funcionario.objects.select_related('usuario').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ativo', 'usuario__tipo_usuario']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return FuncionarioCreateSerializer
        return FuncionarioSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsFuncionario()]


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
    filterset_fields = ['ano_letivo', 'curso', 'nomenclatura']
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
    filterset_fields = ['professor', 'disciplina_turma', 'disciplina_turma__turma__ano_letivo']
    
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

