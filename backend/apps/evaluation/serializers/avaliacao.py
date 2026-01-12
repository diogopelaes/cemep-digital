from rest_framework import serializers
from apps.evaluation.models import Avaliacao, BIMESTRE_CHOICES, VALOR_MAXIMO


class AvaliacaoSerializer(serializers.ModelSerializer):
    """Serializer para Avaliacao."""
    
    # Campos read-only para display
    professor_disciplina_turma_display = serializers.SerializerMethodField()
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    bimestre_display = serializers.CharField(source='get_bimestre_display', read_only=True)
    turma_id = serializers.UUIDField(
        source='professor_disciplina_turma.disciplina_turma.turma.id', read_only=True
    )
    disciplina_nome = serializers.CharField(
        source='professor_disciplina_turma.disciplina_turma.disciplina.nome', read_only=True
    )
    
    class Meta:
        model = Avaliacao
        fields = [
            'id',
            'professor_disciplina_turma',
            'professor_disciplina_turma_display',
            'turma_id',
            'disciplina_nome',
            'valor',
            'tipo',
            'tipo_display',
            'bimestre',
            'bimestre_display',
            'data_inicio',
            'data_fim',
        ]
        read_only_fields = ['id']
    
    def get_professor_disciplina_turma_display(self, obj):
        pdt = obj.professor_disciplina_turma
        return f"{pdt.disciplina_turma.disciplina.nome} - {pdt.disciplina_turma.turma.nome_completo}"
    
    def validate(self, data):
        """Validações de regras de negócio."""
        # Validar datas
        data_inicio = data.get('data_inicio')
        data_fim = data.get('data_fim')
        
        if data_inicio and data_fim and data_inicio > data_fim:
            raise serializers.ValidationError({
                'data_fim': 'A data de fim não pode ser anterior à data de início.'
            })
        
        # Validar valor máximo
        valor = data.get('valor')
        if valor and valor > VALOR_MAXIMO:
            raise serializers.ValidationError({
                'valor': f'O valor não pode ser maior que {VALOR_MAXIMO}.'
            })
        
        return data


class AvaliacaoListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de avaliações."""
    
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    bimestre_display = serializers.CharField(source='get_bimestre_display', read_only=True)
    disciplina_nome = serializers.CharField(
        source='professor_disciplina_turma.disciplina_turma.disciplina.nome', read_only=True
    )
    turma_nome = serializers.CharField(
        source='professor_disciplina_turma.disciplina_turma.turma.nome_completo', read_only=True
    )
    total_notas = serializers.SerializerMethodField()
    notas_lancadas = serializers.SerializerMethodField()
    
    class Meta:
        model = Avaliacao
        fields = [
            'id',
            'disciplina_nome',
            'turma_nome',
            'valor',
            'tipo',
            'tipo_display',
            'bimestre',
            'bimestre_display',
            'data_inicio',
            'data_fim',
            'total_notas',
            'notas_lancadas',
        ]
    
    def get_total_notas(self, obj):
        return obj.notas.count()
    
    def get_notas_lancadas(self, obj):
        return obj.notas.filter(nota__isnull=False).count()
