"""
Serializers para Ocorrências Pedagógicas
"""
from rest_framework import serializers
from apps.pedagogical.models import (
    DescritorOcorrenciaPedagogica, OcorrenciaPedagogica,
    OcorrenciaResponsavelCiente
)
from apps.academic.models import Estudante
from apps.core.serializers import FuncionarioSerializer, BimestreSerializer
from apps.academic.serializers import EstudanteSerializer


class DescritorOcorrenciaPedagogicaSerializer(serializers.ModelSerializer):
    gestor = FuncionarioSerializer(read_only=True)
    
    class Meta:
        model = DescritorOcorrenciaPedagogica
        fields = ['id', 'gestor', 'texto', 'ativo']


class OcorrenciaPedagogicaSerializer(serializers.ModelSerializer):
    estudante = EstudanteSerializer(read_only=True)
    autor = FuncionarioSerializer(read_only=True)
    tipo = DescritorOcorrenciaPedagogicaSerializer(read_only=True)
    bimestre = BimestreSerializer(read_only=True)
    
    estudante_id = serializers.PrimaryKeyRelatedField(
        queryset=Estudante.objects.all(),
        source='estudante',
        write_only=True
    )
    tipo_id = serializers.PrimaryKeyRelatedField(
        queryset=DescritorOcorrenciaPedagogica.objects.all(),
        source='tipo',
        write_only=True
    )
    
    class Meta:
        model = OcorrenciaPedagogica
        fields = [
            'id', 'estudante', 'estudante_id', 'autor',
            'tipo', 'tipo_id', 'data', 'bimestre'
        ]
        read_only_fields = ['data', 'autor', 'bimestre']


class OcorrenciaResponsavelCienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = OcorrenciaResponsavelCiente
        fields = ['id', 'responsavel', 'ocorrencia', 'ciente', 'data_ciencia']
        read_only_fields = ['data_ciencia']
