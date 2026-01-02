from rest_framework import serializers
from apps.core.models import HorarioAula, AnoLetivo

class HorarioAulaSerializer(serializers.ModelSerializer):
    ano_letivo = serializers.PrimaryKeyRelatedField(
        queryset=AnoLetivo.objects.filter(is_active=True)
    )
    dia_semana_display = serializers.CharField(source='get_dia_semana_display', read_only=True)

    class Meta:
        model = HorarioAula
        fields = [
            'id', 
            'ano_letivo', 
            'numero', 
            'dia_semana', 
            'dia_semana_display', 
            'hora_inicio', 
            'hora_fim'
        ]
        read_only_fields = ['id', 'dia_semana_display']

    def validate(self, data):
        """
        Validações do horário de aula.
        """
        hora_inicio = data.get('hora_inicio')
        hora_fim = data.get('hora_fim')
        
        # Valida que hora de início é anterior à hora de fim
        if hora_inicio and hora_fim and hora_inicio >= hora_fim:
            raise serializers.ValidationError({
                'hora_fim': 'A hora de fim deve ser posterior à hora de início.'
            })
        
        # Valida que dia_semana está no range válido (0-6)
        dia_semana = data.get('dia_semana')
        if dia_semana is not None and (dia_semana < 0 or dia_semana > 6):
            raise serializers.ValidationError({
                'dia_semana': 'Dia da semana inválido. Use valores de 0 (Segunda) a 6 (Domingo).'
            })
        
        # Valida que numero é positivo
        numero = data.get('numero')
        if numero is not None and numero <= 0:
            raise serializers.ValidationError({
                'numero': 'O número da aula deve ser maior que zero.'
            })
        
        return data
