from rest_framework import serializers
from apps.core.models import AnoLetivo, DiaLetivoExtra, DiaNaoLetivo

class DiaLetivoExtraSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiaLetivoExtra
        fields = '__all__'

class DiaNaoLetivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiaNaoLetivo
        fields = '__all__'

class AnoLetivoSerializer(serializers.ModelSerializer):
    dias_letivos_extras = DiaLetivoExtraSerializer(many=True, read_only=True)
    dias_nao_letivos = DiaNaoLetivoSerializer(many=True, read_only=True)
    bimestre_atual = serializers.SerializerMethodField()
    
    dias_letivos_extras_ids = serializers.PrimaryKeyRelatedField(
        source='dias_letivos_extras',
        many=True,
        queryset=DiaLetivoExtra.objects.all(),
        write_only=True,
        required=False
    )
    dias_nao_letivos_ids = serializers.PrimaryKeyRelatedField(
        source='dias_nao_letivos',
        many=True,
        queryset=DiaNaoLetivo.objects.all(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = AnoLetivo
        fields = [
            'id', 'ano', 'is_active', 'numero_chamadas_turmas_travadas',
            'data_inicio_1bim', 'data_fim_1bim',
            'data_inicio_2bim', 'data_fim_2bim',
            'data_inicio_3bim', 'data_fim_3bim',
            'data_inicio_4bim', 'data_fim_4bim',
            'dias_letivos_extras', 'dias_nao_letivos',
            'dias_letivos_extras_ids', 'dias_nao_letivos_ids',
            'bimestre_atual', 'controles'
        ]

    def get_bimestre_atual(self, obj):
        return obj.bimestre()

    def validate_controles(self, value):
        """Valida as configurações de avaliação dentro do JSON controles."""
        if not value or 'avaliacao' not in value:
            return value
            
        av = value['avaliacao']
        
        # Garante que campos numéricos sejam válidos
        try:
            if 'valor_maximo' in av:
                val = float(av['valor_maximo'])
                if val <= 0:
                    raise serializers.ValidationError("O valor máximo deve ser maior que zero.")
                av['valor_maximo'] = val
                
            if 'media_aprovacao' in av:
                med = float(av['media_aprovacao'])
                if med < 0:
                    raise serializers.ValidationError("A média de aprovação não pode ser negativa.")
                av['media_aprovacao'] = med
        except (ValueError, TypeError):
            raise serializers.ValidationError("Valores numéricos inválidos nas configurações de avaliação.")
            
        return value
