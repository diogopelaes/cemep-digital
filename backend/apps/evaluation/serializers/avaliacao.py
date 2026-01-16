"""
Serializers para Avaliação.

Este módulo contém os serializers responsáveis pela validação e transformação
de dados relacionados a Avaliações.
"""
from rest_framework import serializers
from django.db import transaction
from decimal import Decimal

from apps.evaluation.models import Avaliacao
from apps.evaluation.config import BIMESTRE_CHOICES, valida_valor_nota
from apps.core.models import ProfessorDisciplinaTurma, AnoLetivo, Habilidade
from apps.core.serializers.habilidade import HabilidadeSerializer


class AvaliacaoSerializer(serializers.ModelSerializer):
    """
    Serializer principal para criação e edição de Avaliações.
    """
    # --- Write Fields ---
    professores_disciplinas_turmas_ids = serializers.PrimaryKeyRelatedField(
        queryset=ProfessorDisciplinaTurma.objects.all(),
        source='professores_disciplinas_turmas',
        many=True,
        write_only=True,
        required=True
    )
    habilidades_ids = serializers.PrimaryKeyRelatedField(
        queryset=Habilidade.objects.all(),
        source='habilidades',
        many=True,
        write_only=True,
        required=False
    )
    
    # --- Read Fields ---
    turmas_info = serializers.SerializerMethodField()
    criado_por_nome = serializers.SerializerMethodField()
    tipo_display = serializers.SerializerMethodField()
    bimestre_display = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    
    class Meta:
        model = Avaliacao
        fields = [
            'id',
            'titulo',
            'descricao',
            'tipo',
            'tipo_display',
            'tipo_display',
            'valor',
            'peso',
            'data_inicio',
            'data_fim',
            'bimestre',
            'bimestre_display',
            'ano_letivo',
            'professores_disciplinas_turmas',
            'professores_disciplinas_turmas_ids',
            'turmas_info',
            'habilidades',
            'habilidades_ids',
            'criado_por',
            'criado_por_nome',
            'is_owner',
            'criado_em',
            'atualizado_em',
        ]
        read_only_fields = [
            'id', 'bimestre', 'ano_letivo', 'criado_por', 
            'criado_em', 'atualizado_em', 'professores_disciplinas_turmas'
        ]

    def validate_valor(self, value):
        """Valida o valor usando valida_valor_nota."""
        request = self.context.get('request')
        ano_letivo = request.user.get_ano_letivo_selecionado()
        
        if not valida_valor_nota(Decimal(str(value)), ano_letivo):
            raise serializers.ValidationError("Valor inválido.")
        return value

    def validate(self, attrs):
        """
        Validações de negócio:
        - Datas válidas
        - Professor tem vínculo com as turmas selecionadas
        """
        data_inicio = attrs.get('data_inicio')
        data_fim = attrs.get('data_fim')
        
        # Em update parcial, pega da instância se não fornecido
        if not data_inicio and self.instance:
            data_inicio = self.instance.data_inicio
        if not data_fim and self.instance:
            data_fim = self.instance.data_fim
            
        # Valida intervalo de datas
        if data_inicio and data_fim:
            if data_inicio > data_fim:
                raise serializers.ValidationError({
                    'data_fim': "A data de fim não pode ser anterior à data de início."
                })
        
        # Valida que professor tem vínculo com turmas selecionadas
        pdts = attrs.get('professores_disciplinas_turmas', [])
        request = self.context.get('request')
        
        if request and pdts:
            user = request.user
            
            # Se for PROFESSOR, valida ownership das turmas
            if user.tipo_usuario == 'PROFESSOR':
                for pdt in pdts:
                    if pdt.professor.usuario != user:
                        raise serializers.ValidationError({
                            'professores_disciplinas_turmas_ids': 
                            "Você só pode criar avaliações para suas próprias turmas."
                        })
        
        return attrs

    # --- Field Methods ---
    
    def get_turmas_info(self, obj):
        """Retorna informações das turmas vinculadas."""
        result = []
        for pdt in obj.professores_disciplinas_turmas.select_related(
            'disciplina_turma__turma__curso',
            'disciplina_turma__disciplina'
        ):
            turma = pdt.disciplina_turma.turma
            disciplina = pdt.disciplina_turma.disciplina
            result.append({
                'pdt_id': str(pdt.id),
                'turma_id': str(turma.id),
                'turma_nome': turma.nome_completo,
                'turma_sigla': turma.sigla,
                'disciplina_id': str(disciplina.id),
                'disciplina_nome': disciplina.nome,
                'disciplina_sigla': disciplina.sigla,
            })
        return result
    
    def get_criado_por_nome(self, obj):
        """Retorna nome do criador."""
        if obj.criado_por:
            return obj.criado_por.get_full_name()
        return None
    
    def get_tipo_display(self, obj):
        """Retorna label do tipo."""
        return obj.get_tipo_display()
    
    def get_bimestre_display(self, obj):
        """Retorna label do bimestre."""
        for value, label in BIMESTRE_CHOICES:
            if value == obj.bimestre:
                return label
        return str(obj.bimestre)
    
    def get_is_owner(self, obj):
        """Retorna se o usuário atual é o criador."""
        request = self.context.get('request')
        if request and request.user:
            return obj.criado_por == request.user
        return False

    # --- CRUD Methods ---

    @transaction.atomic
    def create(self, validated_data):
        pdts = validated_data.pop('professores_disciplinas_turmas', [])
        habilidades = validated_data.pop('habilidades', [])
        
        # Seta criado_por do contexto
        request = self.context.get('request')
        if request:
            validated_data['criado_por'] = request.user
        
        avaliacao = Avaliacao.objects.create(**validated_data)
        
        # Adiciona vínculos M2M
        if pdts:
            avaliacao.professores_disciplinas_turmas.set(pdts)
        
        if habilidades:
            avaliacao.habilidades.set(habilidades)
            
        return avaliacao
    
    @transaction.atomic
    def update(self, instance, validated_data):
        pdts = validated_data.pop('professores_disciplinas_turmas', None)
        habilidades = validated_data.pop('habilidades', None)
        
        # Atualiza campos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Atualiza vínculos M2M se fornecido
        if pdts is not None:
            instance.professores_disciplinas_turmas.set(pdts)
            
        if habilidades is not None:
            instance.habilidades.set(habilidades)
        
        return instance


