"""
Serializers para Prontuário e Histórico Completo.
"""
from rest_framework import serializers
from apps.permanent.models import RegistroProntuario
from .dados_permanente import DadosPermanenteEstudanteSerializer


class RegistroProntuarioSerializer(serializers.ModelSerializer):
    anexos = serializers.SerializerMethodField()
    
    class Meta:
        model = RegistroProntuario
        fields = [
            'id', 'cpf', 'cpf_formatado', 'nome_estudante', 'pai_ocorrencia', 'autor_nome',
            'data_ocorrido', 'data_registro', 'descricao', 'ano_letivo', 'bimestre', 'anexos'
        ]
        read_only_fields = ['data_registro', 'cpf_formatado']
    
    def get_anexos(self, obj):
        return [{'id': a.id, 'arquivo': a.arquivo.url if a.arquivo else None, 'descricao': a.descricao} for a in obj.anexos.all()]


class HistoricoCompletoSerializer(serializers.Serializer):
    """Serializer para emissão do histórico completo."""
    estudante = DadosPermanenteEstudanteSerializer()
    ocorrencias = RegistroProntuarioSerializer(many=True)
