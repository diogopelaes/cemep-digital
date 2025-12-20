"""
Serializers para o App Core
"""
from rest_framework import serializers
from .models import (
    Funcionario, PeriodoTrabalho, Disciplina, Curso, Turma,
    DisciplinaTurma, ProfessorDisciplinaTurma, CalendarioEscolar, Habilidade
)
from apps.users.serializers import UserSerializer


class FuncionarioSerializer(serializers.ModelSerializer):
    usuario = UserSerializer(read_only=True)
    nome_completo = serializers.CharField(source='usuario.get_full_name', read_only=True)
    
    class Meta:
        model = Funcionario
        fields = ['id', 'usuario', 'nome_completo', 'funcao', 'ativo']


class FuncionarioCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Funcionario
        fields = ['usuario', 'funcao', 'ativo']


class PeriodoTrabalhoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodoTrabalho
        fields = ['id', 'funcionario', 'data_entrada', 'data_saida']


class DisciplinaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disciplina
        fields = ['id', 'nome', 'sigla']


class CursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curso
        fields = ['id', 'nome', 'sigla']


class TurmaSerializer(serializers.ModelSerializer):
    curso = CursoSerializer(read_only=True)
    curso_id = serializers.PrimaryKeyRelatedField(
        queryset=Curso.objects.all(),
        source='curso',
        write_only=True
    )
    nome_completo = serializers.CharField(read_only=True)
    
    class Meta:
        model = Turma
        fields = [
            'id', 'numero', 'letra', 'ano_letivo', 'nomenclatura',
            'curso', 'curso_id', 'nome_completo'
        ]


class DisciplinaTurmaSerializer(serializers.ModelSerializer):
    disciplina = DisciplinaSerializer(read_only=True)
    turma = TurmaSerializer(read_only=True)
    disciplina_id = serializers.PrimaryKeyRelatedField(
        queryset=Disciplina.objects.all(),
        source='disciplina',
        write_only=True
    )
    turma_id = serializers.PrimaryKeyRelatedField(
        queryset=Turma.objects.all(),
        source='turma',
        write_only=True
    )
    
    class Meta:
        model = DisciplinaTurma
        fields = ['id', 'disciplina', 'turma', 'disciplina_id', 'turma_id', 'carga_horaria']


class ProfessorDisciplinaTurmaSerializer(serializers.ModelSerializer):
    professor = FuncionarioSerializer(read_only=True)
    disciplina_turma = DisciplinaTurmaSerializer(read_only=True)
    professor_id = serializers.PrimaryKeyRelatedField(
        queryset=Funcionario.objects.all(),
        source='professor',
        write_only=True
    )
    disciplina_turma_id = serializers.PrimaryKeyRelatedField(
        queryset=DisciplinaTurma.objects.all(),
        source='disciplina_turma',
        write_only=True
    )
    
    class Meta:
        model = ProfessorDisciplinaTurma
        fields = ['id', 'professor', 'disciplina_turma', 'professor_id', 'disciplina_turma_id']


class CalendarioEscolarSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    
    class Meta:
        model = CalendarioEscolar
        fields = ['id', 'data', 'letivo', 'tipo', 'tipo_display', 'descricao']


class HabilidadeSerializer(serializers.ModelSerializer):
    disciplina = DisciplinaSerializer(read_only=True)
    disciplina_id = serializers.PrimaryKeyRelatedField(
        queryset=Disciplina.objects.all(),
        source='disciplina',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Habilidade
        fields = ['id', 'codigo', 'descricao', 'disciplina', 'disciplina_id']

