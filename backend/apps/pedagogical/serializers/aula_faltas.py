"""
Serializers para Aula e Faltas (unificado)
"""
from rest_framework import serializers
from apps.pedagogical.models import Aula, Faltas
from apps.academic.models import Estudante, MatriculaTurma
from apps.core.models import ProfessorDisciplinaTurma, Turma, Disciplina


class FaltaItemSerializer(serializers.Serializer):
    """Serializer para um item de falta (usado em lote)."""
    estudante_id = serializers.UUIDField()
    qtd_faltas = serializers.IntegerField(min_value=0, max_value=6)


class AulaFaltasSerializer(serializers.ModelSerializer):
    """Serializer unificado para Aula com Faltas embutidas."""
    
    # Write fields
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
    
    # Read fields
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
    
    def get_turma_nome(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.turma.nome_completo
    
    def get_disciplina_nome(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.disciplina.nome
    
    def get_disciplina_sigla(self, obj):
        return obj.professor_disciplina_turma.disciplina_turma.disciplina.sigla
    
    def get_professor_nome(self, obj):
        return obj.professor_disciplina_turma.professor.get_apelido()
    
    def get_total_faltas(self, obj):
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
            from apps.core.models import AnoLetivo
            ano_letivo = AnoLetivo.objects.get(ano=turma.ano_letivo)
            return ano_letivo.bimestre(obj.data) or 0
        except:
            return 0
    
    def get_faltas(self, obj):
        """Retorna as faltas agrupadas por estudante."""
        return [
            {
                'estudante_id': str(f.estudante_id),
                'estudante_nome': f.estudante.nome_social or f.estudante.usuario.get_full_name(),
                'qtd_faltas': f.qtd_faltas
            }
            for f in obj.faltas.select_related('estudante__usuario').all()
        ]
    
    def create(self, validated_data):
        faltas_data = validated_data.pop('faltas_data', [])
        aula = Aula.objects.create(**validated_data)
        self._save_faltas(aula, faltas_data)
        return aula
    
    def update(self, instance, validated_data):
        faltas_data = validated_data.pop('faltas_data', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if faltas_data is not None:
            self._save_faltas(instance, faltas_data)
        
        return instance
    
    def _save_faltas(self, aula, faltas_data):
        """Salva/atualiza as faltas de uma aula."""
        from django.db import transaction
        
        with transaction.atomic():
            # Coletar IDs de estudantes com faltas
            estudantes_com_faltas = {item['estudante_id'] for item in faltas_data if item['qtd_faltas'] > 0}
            
            # Remover faltas de estudantes que agora têm 0 faltas
            Faltas.objects.filter(aula=aula).exclude(estudante_id__in=estudantes_com_faltas).delete()
            
            # Criar ou atualizar faltas
            for item in faltas_data:
                if item['qtd_faltas'] > 0:
                    Faltas.objects.update_or_create(
                        aula=aula,
                        estudante_id=item['estudante_id'],
                        defaults={'qtd_faltas': item['qtd_faltas']}
                    )


class AulaFaltasListSerializer(serializers.ModelSerializer):
    """Serializer leve para listagem de aulas."""
    
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
        turma = obj.professor_disciplina_turma.disciplina_turma.turma
        try:
            from apps.core.models import AnoLetivo
            ano_letivo = AnoLetivo.objects.get(ano=turma.ano_letivo)
            return ano_letivo.bimestre(obj.data) or 0
        except:
            return 0


class ContextoAulaSerializer(serializers.Serializer):
    """Serializer para o contexto do formulário de aula."""
    
    turmas = serializers.SerializerMethodField()
    disciplinas_por_turma = serializers.SerializerMethodField()
    
    def get_turmas(self, atribuicoes):
        """Retorna lista de turmas únicas do professor."""
        turmas_set = {}
        for attr in atribuicoes:
            turma = attr.disciplina_turma.turma
            if turma.id not in turmas_set:
                turmas_set[turma.id] = {
                    'id': str(turma.id),
                    'nome': turma.nome_completo,
                    'numero': turma.numero,
                    'letra': turma.letra,
                }
        return list(turmas_set.values())
    
    def get_disciplinas_por_turma(self, atribuicoes):
        """Retorna mapa de turma_id -> lista de disciplinas."""
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


class EstudanteChamadaSerializer(serializers.Serializer):
    """Serializer para lista de estudantes na chamada."""
    
    id = serializers.UUIDField(source='estudante.id')
    nome = serializers.SerializerMethodField()
    status = serializers.CharField(source='status')
    qtd_faltas = serializers.IntegerField(default=0)
    
    def get_nome(self, obj):
        estudante = obj.estudante
        return estudante.nome_social or estudante.usuario.get_full_name()


class AtualizarFaltasSerializer(serializers.Serializer):
    """Serializer para atualização rápida de faltas (auto-save)."""
    
    estudante_id = serializers.UUIDField()
    qtd_faltas = serializers.IntegerField(min_value=0, max_value=4)
