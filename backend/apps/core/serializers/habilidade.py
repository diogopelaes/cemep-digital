"""
Serializer para Habilidade
"""
from rest_framework import serializers
from apps.core.models import Habilidade, Disciplina
from .disciplina import DisciplinaSerializer


class HabilidadeSerializer(serializers.ModelSerializer):
    disciplina = DisciplinaSerializer(read_only=True)
    disciplina_id = serializers.PrimaryKeyRelatedField(
        queryset=Disciplina.objects.all(),
        source='disciplina',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Habilidade
        fields = ['id', 'codigo', 'descricao', 'disciplina', 'disciplina_id', 'is_active']
