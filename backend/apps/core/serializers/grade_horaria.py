from rest_framework import serializers
from apps.core.models import GradeHoraria, Turma, HorarioAula, GradeHorariaValidade


class GradeHorariaSerializer(serializers.ModelSerializer):
    """
    Serializer para GradeHoraria.
    
    Campos aninhados (read-only):
    - horario_aula_details: dados do horário (dia_semana, hora_inicio, etc.)
    - disciplina_details: dados da disciplina (nome, sigla)
    """
    horario_aula_details = serializers.SerializerMethodField(read_only=True)
    disciplina_details = serializers.SerializerMethodField(read_only=True)

    # Turma agora é derivada da validade (read-only para compatibilidade frontend)
    turma = serializers.UUIDField(source='validade.turma.id', read_only=True)
    
    # Campo obrigatório para vincular à vigência correta
    validade = serializers.PrimaryKeyRelatedField(
        queryset=GradeHorariaValidade.objects.all(),
        required=True
    )
    
    horario_aula = serializers.PrimaryKeyRelatedField(queryset=HorarioAula.objects.all())

    class Meta:
        model = GradeHoraria
        fields = [
            'id',
            'turma',
            'validade',
            'horario_aula',
            'disciplina',
            'horario_aula_details',
            'disciplina_details',
        ]
        read_only_fields = ['id', 'turma']

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
        validade = data.get('validade')
        horario_aula = data.get('horario_aula')

        if validade and horario_aula:
            # Ano letivo da turma deve coincidir com o do horário
            ano_turma = validade.turma.ano_letivo
            ano_horario = horario_aula.ano_letivo.ano
            
            if ano_turma != ano_horario:
                raise serializers.ValidationError({
                    'horario_aula': f'O ano letivo da turma ({ano_turma}) '
                                    f'não coincide com o do horário ({ano_horario}).'
                })

        return data
