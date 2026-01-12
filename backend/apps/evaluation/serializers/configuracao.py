from rest_framework import serializers
from apps.evaluation.models import (
    ConfiguracaoAvaliacaoGeral,
    ConfiguracaoAvaliacaoProfessor,
    FormaCalculo,
    RegraArredondamento,
    VALOR_MAXIMO,
    MEDIA_APROVACAO
)


class ConfiguracaoAvaliacaoGeralSerializer(serializers.ModelSerializer):
    """Serializer para configuração geral de avaliação."""
    
    ano_letivo_ano = serializers.IntegerField(source='ano_letivo.ano', read_only=True)
    regra_arredondamento_display = serializers.CharField(
        source='get_regra_arredondamento_display', read_only=True
    )
    
    # Constantes globais (read-only para informação do frontend)
    valor_maximo = serializers.SerializerMethodField()
    media_aprovacao = serializers.SerializerMethodField()
    
    class Meta:
        model = ConfiguracaoAvaliacaoGeral
        fields = [
            'id',
            'ano_letivo',
            'ano_letivo_ano',
            'livre_escolha_professor',
            'numero_casas_decimais_bimestral',
            'numero_casas_decimais_avaliacao',
            'regra_arredondamento',
            'regra_arredondamento_display',
            'valor_maximo',
            'media_aprovacao',
            'criado_em',
            'atualizado_em',
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em']
    
    def get_valor_maximo(self, obj):
        return str(VALOR_MAXIMO)
    
    def get_media_aprovacao(self, obj):
        return str(MEDIA_APROVACAO)


class ConfiguracaoAvaliacaoProfessorSerializer(serializers.ModelSerializer):
    """Serializer para configuração de avaliação do professor."""
    
    ano_letivo_ano = serializers.IntegerField(source='ano_letivo.ano', read_only=True)
    professor_nome = serializers.CharField(source='professor.usuario.get_full_name', read_only=True)
    
    # Displays para frontend
    forma_calculo_1bim_display = serializers.CharField(
        source='get_forma_calculo_1bim_display', read_only=True
    )
    forma_calculo_2bim_display = serializers.CharField(
        source='get_forma_calculo_2bim_display', read_only=True
    )
    forma_calculo_3bim_display = serializers.CharField(
        source='get_forma_calculo_3bim_display', read_only=True
    )
    forma_calculo_4bim_display = serializers.CharField(
        source='get_forma_calculo_4bim_display', read_only=True
    )
    
    class Meta:
        model = ConfiguracaoAvaliacaoProfessor
        fields = [
            'id',
            'ano_letivo',
            'ano_letivo_ano',
            'professor',
            'professor_nome',
            'forma_calculo_1bim',
            'forma_calculo_1bim_display',
            'forma_calculo_2bim',
            'forma_calculo_2bim_display',
            'forma_calculo_3bim',
            'forma_calculo_3bim_display',
            'forma_calculo_4bim',
            'forma_calculo_4bim_display',
            'criado_em',
            'atualizado_em',
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em']
    
    def validate(self, data):
        """Valida regras de negócio."""
        ano_letivo = data.get('ano_letivo') or (self.instance and self.instance.ano_letivo)
        
        if ano_letivo:
            try:
                config_geral = ConfiguracaoAvaliacaoGeral.objects.get(ano_letivo=ano_letivo)
                if not config_geral.livre_escolha_professor:
                    raise serializers.ValidationError(
                        'A configuração geral não permite livre escolha do professor.'
                    )
            except ConfiguracaoAvaliacaoGeral.DoesNotExist:
                raise serializers.ValidationError(
                    'Não existe configuração geral de avaliação para este ano letivo.'
                )
        
        return data


# Choices para o frontend
class FormaCalculoChoicesSerializer(serializers.Serializer):
    """Serializer para enviar choices de FormaCalculo ao frontend."""
    value = serializers.CharField()
    label = serializers.CharField()


class RegraArredondamentoChoicesSerializer(serializers.Serializer):
    """Serializer para enviar choices de RegraArredondamento ao frontend."""
    value = serializers.CharField()
    label = serializers.CharField()
