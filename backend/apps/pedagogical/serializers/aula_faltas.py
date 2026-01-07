"""
Serializers para Aula e Faltas (unificado).

Este módulo contém os serializers responsáveis pela validação e transformação
de dados relacionados a Aulas e Faltas.
"""
from rest_framework import serializers
from django.db import transaction

from apps.pedagogical.models import Aula, Faltas
from apps.academic.models import MatriculaTurma
from apps.core.models import ProfessorDisciplinaTurma, AnoLetivo


class FaltaItemSerializer(serializers.Serializer):
    """
    Serializer para processar um item de falta em lote.
    Aceita 'faltas_mask' (booleans) ou 'aulas_faltas' (índices).
    """
    estudante_id = serializers.UUIDField()
    faltas_mask = serializers.ListField(
        child=serializers.BooleanField(),
        required=False,
        default=list,
        help_text="Lista de booleanos indicando presença/falta em cada horário."
    )
    aulas_faltas = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        default=list,
        help_text="Lista de índices (1-based) das aulas que o aluno faltou."
    )
    # Campo legado para compatibilidade de leitura, ignorado na escrita
    qtd_faltas = serializers.IntegerField(required=False, read_only=True)

    def validate(self, attrs):
        """
        Normaliza os dados de falta.
        Prioridade: faltas_mask > aulas_faltas > qtd_faltas (ignorado/zerado).
        """
        faltas_mask = attrs.get('faltas_mask')
        aulas_faltas = attrs.get('aulas_faltas')

        if faltas_mask:
            # Converte máscara booleana para lista de índices (1-based)
            # Ex: [True, False, True] -> [1, 3]
            attrs['aulas_faltas'] = [i + 1 for i, faltou in enumerate(faltas_mask) if faltou]
        elif not aulas_faltas:
            # Se não enviou nada, assume sem faltas
            attrs['aulas_faltas'] = []
            
        return attrs


