"""
Serializers para Notas e Notificações
"""
from rest_framework import serializers
from apps.pedagogical.models import NotaBimestral, NotificacaoRecuperacao
from apps.academic.models import MatriculaTurma
from apps.core.models import ProfessorDisciplinaTurma, Bimestre
from apps.core.serializers import BimestreSerializer
from apps.academic.serializers import EstudanteSerializer, MatriculaTurmaSerializer


class NotaBimestralSerializer(serializers.ModelSerializer):
    matricula_turma = MatriculaTurmaSerializer(read_only=True)
    professor_disciplina_turma = serializers.PrimaryKeyRelatedField(
        queryset=ProfessorDisciplinaTurma.objects.all(),
        write_only=True
    )
    professor_disciplina_turma_detail = serializers.SerializerMethodField(read_only=True)
    bimestre = BimestreSerializer(read_only=True)
    
    matricula_turma_id = serializers.PrimaryKeyRelatedField(
        queryset=MatriculaTurma.objects.all(),
        source='matricula_turma',
        write_only=True
    )
    bimestre_id = serializers.PrimaryKeyRelatedField(
        queryset=Bimestre.objects.all(),
        source='bimestre',
        write_only=True
    )
    
    class Meta:
        model = NotaBimestral
        fields = [
            'id', 'matricula_turma', 'matricula_turma_id',
            'professor_disciplina_turma', 'professor_disciplina_turma_detail',
            'bimestre', 'bimestre_id', 'nota'
        ]

    def get_professor_disciplina_turma_detail(self, obj):
        from apps.core.serializers import ProfessorDisciplinaTurmaSerializer
        return ProfessorDisciplinaTurmaSerializer(obj.professor_disciplina_turma).data


class NotificacaoRecuperacaoSerializer(serializers.ModelSerializer):
    estudante = EstudanteSerializer(read_only=True)
    professor_disciplina_turma = serializers.PrimaryKeyRelatedField(
        queryset=ProfessorDisciplinaTurma.objects.all(),
        write_only=True
    )
    professor_disciplina_turma_detail = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = NotificacaoRecuperacao
        fields = ['id', 'estudante', 'professor_disciplina_turma', 'professor_disciplina_turma_detail', 'visualizado', 'data_visualizacao']
        read_only_fields = ['data_visualizacao']

    def get_professor_disciplina_turma_detail(self, obj):
        from apps.core.serializers import ProfessorDisciplinaTurmaSerializer
        return ProfessorDisciplinaTurmaSerializer(obj.professor_disciplina_turma).data