class AvaliacaoListSerializer(serializers.ModelSerializer):
    """
    Serializer otimizado para listagem de avaliações.
    """
    turmas_resumo = serializers.SerializerMethodField()
    tipo_display = serializers.SerializerMethodField()
    bimestre_display = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    
    class Meta:
        model = Avaliacao
        fields = [
            'id',
            'titulo',
            'tipo',
            'tipo_display',
            'tipo_display',
            'valor',
            'peso',
            'data_inicio',
            'data_fim',
            'bimestre',
            'bimestre_display',
            'turmas_resumo',
            'is_owner',
            'criado_em',
        ]
    
    def get_turmas_resumo(self, obj):
        """Retorna resumo das turmas (siglas)."""
        turmas = []
        for pdt in obj.professores_disciplinas_turmas.select_related(
            'disciplina_turma__turma',
            'disciplina_turma__disciplina'
        ):
            turma_sigla = pdt.disciplina_turma.turma.sigla
            disc_sigla = pdt.disciplina_turma.disciplina.sigla
            turmas.append(f"{turma_sigla} - {disc_sigla}")
        return turmas
    
    def get_tipo_display(self, obj):
        return obj.get_tipo_display()
    
    def get_bimestre_display(self, obj):
        for value, label in BIMESTRE_CHOICES:
            if value == obj.bimestre:
                return label
        return str(obj.bimestre)
    
    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.criado_por == request.user
        return False


class AvaliacaoChoicesSerializer(serializers.Serializer):
    """
    Serializer para dados auxiliares do formulário.
    
    NOTA: O valor_maximo e outras configs agora vêm via get_config_from_ano_letivo()
    na view choices(), dentro do campo 'config' da resposta.
    """
    atribuicoes = serializers.SerializerMethodField()
    tipos = serializers.SerializerMethodField()
    multi_disciplinas = serializers.SerializerMethodField()
    habilidades_por_disciplina = serializers.SerializerMethodField()
    
    def get_atribuicoes(self, atribuicoes_qs):
        """Lista atribuições do professor."""
        result = []
        for pdt in atribuicoes_qs:
            turma = pdt.disciplina_turma.turma
            disciplina = pdt.disciplina_turma.disciplina
            result.append({
                'id': str(pdt.id),
                'turma_id': str(turma.id),
                'disciplina_turma_id': str(pdt.disciplina_turma_id),
                'turma_nome': turma.nome_completo,
                'turma_numero_letra': turma.numero_letra,
                'turma_sigla': turma.sigla,
                'disciplina_id': str(disciplina.id),
                'disciplina_nome': disciplina.nome,
                'disciplina_sigla': disciplina.sigla,
                'label': f"{turma.sigla} - {disciplina.nome}",
            })
        return result
    
    def get_tipos(self, _):
        """Retorna tipos de avaliação."""
        return [
            {'value': 'AVALIACAO_REGULAR', 'label': 'Avaliação Regular'},
            {'value': 'AVALIACAO_RECUPERACAO', 'label': 'Avaliação de Recuperação'},
            {'value': 'AVALIACAO_EXTRA', 'label': 'Avaliação Extra'},
        ]
    
    def get_multi_disciplinas(self, atribuicoes_qs):
        """Retorna True se o professor leciona mais de uma disciplina."""
        disciplinas = set()
        for pdt in atribuicoes_qs:
            disciplinas.add(pdt.disciplina_turma.disciplina_id)
        return len(disciplinas) > 1

    def get_habilidades_por_disciplina(self, atribuicoes_qs):
        """Retorna mapa de habilidades por disciplina para as atribuições fornecidas."""
        disciplinas_ids = atribuicoes_qs.values_list('disciplina_turma__disciplina_id', flat=True).distinct()
        
        habilidades_map = {}
        # Para cada disciplina, busca as habilidades vinculadas
        for disc_id in disciplinas_ids:
            habilidades = Habilidade.objects.filter(
                disciplinas__id=disc_id,
                is_active=True
            ).distinct()
            habilidades_map[str(disc_id)] = HabilidadeSerializer(habilidades, many=True).data
            
        return habilidades_map
