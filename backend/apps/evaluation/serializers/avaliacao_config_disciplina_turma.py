from rest_framework import serializers
from apps.evaluation.models import AvaliacaoConfigDisciplinaTurma
from apps.core.models import DisciplinaTurma

class AvaliacaoConfigDisciplinaTurmaSerializer(serializers.ModelSerializer):
    turma_numero = serializers.IntegerField(source='disciplina_turma.turma.numero', read_only=True)
    turma_letra = serializers.CharField(source='disciplina_turma.turma.letra', read_only=True)
    turma_nome = serializers.CharField(source='disciplina_turma.turma.nome', read_only=True)
    disciplina_nome = serializers.CharField(source='disciplina_turma.disciplina.nome', read_only=True)
    disciplina_sigla = serializers.CharField(source='disciplina_turma.disciplina.sigla', read_only=True)
    forma_calculo_display = serializers.CharField(source='get_forma_calculo_display', read_only=True)

    class Meta:
        model = AvaliacaoConfigDisciplinaTurma
        fields = [
            'id', 'ano_letivo', 'disciplina_turma', 'forma_calculo', 
            'pode_alterar', 'turma_numero', 'turma_letra', 'turma_nome', 
            'disciplina_nome', 'disciplina_sigla', 'forma_calculo_display'
        ]
        read_only_fields = ['id', 'ano_letivo', 'pode_alterar']
