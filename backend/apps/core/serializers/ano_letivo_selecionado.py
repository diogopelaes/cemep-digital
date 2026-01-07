"""
Serializer para AnoLetivoSelecionado
"""
from rest_framework import serializers
from apps.core.models import AnoLetivoSelecionado, AnoLetivo


class AnoLetivoSelecionadoSerializer(serializers.ModelSerializer):
    """Serializer para o ano letivo selecionado pelo usuário."""
    
    ano_letivo_id = serializers.PrimaryKeyRelatedField(
        queryset=AnoLetivo.objects.all(),
        source='ano_letivo',
        write_only=True
    )
    ano_letivo_details = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = AnoLetivoSelecionado
        fields = ['id', 'ano_letivo', 'ano_letivo_id', 'ano_letivo_details']
        read_only_fields = ['id', 'ano_letivo']

    def get_ano_letivo_details(self, obj):
        if obj.ano_letivo:
            return {
                'id': str(obj.ano_letivo.id),
                'ano': obj.ano_letivo.ano,
                'is_active': obj.ano_letivo.is_active,
                'bimestre_atual': obj.ano_letivo.bimestre(),
                'controles': obj.ano_letivo.controles or {}
            }
        return None
