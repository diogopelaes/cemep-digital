"""
Serializers para Avaliação.

Este módulo contém os serializers responsáveis pela validação e transformação
de dados relacionados a Avaliações.
"""
from rest_framework import serializers
from django.db import transaction

from apps.evaluation.models import Avaliacao
from apps.evaluation.config import VALOR_MAXIMO, BIMESTRE_CHOICES
from apps.core.models import ProfessorDisciplinaTurma, AnoLetivo


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
            'valor',
            'data_inicio',
            'data_fim',
            'bimestre',
            'bimestre_display',
            'ano_letivo',
            'professores_disciplinas_turmas',
            'professores_disciplinas_turmas_ids',
            'turmas_info',
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
        """Valida que o valor não excede o máximo permitido."""
        if value > VALOR_MAXIMO:
            raise serializers.ValidationError(
                f"O valor não pode exceder {VALOR_MAXIMO}."
            )
        if value <= 0:
            raise serializers.ValidationError(
                "O valor deve ser maior que zero."
            )
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
        
        # Seta criado_por do contexto
        request = self.context.get('request')
        if request:
            validated_data['criado_por'] = request.user
        
        avaliacao = Avaliacao.objects.create(**validated_data)
        
        # Adiciona vínculos M2M
        if pdts:
            avaliacao.professores_disciplinas_turmas.set(pdts)
        
        return avaliacao
    
    @transaction.atomic
    def update(self, instance, validated_data):
        pdts = validated_data.pop('professores_disciplinas_turmas', None)
        
        # Atualiza campos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Atualiza vínculos M2M se fornecido
        if pdts is not None:
            instance.professores_disciplinas_turmas.set(pdts)
        
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
            'valor',
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
    """
    atribuicoes = serializers.SerializerMethodField()
    tipos = serializers.SerializerMethodField()
    valor_maximo = serializers.SerializerMethodField()
    
    def get_atribuicoes(self, atribuicoes_qs):
        """Lista atribuições do professor."""
        result = []
        for pdt in atribuicoes_qs:
            turma = pdt.disciplina_turma.turma
            disciplina = pdt.disciplina_turma.disciplina
            result.append({
                'id': str(pdt.id),
                'turma_id': str(turma.id),
                'turma_nome': turma.nome_completo,
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
    
    def get_valor_maximo(self, _):
        """Retorna valor máximo permitido."""
        return float(VALOR_MAXIMO)
