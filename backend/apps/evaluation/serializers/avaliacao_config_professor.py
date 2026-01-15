from rest_framework import serializers
from ..models import AvaliacaoConfigProfessor

class AvaliacaoConfigProfessorSerializer(serializers.ModelSerializer):
    forma_calculo_display = serializers.CharField(source='get_forma_calculo_display', read_only=True)
    professor_nome = serializers.CharField(source='professor.nome', read_only=True)
    ano_letivo_ano = serializers.IntegerField(source='ano_letivo.ano', read_only=True)

    class Meta:
        model = AvaliacaoConfigProfessor
        fields = [
            'id', 'ano_letivo', 'ano_letivo_ano', 'professor', 'professor_nome', 
            'forma_calculo', 'forma_calculo_display', 'pode_alterar'
        ]
        read_only_fields = ['pode_alterar']

    def validate(self, attrs):
        # Validação extra se necessário, mas o clean do model já faz boa parte
        return attrs
