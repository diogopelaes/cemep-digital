"""
Serializer para Disciplina
"""
from rest_framework import serializers
from apps.core.models import Disciplina, Habilidade


class DisciplinaSerializer(serializers.ModelSerializer):
    area_conhecimento_display = serializers.CharField(source='get_area_conhecimento_display', read_only=True)
    
    # Leitura: lista de IDs das habilidades
    habilidades = serializers.PrimaryKeyRelatedField(
        queryset=Habilidade.objects.all(),
        many=True,
        required=False
    )
    
    class Meta:
        model = Disciplina
        fields = ['id', 'nome', 'sigla', 'area_conhecimento', 'area_conhecimento_display', 'habilidades', 'is_active']
