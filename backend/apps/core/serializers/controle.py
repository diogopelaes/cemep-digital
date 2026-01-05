from rest_framework import serializers
from apps.core.models import ControleRegistrosVisualizacao


class ControleRegistrosVisualizacaoSerializer(serializers.ModelSerializer):
    """Serializer para ControleRegistrosVisualizacao."""
    
    bimestre_display = serializers.SerializerMethodField()
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    ano_letivo_ano = serializers.IntegerField(source='ano_letivo.ano', read_only=True)
    status_liberacao = serializers.CharField(read_only=True)
    esta_liberado = serializers.SerializerMethodField()
    
    class Meta:
        model = ControleRegistrosVisualizacao
        fields = [
            'id', 'ano_letivo', 'ano_letivo_ano', 'bimestre', 'bimestre_display',
            'tipo', 'tipo_display', 'data_inicio', 'data_fim', 'digitacao_futura',
            'status_liberacao', 'esta_liberado'
        ]
        read_only_fields = ['id', 'status_liberacao', 'esta_liberado']
    
    def get_bimestre_display(self, obj):
        return dict(ControleRegistrosVisualizacao.BIMESTRE_CHOICES).get(obj.bimestre, str(obj.bimestre))
    
    def get_esta_liberado(self, obj):
        return obj.esta_liberado()
