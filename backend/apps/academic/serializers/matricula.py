"""
Serializers para Matrículas
"""
from rest_framework import serializers
from apps.academic.models import Estudante, MatriculaCEMEP, MatriculaTurma
from apps.core.models import Curso, Turma
from apps.core.serializers import CursoSerializer, TurmaSerializer
from .estudante import EstudanteSerializer


class MatriculaCEMEPSerializer(serializers.ModelSerializer):
    estudante = EstudanteSerializer(read_only=True)
    curso = CursoSerializer(read_only=True)
    estudante_id = serializers.PrimaryKeyRelatedField(
        queryset=Estudante.objects.all(),
        source='estudante',
        write_only=True
    )
    curso_id = serializers.PrimaryKeyRelatedField(
        queryset=Curso.objects.all(),
        source='curso',
        write_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    numero_matricula_formatado = serializers.CharField(read_only=True)
    
    class Meta:
        model = MatriculaCEMEP
        fields = [
            'numero_matricula', 'numero_matricula_formatado', 'estudante', 'estudante_id', 'curso', 'curso_id',
            'data_entrada', 'data_saida', 'status', 'status_display'
        ]


class MatriculaTurmaSerializer(serializers.ModelSerializer):
    matricula_cemep = MatriculaCEMEPSerializer(read_only=True)
    turma = TurmaSerializer(read_only=True)
    matricula_cemep_id = serializers.PrimaryKeyRelatedField(
        queryset=MatriculaCEMEP.objects.all(),
        source='matricula_cemep',
        write_only=True
    )
    turma_id = serializers.PrimaryKeyRelatedField(
        queryset=Turma.objects.all(),
        source='turma',
        write_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = MatriculaTurma
        fields = [
            'id', 'matricula_cemep', 'matricula_cemep_id', 'turma', 'turma_id',
            'mumero_chamada', 'data_entrada', 'data_saida', 'status', 'status_display'
        ]
