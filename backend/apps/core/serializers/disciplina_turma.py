"""
Serializer para Disciplina-Turma
"""
from rest_framework import serializers
from apps.core.models import DisciplinaTurma, Disciplina, Turma, AnoLetivo
from .disciplina import DisciplinaSerializer
from .turma import TurmaSerializer


class DisciplinaTurmaSerializer(serializers.ModelSerializer):
    disciplina = DisciplinaSerializer(read_only=True)
    turma = TurmaSerializer(read_only=True)
    disciplina_id = serializers.PrimaryKeyRelatedField(
        queryset=Disciplina.objects.all(),
        source='disciplina',
        write_only=True
    )
    turma_id = serializers.PrimaryKeyRelatedField(
        queryset=Turma.objects.filter(
            ano_letivo__in=AnoLetivo.objects.filter(is_active=True).values('ano')
        ),
        source='turma',
        write_only=True
    )
    
    class Meta:
        model = DisciplinaTurma
        fields = ['id', 'disciplina', 'turma', 'disciplina_id', 'turma_id', 'aulas_semanais']
