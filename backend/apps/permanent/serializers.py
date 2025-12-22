"""
Serializers para o App Permanent
"""
from rest_framework import serializers
from .models import (
    DadosPermanenteEstudante, DadosPermanenteResponsavel,
    HistoricoEscolar, HistoricoEscolarAnoLetivo, HistoricoEscolarNotas,
    RegistroProntuario
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

