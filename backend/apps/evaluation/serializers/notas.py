from rest_framework import serializers
from decimal import Decimal
from apps.evaluation.models import NotaAvaliacao, NotaBimestral, VALOR_MAXIMO


class NotaAvaliacaoSerializer(serializers.ModelSerializer):
    """Serializer para NotaAvaliacao."""
    
    estudante_nome = serializers.CharField(
        source='matricula_turma.matricula_cemep.estudante.usuario.get_full_name', 
        read_only=True
    )
    numero_chamada = serializers.IntegerField(
        source='matricula_turma.mumero_chamada', 
        read_only=True
    )
    avaliacao_valor = serializers.DecimalField(
        source='avaliacao.valor',
        max_digits=4,
        decimal_places=2,
        read_only=True
    )
    
    class Meta:
        model = NotaAvaliacao
        fields = [
            'id',
            'avaliacao',
            'matricula_turma',
            'estudante_nome',
            'numero_chamada',
            'is_active',
            'nota',
            'avaliacao_valor',
        ]
        read_only_fields = ['id', 'avaliacao', 'matricula_turma', 'is_active']
    
    def validate_nota(self, value):
        """Valida que a nota não excede o valor da avaliação."""
        if value is not None:
            avaliacao = self.instance.avaliacao if self.instance else None
            if avaliacao and value > avaliacao.valor:
                raise serializers.ValidationError(
                    f'A nota não pode ser maior que o valor da avaliação ({avaliacao.valor}).'
                )
        return value


class NotaAvaliacaoBulkUpdateSerializer(serializers.Serializer):
    """Serializer para atualização em lote de notas de avaliação."""
    
    notas = serializers.ListField(
        child=serializers.DictField(),
        help_text='Lista de {id, nota}'
    )
    
    def validate_notas(self, value):
        for item in value:
            if 'id' not in item:
                raise serializers.ValidationError('Cada item deve ter um id.')
            nota = item.get('nota')
            if nota is not None:
                try:
                    Decimal(str(nota))
                except:
                    raise serializers.ValidationError(f'Nota inválida: {nota}')
        return value


class NotaBimestralSerializer(serializers.ModelSerializer):
    """Serializer para NotaBimestral."""
    
    estudante_nome = serializers.CharField(
        source='matricula_turma.matricula_cemep.estudante.usuario.get_full_name', 
        read_only=True
    )
    numero_chamada = serializers.IntegerField(
        source='matricula_turma.mumero_chamada', 
        read_only=True
    )
    disciplina_nome = serializers.CharField(
        source='professor_disciplina_turma.disciplina_turma.disciplina.nome',
        read_only=True
    )
    bimestre_display = serializers.CharField(source='get_bimestre_display', read_only=True)
    
    # Campos calculados
    nota_parcial = serializers.SerializerMethodField()
    fez_recuperacao_status = serializers.SerializerMethodField()
    
    class Meta:
        model = NotaBimestral
        fields = [
            'id',
            'matricula_turma',
            'professor_disciplina_turma',
            'estudante_nome',
            'numero_chamada',
            'disciplina_nome',
            'nota_calculo_avaliacoes',
            'nota_recuperacao',
            'nota_parcial',
            'nota_final',
            'fez_recuperacao',
            'fez_recuperacao_status',
            'bimestre',
            'bimestre_display',
        ]
        read_only_fields = [
            'id', 
            'matricula_turma', 
            'professor_disciplina_turma',
            'nota_calculo_avaliacoes',
            'nota_recuperacao',
            'fez_recuperacao',
        ]
    
    def get_nota_parcial(self, obj):
        """Retorna max(nota_calculo_avaliacoes, nota_recuperacao)."""
        valores = [v for v in [obj.nota_calculo_avaliacoes, obj.nota_recuperacao] if v is not None]
        return str(max(valores)) if valores else None
    
    def get_fez_recuperacao_status(self, obj):
        """Retorna (fez, recuperou)."""
        fez, recuperou = obj.fez_recuperacao_status()
        return {'fez': fez, 'recuperou': recuperou}
    
    def validate_nota_final(self, value):
        """Valida que a nota final não excede VALOR_MAXIMO."""
        if value is not None and value > VALOR_MAXIMO:
            raise serializers.ValidationError(
                f'A nota final não pode ser maior que {VALOR_MAXIMO}.'
            )
        return value


class NotaBimestralBulkUpdateSerializer(serializers.Serializer):
    """Serializer para atualização em lote de notas bimestrais."""
    
    notas = serializers.ListField(
        child=serializers.DictField(),
        help_text='Lista de {id, nota_final}'
    )
    
    def validate_notas(self, value):
        for item in value:
            if 'id' not in item:
                raise serializers.ValidationError('Cada item deve ter um id.')
            nota_final = item.get('nota_final')
            if nota_final is not None:
                try:
                    valor = Decimal(str(nota_final))
                    if valor > VALOR_MAXIMO:
                        raise serializers.ValidationError(
                            f'Nota final não pode ser maior que {VALOR_MAXIMO}.'
                        )
                except:
                    raise serializers.ValidationError(f'Nota inválida: {nota_final}')
        return value
