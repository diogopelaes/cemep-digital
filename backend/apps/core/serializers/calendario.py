"""
Serializer para Calendário Escolar
"""
from rest_framework import serializers
from apps.core.models import CalendarioEscolar


class CalendarioEscolarSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    
    class Meta:
        model = CalendarioEscolar
        fields = ['id', 'data', 'letivo', 'tipo', 'tipo_display', 'descricao']
