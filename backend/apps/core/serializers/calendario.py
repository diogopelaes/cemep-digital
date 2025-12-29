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
        fields = '__all__'
