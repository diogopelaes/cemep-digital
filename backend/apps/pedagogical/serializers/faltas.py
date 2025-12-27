"""
Serializers para Faltas
"""
from rest_framework import serializers
from apps.pedagogical.models import Aula, Faltas
from apps.academic.models import Estudante
from apps.academic.serializers import EstudanteSerializer


class FaltasSerializer(serializers.ModelSerializer):
    estudante = EstudanteSerializer(read_only=True)
    
    aula_id = serializers.PrimaryKeyRelatedField(
        queryset=Aula.objects.all(),
        source='aula',
        write_only=True
    )
    estudante_id = serializers.PrimaryKeyRelatedField(
        queryset=Estudante.objects.all(),
        source='estudante',
        write_only=True
    )
    
    class Meta:
        model = Faltas
        fields = ['id', 'aula', 'aula_id', 'estudante', 'estudante_id', 'aula_numero']
        read_only_fields = ['aula']


class FaltasRegistroSerializer(serializers.Serializer):
    """Serializer para registro em lote de faltas."""
    aula_id = serializers.IntegerField()
    estudantes_ids = serializers.ListField(child=serializers.IntegerField())
    aula_numero = serializers.IntegerField(min_value=1, max_value=4)
