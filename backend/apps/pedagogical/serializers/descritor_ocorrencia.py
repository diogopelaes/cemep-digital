"""
Serializers para Descritores de Ocorrência Pedagógica
"""
from rest_framework import serializers
from apps.pedagogical.models import DescritorOcorrenciaPedagogica, DescritorOcorrenciaPedagogicaAnoLetivo


class DescritorOcorrenciaPedagogicaSerializer(serializers.ModelSerializer):
    """Serializer para DescritorOcorrenciaPedagogica (descritor base)."""
    
    class Meta:
        model = DescritorOcorrenciaPedagogica
        fields = ['id', 'texto']
        read_only_fields = ['id']


class DescritorOcorrenciaPedagogicaAnoLetivoSerializer(serializers.ModelSerializer):
    """Serializer para DescritorOcorrenciaPedagogicaAnoLetivo."""
    
    descritor_texto = serializers.CharField(source='descritor.texto', read_only=True)
    
    class Meta:
        model = DescritorOcorrenciaPedagogicaAnoLetivo
        fields = ['id', 'descritor', 'descritor_texto', 'ano_letivo', 'posicao', 'is_active']
        read_only_fields = ['id']


class DescritorAnoLetivoInputSerializer(serializers.Serializer):
    """Serializer para entrada de cada descritor no salvar_lote."""
    
    descritor_id = serializers.UUIDField(required=False, allow_null=True)
    texto = serializers.CharField(max_length=100)
    posicao = serializers.IntegerField()
    is_active = serializers.BooleanField(default=True)


class SalvarLoteDescritoresSerializer(serializers.Serializer):
    """Serializer para salvar descritores em lote."""
    
    descritores = DescritorAnoLetivoInputSerializer(many=True)
