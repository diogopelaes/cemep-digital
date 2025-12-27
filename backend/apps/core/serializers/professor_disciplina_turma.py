"""
Serializer para Professor-Disciplina-Turma
"""
from rest_framework import serializers
from apps.core.models import ProfessorDisciplinaTurma, Funcionario, DisciplinaTurma
from .funcionario import FuncionarioSerializer
from .disciplina_turma import DisciplinaTurmaSerializer


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
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    
    class Meta:
        model = ProfessorDisciplinaTurma
        fields = [
            'id', 'professor', 'disciplina_turma', 'professor_id', 'disciplina_turma_id',
            'tipo', 'tipo_display', 'data_inicio', 'data_fim'
        ]
    
    def validate_professor_id(self, value):
        """Valida que o funcionário é do tipo PROFESSOR."""
        if value.usuario.tipo_usuario != 'PROFESSOR':
            raise serializers.ValidationError(
                'Apenas funcionários do tipo PROFESSOR podem ser atribuídos.'
            )
        return value
    
    def validate(self, data):
        """Valida que data_fim não é anterior a data_inicio."""
        data_inicio = data.get('data_inicio')
        data_fim = data.get('data_fim')
        
        if data_inicio and data_fim and data_fim < data_inicio:
            raise serializers.ValidationError({
                'data_fim': 'A data de fim não pode ser anterior à data de início.'
            })
        
        return data
