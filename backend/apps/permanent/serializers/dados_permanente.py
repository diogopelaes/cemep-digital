"""
Serializers para Dados Permanentes (Estudante e Responsável).
"""
from rest_framework import serializers
from apps.permanent.models import DadosPermanenteEstudante, DadosPermanenteResponsavel


class DadosPermanenteResponsavelSerializer(serializers.ModelSerializer):
    parentesco_display = serializers.CharField(source='get_parentesco_display', read_only=True)
    
    class Meta:
        model = DadosPermanenteResponsavel
        fields = ['cpf', 'nome', 'telefone', 'email', 'parentesco', 'parentesco_display']


class DadosPermanenteEstudanteSerializer(serializers.ModelSerializer):
    responsaveis = DadosPermanenteResponsavelSerializer(many=True, read_only=True)
    
    class Meta:
        model = DadosPermanenteEstudante
        fields = [
            'cpf', 'nome', 'data_nascimento', 'telefone', 'email',
            'endereco_completo', 'responsaveis'
        ]
