"""
Serializer para Período de Trabalho
"""
from rest_framework import serializers
from apps.core.models import PeriodoTrabalho


class PeriodoTrabalhoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodoTrabalho
        fields = ['id', 'funcionario', 'data_entrada', 'data_saida']
