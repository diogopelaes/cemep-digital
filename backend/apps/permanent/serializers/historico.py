"""
Serializers para Histórico Escolar.
"""
from rest_framework import serializers
from apps.permanent.models import HistoricoEscolar, HistoricoEscolarAnoLetivo, HistoricoEscolarNotas


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
