"""
Serializers para o App Permanent
"""
from rest_framework import serializers
from .models import (
    DadosPermanenteEstudante, DadosPermanenteResponsavel,
    HistoricoEscolar, HistoricoEscolarAnoLetivo, HistoricoEscolarNotas,
    OcorrenciaDisciplinar
)


class HistoricoEscolarNotasSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoricoEscolarNotas
        fields = ['id', 'nome_disciplina', 'aulas_semanais', 'nota_final', 'frequencia_total']


class HistoricoEscolarAnoLetivoSerializer(serializers.ModelSerializer):
    notas = HistoricoEscolarNotasSerializer(many=True, read_only=True)
    status_final_display = serializers.CharField(source='get_status_final_display', read_only=True)
    
    class Meta:
        model = HistoricoEscolarAnoLetivo
        fields = [
            'id', 'ano_letivo', 'nomenclatura_turma', 'numero_turma', 'letra_turma',
            'status_final', 'status_final_display', 'descricao_status', 'observacoes', 'notas'
        ]


class HistoricoEscolarSerializer(serializers.ModelSerializer):
    anos_letivos = HistoricoEscolarAnoLetivoSerializer(many=True, read_only=True)
    
    class Meta:
        model = HistoricoEscolar
        fields = [
            'numero_matricula', 'nome_curso', 'data_entrada_cemep',
            'data_saida_cemep', 'concluido', 'observacoes_gerais', 'anos_letivos'
        ]


class DadosPermanenteResponsavelSerializer(serializers.ModelSerializer):
    parentesco_display = serializers.CharField(source='get_parentesco_display', read_only=True)
    
    class Meta:
        model = DadosPermanenteResponsavel
        fields = ['cpf', 'nome', 'telefone', 'email', 'parentesco', 'parentesco_display']


class DadosPermanenteEstudanteSerializer(serializers.ModelSerializer):
    responsaveis = DadosPermanenteResponsavelSerializer(many=True, read_only=True)
    historico = HistoricoEscolarSerializer(read_only=True)
    
    class Meta:
        model = DadosPermanenteEstudante
        fields = [
            'cpf', 'nome', 'data_nascimento', 'telefone', 'email',
            'endereco_completo', 'responsaveis', 'historico'
        ]


class OcorrenciaDisciplinarSerializer(serializers.ModelSerializer):
    class Meta:
        model = OcorrenciaDisciplinar
        fields = [
            'id', 'cpf', 'nome_estudante', 'pai_ocorrencia', 'autor_nome',
            'data_ocorrido', 'data_registro', 'descricao', 'anexos'
        ]
        read_only_fields = ['data_registro']


class HistoricoCompletoSerializer(serializers.Serializer):
    """Serializer para emissão do histórico completo."""
    estudante = DadosPermanenteEstudanteSerializer()
    ocorrencias = OcorrenciaDisciplinarSerializer(many=True)

