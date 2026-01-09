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
from apps.pedagogical.validators import verificar_data_registro_aula
from apps.pedagogical.services.faltas_service import FaltasService


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
    turma_sigla = serializers.SerializerMethodField()
    turma_id = serializers.SerializerMethodField()
    disciplina_nome = serializers.SerializerMethodField()
    disciplina_sigla = serializers.SerializerMethodField()
    disciplina_id = serializers.SerializerMethodField()
    professor_nome = serializers.SerializerMethodField()
    total_faltas = serializers.SerializerMethodField()
    total_estudantes = serializers.SerializerMethodField()
    bimestre = serializers.SerializerMethodField()
    faltas = serializers.SerializerMethodField()
    
    class Meta:
        model = Aula
        fields = [
            'id', 
            'professor_disciplina_turma_id',  # Write
            'professor_disciplina_turma',     # Read (nested default if not blocked, but we rely on _id write)
            'data', 
            'numero_aulas', 
            'conteudo', 
            'faltas_data',    # Write payload
            'turma_nome',     # Read
            'turma_sigla',    # Read
            'turma_id',       # Read
            'disciplina_nome',# Read
            'disciplina_sigla', # Read
            'disciplina_id',  # Read
            'professor_nome', # Read
            'total_faltas',   # Read
            'total_estudantes',# Read
            'bimestre',       # Read
            'faltas',         # Read (nested list)
            'criado_em', 
            'atualizado_em'
        ]
        read_only_fields = ['id', 'professor_disciplina_turma', 'criado_em', 'atualizado_em']

    def validate(self, attrs):
        """
        Validação de negócio: Datas permitidas.
        """
        # Recupera instância de PDT e Data (considerando criação ou update parcial)
        pdt = attrs.get('professor_disciplina_turma')
        if not pdt and self.instance:
            pdt = self.instance.professor_disciplina_turma
            
        data_aula = attrs.get('data')
        if not data_aula and self.instance:
            data_aula = self.instance.data
            
        # Validação da Data usando Cache do Ano Letivo
        if pdt and data_aula:
            # A turma tem campo ano_letivo como inteiro, precisamos buscar a instância
            ano_valor = pdt.disciplina_turma.turma.ano_letivo
            
            # Busca instância do AnoLetivo pelo ano
            ano_letivo = AnoLetivo.objects.filter(ano=ano_valor).first()
            
            if ano_letivo:
                # Valida usando helper centralizado (que lê o cache controles)
                res = verificar_data_registro_aula(ano_letivo, data_aula)
                if not res['valida']:
                    raise serializers.ValidationError({'data': res['mensagem']})
                
        return attrs

    # --- Field Methods ---

    def get_turma_sigla(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.turma.sigla

    def get_turma_nome(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.turma.nome_completo
    
    def get_turma_id(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.turma.id

    def get_disciplina_nome(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.disciplina.nome
    
    def get_disciplina_sigla(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.disciplina.sigla

    def get_disciplina_id(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.disciplina.id
    
    def get_professor_nome(self, obj):
        return obj.professor_disciplina_turma.professor.usuario.get_full_name()
    
    def get_total_faltas(self, obj):
        # Soma a contagem total de faltas (nova property qtd_faltas em Faltas retorna len(aulas_faltas))
        return sum(f.qtd_faltas for f in obj.faltas.all())
    
    def get_total_estudantes(self, obj):
        return obj.faltas.count() # Na verdade conta registros de falta. Total da turma seria via Matricula.
        # Mas para o contexto de "chamada realizada", faltas.count() diz quantos foram marcados (ou presença).
        # Se registros forem criados para todos, ok.
    
    def get_bimestre(self, obj):
        # Retorna o bimestre armazenado na aula
        return obj.bimestre
    
    def get_faltas(self, obj):
        turma = obj.professor_disciplina_turma.disciplina_turma.turma
        
        # Busca números de chamada da turma para o mapeamento
        matriculas_map = {
            m.matricula_cemep.estudante_id: m.mumero_chamada
            for m in MatriculaTurma.objects.filter(turma=turma).only('matricula_cemep__estudante_id', 'mumero_chamada')
        }

        qs = obj.faltas.select_related('estudante__usuario')
        
        resultado = []
        for f in qs:
            num = matriculas_map.get(f.estudante.id, 0)
            resultado.append({
                'estudante_id': f.estudante.id,
                'estudante_nome': f.estudante.nome_social or f.estudante.usuario.get_full_name(),
                'numero_chamada': num,
                'qtd_faltas': f.qtd_faltas,
                'aulas_faltas': f.aulas_faltas
            })
            
        # Ordena primariamente pelo número de chamada, secundariamente pelo nome
        resultado.sort(key=lambda x: (x['numero_chamada'] if x['numero_chamada'] > 0 else 999, x['estudante_nome']))
        return resultado
    
    # --- CRUD Methods ---

    @transaction.atomic
    def create(self, validated_data):
        faltas_data = validated_data.pop('faltas_data', [])
        aula = Aula.objects.create(**validated_data)
        
        # Usa serviço centralizado com bulk operations
        if faltas_data:
            FaltasService.salvar_faltas_lote(aula, faltas_data)
        
        return aula
    
    @transaction.atomic
    def update(self, instance, validated_data):
        faltas_data = validated_data.pop('faltas_data', None)
        
        # Atualiza campos da aula
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Atualiza faltas se fornecido (usa serviço centralizado)
        if faltas_data is not None:
            FaltasService.salvar_faltas_lote(instance, faltas_data)
        
        return instance


class AulaFaltasListSerializer(serializers.ModelSerializer):
    """
    Serializer otimizado para listagem de aulas (menos campos).
    """
    turma_nome = serializers.SerializerMethodField()
    turma_sigla = serializers.SerializerMethodField()
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
            'turma_sigla',
            'disciplina_sigla',
            'total_faltas',
            'bimestre',
        ]
    
    def get_turma_nome(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.turma.nome_completo
    
    def get_turma_sigla(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.turma.sigla
    
    def get_disciplina_sigla(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.disciplina.sigla
    
    def get_total_faltas(self, obj):
        return sum(f.qtd_faltas for f in obj.faltas.all())
    
    def get_bimestre(self, obj):
        return obj.bimestre


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