class AulaFaltasSerializer(serializers.ModelSerializer):
    """
    Serializer principal para criação e edição de Aulas com Faltas.
    """
    # --- Write Fields ---
    professor_disciplina_turma_id = serializers.PrimaryKeyRelatedField(
        queryset=ProfessorDisciplinaTurma.objects.all(),
        source='professor_disciplina_turma',
        write_only=True
    )
    faltas_data = serializers.ListField(
        child=FaltaItemSerializer(),
        write_only=True,
        required=False,
        default=list
    )
    
    # --- Read Fields ---
    turma_nome = serializers.SerializerMethodField()
    disciplina_nome = serializers.SerializerMethodField()
    disciplina_sigla = serializers.SerializerMethodField()
    professor_nome = serializers.SerializerMethodField()
    total_faltas = serializers.SerializerMethodField()
    total_estudantes = serializers.SerializerMethodField()
    bimestre = serializers.SerializerMethodField()
    faltas = serializers.SerializerMethodField()
    
    class Meta:
        model = Aula
        fields = [
            'id', 
            'professor_disciplina_turma_id',
            'data', 
            'conteudo', 
            'numero_aulas',
            # Read-only fields
            'turma_nome',
            'disciplina_nome',
            'disciplina_sigla',
            'professor_nome',
            'total_faltas',
            'total_estudantes',
            'bimestre',
            'faltas',
            'criado_em',
            'atualizado_em',
        ]
        read_only_fields = ['criado_em', 'atualizado_em']
    
    # --- Field Methods ---

    def get_turma_nome(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.turma.nome_completo
    
    def get_disciplina_nome(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.disciplina.nome
    
    def get_disciplina_sigla(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.disciplina.sigla
    
    def get_professor_nome(self, obj):
        return obj.professor_disciplina_turma.professor.get_apelido()
    
    def get_total_faltas(self, obj):
        # Soma a contagem total de faltas (nova property qtd_faltas em Faltas retorna len(aulas_faltas))
        return sum(f.qtd_faltas for f in obj.faltas.all())
    
    def get_total_estudantes(self, obj):
        turma = obj.professor_disciplina_turma.disciplina_turma.turma
        return MatriculaTurma.objects.filter(
            turma=turma,
            status__in=['CURSANDO', 'RETIDO', 'PROMOVIDO']
        ).count()
    
    def get_bimestre(self, obj):
        turma = obj.professor_disciplina_turma.disciplina_turma.turma
        try:
            return turma.ano_letivo.bimestre(obj.data) or 0
        except AttributeError:
            return 0
    
    def get_faltas(self, obj):
        """Retorna lista de faltas detalhada."""
        # Assume que o queryset já fez prefetch de faltas__estudante__usuario
        return [
            {
                'estudante_id': str(f.estudante_id),
                'estudante_nome': f.estudante.nome_social or f.estudante.usuario.get_full_name(),
                'qtd_faltas': f.qtd_faltas,
                'aulas_faltas': f.aulas_faltas
            }
            for f in obj.faltas.all()
        ]
    
    # --- CRUD Methods ---

    @transaction.atomic
    def create(self, validated_data):
        faltas_data = validated_data.pop('faltas_data', [])
        aula = Aula.objects.create(**validated_data)
        self._save_faltas_records(aula, faltas_data)
        return aula
    
    @transaction.atomic
    def update(self, instance, validated_data):
        faltas_data = validated_data.pop('faltas_data', None)
        
        # Atualiza campos da aula
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Atualiza faltas se fornecido
        if faltas_data is not None:
            self._save_faltas_records(instance, faltas_data)
        
        return instance
    
    def _save_faltas_records(self, aula, faltas_data):
        """
        Lógica centralizada para salvar faltas.
        Remove faltas de quem não faltou mais e atualiza quem faltou.
        """
        # Filtra apenas quem tem faltas reais (lista não vazia)
        # O validate do FaltaItemSerializer garante que 'aulas_faltas' existe e é lista
        estudantes_com_faltas_ids = {
            item['estudante_id'] 
            for item in faltas_data 
            if item.get('aulas_faltas')
        }
        
        # 1. Remove faltas de estudantes que não estão na lista de 'com faltas'
        Faltas.objects.filter(aula=aula).exclude(estudante_id__in=estudantes_com_faltas_ids).delete()
        
        # 2. Cria ou Atualiza registros de faltas
        for item in faltas_data:
            aulas = item.get('aulas_faltas', [])
            if aulas:
                Faltas.objects.update_or_create(
                    aula=aula,
                    estudante_id=item['estudante_id'],
                    defaults={'aulas_faltas': aulas}
                )


class AulaFaltasListSerializer(serializers.ModelSerializer):
    """
    Serializer otimizado para listagem de aulas (menos campos).
    """
    turma_nome = serializers.SerializerMethodField()
    disciplina_sigla = serializers.SerializerMethodField()
    total_faltas = serializers.SerializerMethodField()
    bimestre = serializers.SerializerMethodField()
    
    class Meta:
        model = Aula
        fields = [
            'id', 
            'data', 
            'conteudo',
            'numero_aulas',
            'turma_nome',
            'disciplina_sigla',
            'total_faltas',
            'bimestre',
        ]
    
    def get_turma_nome(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.turma.nome_completo
    
    def get_disciplina_sigla(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.disciplina.sigla
    
    def get_total_faltas(self, obj):
        return sum(f.qtd_faltas for f in obj.faltas.all())
    
    def get_bimestre(self, obj):
        try:
            return obj.professor_disciplina_turma.disciplina_turma.turma.ano_letivo.bimestre(obj.data) or 0
        except:
            return 0


class ContextoAulaSerializer(serializers.Serializer):
    """
    Serializer para fornecer dados auxiliares ao formulário de registro de aula.
    """
    turmas = serializers.SerializerMethodField()
    disciplinas_por_turma = serializers.SerializerMethodField()
    
    def get_turmas(self, atribuicoes):
        """Retorna lista de turmas únicas a partir das atribuições."""
        # Usa dict para deduplicar por ID da turma
        turmas_map = {}
        for attr in atribuicoes:
            turma = attr.disciplina_turma.turma
            if turma.id not in turmas_map:
                turmas_map[turma.id] = {
                    'id': str(turma.id),
                    'nome': turma.nome_completo,
                    'numero': turma.numero,
                    'letra': turma.letra,
                }
        return list(turmas_map.values())
    
    def get_disciplinas_por_turma(self, atribuicoes):
        """Mapeia TurmaID -> Lista de Disciplinas."""
        result = {}
        for attr in atribuicoes:
            turma_id = str(attr.disciplina_turma.turma.id)
            if turma_id not in result:
                result[turma_id] = []
            
            disciplina = attr.disciplina_turma.disciplina
            result[turma_id].append({
                'professor_disciplina_turma_id': str(attr.id),
                'disciplina_id': str(disciplina.id),
                'disciplina_nome': disciplina.nome,
                'disciplina_sigla': disciplina.sigla,
            })
        return result


class AtualizarFaltasSerializer(serializers.Serializer):
    """
    Serializer para atualização unitária de faltas (ex: auto-save ou clique único).
    """
    estudante_id = serializers.UUIDField()
    faltas_mask = serializers.ListField(
        child=serializers.BooleanField(),
        required=False,
    )
    aulas_faltas = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    # Legado, mantido para evitar quebra se frontend antigo enviar
    qtd_faltas = serializers.IntegerField(required=False, min_value=0)

    def validate(self, attrs):
        if 'faltas_mask' in attrs:
            attrs['aulas_faltas'] = [i + 1 for i, f in enumerate(attrs['faltas_mask']) if f]
        elif 'aulas_faltas' not in attrs:
            if 'qtd_faltas' not in attrs:
                raise serializers.ValidationError("É necessário fornecer 'faltas_mask' ou 'aulas_faltas'.")
            
            # Legacy fallback
            qtd = attrs['qtd_faltas']
            attrs['aulas_faltas'] = list(range(1, qtd + 1)) if qtd > 0 else []

        return attrs
