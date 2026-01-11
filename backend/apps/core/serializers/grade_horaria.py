from rest_framework import serializers
from apps.core.models import (
    GradeHoraria, GradeHorariaValidade, Turma, 
    HorarioAula, Disciplina
)

class GradeHorariaSerializer(serializers.ModelSerializer):
    """Serializer para visualização simples de itens de grade."""
    class Meta:
        model = GradeHoraria
        fields = ['id', 'horario_aula', 'disciplina', 'curso']


class GradeHorariaEdicaoSerializer(serializers.Serializer):
    """
    Serializer para o payload de cadastro/edição em lote.
    Recebe:
    - turma_id (para identificar o grupo de turmas)
    - validade_id (opcional, se for edição de validade existente)
    - data_inicio / data_fim
    - grades: Lista de itens { horario_aula, disciplina }
    """
    turma_id = serializers.UUIDField()
    validade_id = serializers.UUIDField(required=False, allow_null=True)
    data_inicio = serializers.DateField()
    data_fim = serializers.DateField()
    grades = serializers.ListField(
        child=serializers.DictField(
            child=serializers.UUIDField() # horario_aula: uuid, disciplina: uuid
        )
    )

    def validate(self, data):
        """Valida se as datas são coerentes e se turma existe."""
        if data['data_inicio'] > data['data_fim']:
             raise serializers.ValidationError("A data de início deve ser menor ou igual à data de fim.")
        return data


class TurmaSimplificadaSerializer(serializers.ModelSerializer):
    """Serializer leve de Turma para contexto de edição."""
    curso_sigla = serializers.CharField(source='curso.sigla')
    
    class Meta:
        model = Turma
        fields = ['id', 'numero', 'letra', 'curso_sigla', 'nome']


class DisciplinaSimplificadaSerializer(serializers.ModelSerializer):
    """Serializer leve de Disciplina."""
    class Meta:
        model = Disciplina
        fields = ['id', 'nome', 'sigla']


class HorarioAulaSerializer(serializers.ModelSerializer):
    """Serializer de horário para montagem da grade."""
    hora_inicio = serializers.SerializerMethodField()
    hora_fim = serializers.SerializerMethodField()

    class Meta:
        model = HorarioAula
        fields = ['id', 'numero', 'dia_semana', 'hora_inicio', 'hora_fim']

    def get_hora_inicio(self, obj):
        return obj.hora_inicio.strftime('%H:%M')

    def get_hora_fim(self, obj):
        return obj.hora_fim.strftime('%H:%M')


class GradeHorariaValidadeSerializer(serializers.ModelSerializer):
    """Serializer para listar validades existentes."""
    class Meta:
        model = GradeHorariaValidade
        fields = ['id', 'data_inicio', 'data_fim', 'turma_numero', 'turma_letra']
