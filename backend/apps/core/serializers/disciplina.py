"""
Serializer para Disciplina
"""
from rest_framework import serializers
from apps.core.models import Disciplina


class DisciplinaSerializer(serializers.ModelSerializer):
    area_conhecimento_display = serializers.CharField(source='get_area_conhecimento_display', read_only=True)
    
    class Meta:
        model = Disciplina
        fields = ['id', 'nome', 'sigla', 'area_conhecimento', 'area_conhecimento_display', 'is_active']
