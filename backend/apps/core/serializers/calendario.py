from rest_framework import serializers
from apps.core.models import AnoLetivo, DiaLetivoExtra, DiaNaoLetivo
from django.core.exceptions import ValidationError

class DiaLetivoExtraSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiaLetivoExtra
        fields = '__all__'

class DiaNaoLetivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiaNaoLetivo
        fields = '__all__'

class AnoLetivoSerializer(serializers.ModelSerializer):
    dias_letivos_extras = DiaLetivoExtraSerializer(many=True, read_only=True)
    dias_nao_letivos = DiaNaoLetivoSerializer(many=True, read_only=True)
    bimestre_atual = serializers.SerializerMethodField()
    tem_avaliacoes = serializers.SerializerMethodField()
    
    dias_letivos_extras_ids = serializers.PrimaryKeyRelatedField(
        source='dias_letivos_extras',
        many=True,
        queryset=DiaLetivoExtra.objects.all(),
        write_only=True,
        required=False
    )
    dias_nao_letivos_ids = serializers.PrimaryKeyRelatedField(
        source='dias_nao_letivos',
        many=True,
        queryset=DiaNaoLetivo.objects.all(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = AnoLetivo
        fields = [
            'id', 'ano', 'is_active', 'numero_chamadas_turmas_travadas',
            'data_inicio_1bim', 'data_fim_1bim',
            'data_inicio_2bim', 'data_fim_2bim',
            'data_inicio_3bim', 'data_fim_3bim',
            'data_inicio_4bim', 'data_fim_4bim',
            'dias_letivos_extras', 'dias_nao_letivos',
            'dias_letivos_extras_ids', 'dias_nao_letivos_ids',
            'bimestre_atual', 'controles', 'tem_avaliacoes'
        ]

    def get_tem_avaliacoes(self, obj):
        from apps.evaluation.models import Avaliacao
        return Avaliacao.objects.filter(ano_letivo=obj).exists()

    def get_bimestre_atual(self, obj):
        return obj.bimestre()

    def validate_controles(self, value):
        """Valida as configurações de avaliação dentro do JSON controles."""
        if not value or 'avaliacao' not in value:
            return value
            
        av = value['avaliacao']
        
        # Garante que campos numéricos sejam válidos
        try:
            if 'valor_maximo' in av:
                val = float(av['valor_maximo'])
                if val <= 0:
                    raise serializers.ValidationError("O valor máximo deve ser maior que zero.")
                av['valor_maximo'] = val
                
            if 'media_aprovacao' in av:
                med = float(av['media_aprovacao'])
                if med < 0:
                    raise serializers.ValidationError("A média de aprovação não pode ser negativa.")
                av['media_aprovacao'] = med
        except (ValueError, TypeError):
            raise serializers.ValidationError("Valores numéricos inválidos nas configurações de avaliação.")
            
        return value

    def validate(self, data):
        """
        Executa a validação do modelo (clean) para garantir que as regras de negócio
        (como bloqueio de alteração de configuração de avaliação) sejam respeitadas.
        """
        if self.instance:
            # Em atualização, aplicamos as mudanças na instância para validar
            # Criamos uma cópia ou atualizamos temporariamente para chamar o clean
            # Mas como o clean busca o "old_obj" do banco, podemos apenas setar os atributos
            instance = self.instance
            for attr, value in data.items():
                setattr(instance, attr, value)
        else:
            # Em criação
            instance = AnoLetivo(**data)

        try:
            instance.clean()
        except ValidationError as e:
            # Converte erro de validação do Django para erro do DRF para retornar 400 corretamente
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else list(e.messages))
        except Exception as e:
             # Fallback para outros erros
             from rest_framework import serializers as drf_serializers
             raise drf_serializers.ValidationError({"non_field_errors": [str(e)]})

        return data
