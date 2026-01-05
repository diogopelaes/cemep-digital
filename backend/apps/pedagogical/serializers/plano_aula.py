from rest_framework import serializers
from apps.pedagogical.models import PlanoAula
from apps.core.serializers.habilidade import HabilidadeSerializer

class PlanoAulaSerializer(serializers.ModelSerializer):
    habilidades_detalhes = HabilidadeSerializer(source='habilidades', many=True, read_only=True)
    
    class Meta:
        model = PlanoAula
        fields = [
            'id', 'professor', 'disciplina', 'turmas', 
            'data_inicio', 'data_fim', 'conteudo', 
            'habilidades', 'habilidades_detalhes',
            'ano_letivo', 'bimestre'
        ]
        read_only_fields = ['professor', 'bimestre']

    def create(self, validated_data):
        # Define o professor automaticamente como o usuário logado
        request = self.context.get('request')
        if request and hasattr(request.user, 'funcionario'):
            validated_data['professor'] = request.user.funcionario
        return super().create(validated_data)
