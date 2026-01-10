"""
Serializer para Habilidade
"""
from rest_framework import serializers
from apps.core.models import Habilidade, Disciplina


class HabilidadeSerializer(serializers.ModelSerializer):
    # Leitura: IDs das disciplinas vinculadas
    disciplinas = serializers.PrimaryKeyRelatedField(
        queryset=Disciplina.objects.all(),
        many=True,
        required=False
    )
    
    # Leitura extra: nomes das disciplinas para exibição
    disciplinas_detalhes = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Habilidade
        fields = ['id', 'codigo', 'descricao', 'is_active', 'disciplinas', 'disciplinas_detalhes']
    
    def get_disciplinas_detalhes(self, obj):
        return [
            {'id': str(d.id), 'nome': d.nome, 'sigla': d.sigla}
            for d in obj.disciplinas.all()
        ]
    
    def create(self, validated_data):
        disciplinas = validated_data.pop('disciplinas', [])
        habilidade = super().create(validated_data)
        
        # Associa às disciplinas
        for disciplina in disciplinas:
            disciplina.habilidades.add(habilidade)
        
        return habilidade
    
    def update(self, instance, validated_data):
        disciplinas = validated_data.pop('disciplinas', None)
        instance = super().update(instance, validated_data)
        
        if disciplinas is not None:
            # Remove de todas as disciplinas atuais
            for d in instance.disciplinas.all():
                d.habilidades.remove(instance)
            
            # Adiciona às novas disciplinas
            for disciplina in disciplinas:
                disciplina.habilidades.add(instance)
        
        return instance
