"""
Serializers para Indicador Bimestre
"""
from rest_framework import serializers
from apps.core.models import IndicadorBimestre, IndicadorBimestreAnoLetivo


class IndicadorBimestreSerializer(serializers.ModelSerializer):
    """Serializer para IndicadorBimestre."""
    
    class Meta:
        model = IndicadorBimestre
        fields = ['id', 'nome', 'categoria']


class IndicadorBimestreAnoLetivoSerializer(serializers.ModelSerializer):
    """Serializer para IndicadorBimestreAnoLetivo com dados expandidos."""
    
    indicador_nome = serializers.CharField(source='indicador.nome', read_only=True)
    indicador_categoria = serializers.CharField(source='indicador.categoria', read_only=True)
    
    class Meta:
        model = IndicadorBimestreAnoLetivo
        fields = [
            'id', 'indicador', 'indicador_nome', 'indicador_categoria',
            'posicao_categoria', 'posicao', 'is_active', 'ano_letivo'
        ]
        read_only_fields = ['ano_letivo']


class IndicadorBimestreAnoLetivoInputSerializer(serializers.Serializer):
    """Serializer para input de cada indicador no salvar_lote."""
    
    indicador_id = serializers.UUIDField(required=False, allow_null=True)
    nome = serializers.CharField(max_length=100)
    categoria = serializers.CharField(max_length=100)
    posicao_categoria = serializers.IntegerField()
    posicao = serializers.IntegerField()
    is_active = serializers.BooleanField(default=True)


class SalvarLoteIndicadoresSerializer(serializers.Serializer):
    """Serializer para action salvar_lote."""
    
    indicadores = IndicadorBimestreAnoLetivoInputSerializer(many=True)
