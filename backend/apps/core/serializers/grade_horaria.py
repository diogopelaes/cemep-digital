from rest_framework import serializers
from apps.core.models import GradeHoraria, Turma, HorarioAula


class GradeHorariaSerializer(serializers.ModelSerializer):
    """
    Serializer para GradeHoraria.
    
    Campos aninhados (read-only):
    - horario_aula_details: dados do horário (dia_semana, hora_inicio, etc.)
    - disciplina_details: dados da disciplina (nome, sigla)
    """
    horario_aula_details = serializers.SerializerMethodField(read_only=True)
    disciplina_details = serializers.SerializerMethodField(read_only=True)

    turma = serializers.PrimaryKeyRelatedField(queryset=Turma.objects.all())
    horario_aula = serializers.PrimaryKeyRelatedField(queryset=HorarioAula.objects.all())

    class Meta:
        model = GradeHoraria
        fields = [
            'id',
            'turma',
            'horario_aula',
            'disciplina',
            'horario_aula_details',
            'disciplina_details',
        ]
        read_only_fields = ['id']

    def get_horario_aula_details(self, obj):
        if obj.horario_aula:
            return {
                'id': str(obj.horario_aula.id),
                'numero': obj.horario_aula.numero,
                'dia_semana': obj.horario_aula.dia_semana,
                'dia_semana_display': obj.horario_aula.get_dia_semana_display(),
                'hora_inicio': obj.horario_aula.hora_inicio.strftime('%H:%M') if obj.horario_aula.hora_inicio else None,
                'hora_fim': obj.horario_aula.hora_fim.strftime('%H:%M') if obj.horario_aula.hora_fim else None,
            }
        return None

    def get_disciplina_details(self, obj):
        if obj.disciplina:
            return {
                'id': str(obj.disciplina.id),
                'nome': obj.disciplina.nome,
                'sigla': obj.disciplina.sigla,
            }
        return None

    def validate(self, data):
        """
        Validação customizada para garantir consistência.
        """
        turma = data.get('turma')
        horario_aula = data.get('horario_aula')

        if turma and horario_aula:
            # Ano letivo da turma deve coincidir com o do horário
            if turma.ano_letivo != horario_aula.ano_letivo.ano:
                raise serializers.ValidationError({
                    'horario_aula': f'O ano letivo da turma ({turma.ano_letivo}) '
                                    f'não coincide com o do horário ({horario_aula.ano_letivo.ano}).'
                })

        return data
