"""
Serializer para Curso
"""
from rest_framework import serializers
from apps.core.models import Curso


class CursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curso
        fields = ['id', 'nome', 'sigla', 'is_active']
