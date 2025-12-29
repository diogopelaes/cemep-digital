"""
Serializers para Plano de Aula e Aula
"""
from rest_framework import serializers
from apps.pedagogical.models import PlanoAula, Aula
from apps.core.models import Funcionario, Disciplina, Turma, Habilidade, ProfessorDisciplinaTurma
from apps.core.serializers import (
    FuncionarioSerializer, DisciplinaSerializer, TurmaSerializer,
    HabilidadeSerializer
)


class PlanoAulaSerializer(serializers.ModelSerializer):
    professor = FuncionarioSerializer(read_only=True)
    disciplina = DisciplinaSerializer(read_only=True)
    turmas = TurmaSerializer(many=True, read_only=True)
    habilidades = HabilidadeSerializer(many=True, read_only=True)

    
    professor_id = serializers.PrimaryKeyRelatedField(
        queryset=Funcionario.objects.all(),
        source='professor',
        write_only=True
    )
    disciplina_id = serializers.PrimaryKeyRelatedField(
        queryset=Disciplina.objects.all(),
        source='disciplina',
        write_only=True
    )
    turmas_ids = serializers.PrimaryKeyRelatedField(
        queryset=Turma.objects.all(),
        source='turmas',
        many=True,
        write_only=True
    )
    habilidades_ids = serializers.PrimaryKeyRelatedField(
        queryset=Habilidade.objects.all(),
        source='habilidades',
        many=True,
        write_only=True,
        required=False
    )
    
    class Meta:
        model = PlanoAula
        fields = [
            'id', 'professor', 'professor_id', 'disciplina', 'disciplina_id',
            'turmas', 'turmas_ids', 'data_inicio', 'data_fim', 'conteudo',
            'habilidades', 'habilidades_ids', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_em', 'atualizado_em']


class AulaSerializer(serializers.ModelSerializer):
    professor_disciplina_turma = serializers.PrimaryKeyRelatedField(
        queryset=ProfessorDisciplinaTurma.objects.all(),
        write_only=True
    )
    professor_disciplina_turma_detail = serializers.SerializerMethodField(read_only=True)
    total_faltas = serializers.SerializerMethodField()
    
    class Meta:
        model = Aula
        fields = [
            'id', 'professor_disciplina_turma', 'professor_disciplina_turma_detail',
            'data', 'conteudo', 'numero_aulas', 'total_faltas', 'criado_em'
        ]
        read_only_fields = ['criado_em']
    
    def get_professor_disciplina_turma_detail(self, obj):
        from apps.core.serializers import ProfessorDisciplinaTurmaSerializer
        return ProfessorDisciplinaTurmaSerializer(obj.professor_disciplina_turma).data
    
    def get_total_faltas(self, obj):
        return obj.faltas.count()
