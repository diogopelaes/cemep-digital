"""
Serializer para Bimestre
"""
from rest_framework import serializers
from apps.core.models import Bimestre


class BimestreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bimestre
        fields = ['id', 'numero', 'data_inicio', 'data_fim', 'ano_letivo']
