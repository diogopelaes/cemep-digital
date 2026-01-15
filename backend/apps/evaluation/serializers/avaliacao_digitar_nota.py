"""
Serializers para digitação de notas de avaliação.

Este módulo contém os serializers para listar estudantes e salvar notas
de uma avaliação específica.
"""
from rest_framework import serializers
from decimal import Decimal

from apps.evaluation.models import Avaliacao, NotaAvaliacao
from apps.academic.models import MatriculaTurma
from apps.evaluation.validators import validar_nota_avaliacao, get_estudantes_elegiveis
from apps.evaluation.config import get_config_from_ano_letivo


class NotaAvaliacaoItemSerializer(serializers.Serializer):
    """
    Serializer para um item de nota (estudante + nota).
    Usado tanto para leitura quanto escrita.
    """
    matricula_turma_id = serializers.UUIDField()
    estudante_nome = serializers.CharField(read_only=True)
    numero_chamada = serializers.IntegerField(read_only=True)
    nota = serializers.DecimalField(
        max_digits=10, 
        decimal_places=5, 
        allow_null=True, 
        required=False
    )
    nota_avaliacao_id = serializers.UUIDField(read_only=True, allow_null=True)


class AvaliacaoDigitarNotaSerializer(serializers.Serializer):
    """
    Serializer para retornar dados da avaliação + estudantes com notas.
    """
    avaliacao_id = serializers.UUIDField(source='id')
    titulo = serializers.CharField()
    valor = serializers.DecimalField(max_digits=10, decimal_places=5)
    data_inicio = serializers.DateField()
    data_fim = serializers.DateField()
    bimestre = serializers.IntegerField()
    casas_decimais = serializers.SerializerMethodField()
    turmas_info = serializers.SerializerMethodField()
    
    def get_casas_decimais(self, obj):
        """Retorna casas decimais do ano letivo."""
        cfg = get_config_from_ano_letivo(obj.ano_letivo)
        return cfg['CASAS_DECIMAIS_AVALIACAO']
    
    def get_turmas_info(self, obj):
        """Retorna lista de turmas/disciplinas vinculadas à avaliação."""
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
                'turma_nome': turma.nome,
                'turma_sigla': turma.sigla,
                'disciplina_id': str(disciplina.id),
                'disciplina_nome': disciplina.nome,
                'disciplina_sigla': disciplina.sigla,
                'label': f"{turma.numero_letra} - {disciplina.sigla}",
            })
        return result


class EstudantesNotasSerializer(serializers.Serializer):
    """
    Serializer para lista de estudantes com suas notas em uma avaliação/turma.
    """
    estudantes = serializers.SerializerMethodField()
    
    def __init__(self, avaliacao, turma_id, *args, **kwargs):
        self.avaliacao = avaliacao
        self.turma_id = turma_id
        super().__init__(*args, **kwargs)
    
    def get_estudantes(self, obj):
        """Retorna lista de estudantes elegíveis com suas notas."""
        matriculas = get_estudantes_elegiveis(self.avaliacao, self.turma_id)
        
        # Busca notas existentes
        notas_existentes = {
            str(n.matricula_turma_id): n
            for n in NotaAvaliacao.objects.filter(
                avaliacao=self.avaliacao,
                matricula_turma__turma_id=self.turma_id
            )
        }
        
        result = []
        for mt in matriculas:
            estudante = mt.matricula_cemep.estudante
            usuario = estudante.usuario
            nota_obj = notas_existentes.get(str(mt.id))
            
            result.append({
                'matricula_turma_id': str(mt.id),
                'estudante_nome': estudante.nome_social or usuario.get_full_name(),
                'numero_chamada': mt.mumero_chamada,
                'nota': str(nota_obj.nota) if nota_obj and nota_obj.nota is not None else None,
                'nota_avaliacao_id': str(nota_obj.id) if nota_obj else None,
            })
        
        return result


class SalvarNotasSerializer(serializers.Serializer):
    """
    Serializer para salvar notas de uma avaliação.
    """
    pdt_id = serializers.UUIDField()
    notas = NotaAvaliacaoItemSerializer(many=True)
    
    def __init__(self, *args, avaliacao=None, user=None, **kwargs):
        self.avaliacao = avaliacao
        self.user = user
        super().__init__(*args, **kwargs)
    
    def validate_pdt_id(self, value):
        """Valida que o PDT pertence à avaliação."""
        if not self.avaliacao:
            raise serializers.ValidationError("Avaliação não informada.")
        
        if not self.avaliacao.professores_disciplinas_turmas.filter(id=value).exists():
            raise serializers.ValidationError(
                "Esta turma/disciplina não está vinculada à avaliação."
            )
        return value
    
    def validate_notas(self, value):
        """Valida cada nota individualmente."""
        if not self.avaliacao:
            return value
        
        ano_letivo = self.avaliacao.ano_letivo
        
        for item in value:
            nota = item.get('nota')
            if nota is not None:
                try:
                    validar_nota_avaliacao(nota, self.avaliacao, ano_letivo)
                except Exception as e:
                    raise serializers.ValidationError(str(e))
        
        return value
    
    def create(self, validated_data):
        """Cria ou atualiza as notas."""
        from apps.core.models import ProfessorDisciplinaTurma
        
        pdt = ProfessorDisciplinaTurma.objects.get(id=validated_data['pdt_id'])
        turma_id = pdt.disciplina_turma.turma_id
        notas_data = validated_data['notas']
        
        created_count = 0
        updated_count = 0
        
        for item in notas_data:
            matricula_turma_id = item['matricula_turma_id']
            nota_valor = item.get('nota')
            
            # Verifica se já existe
            nota_obj, created = NotaAvaliacao.objects.update_or_create(
                avaliacao=self.avaliacao,
                matricula_turma_id=matricula_turma_id,
                defaults={
                    'nota': Decimal(str(nota_valor)) if nota_valor is not None else None,
                    'criado_por': self.user,
                }
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        return {
            'created': created_count,
            'updated': updated_count,
            'total': len(notas_data)
        }
