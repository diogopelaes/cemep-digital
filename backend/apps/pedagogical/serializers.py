"""
Serializers para o App Pedagogical
"""
from rest_framework import serializers
from .models import (
    PlanoAula, Aula, Faltas, TipoOcorrencia, OcorrenciaPedagogica,
    OcorrenciaResponsavelCiente, NotaBimestral, Recuperacao, NotificacaoRecuperacao
)
from apps.core.serializers import (
    FuncionarioSerializer, DisciplinaSerializer, TurmaSerializer,
    DisciplinaTurmaSerializer, HabilidadeSerializer
)
from apps.academic.serializers import EstudanteSerializer, MatriculaTurmaSerializer


class PlanoAulaSerializer(serializers.ModelSerializer):
    professor = FuncionarioSerializer(read_only=True)
    disciplina = DisciplinaSerializer(read_only=True)
    turmas = TurmaSerializer(many=True, read_only=True)
    habilidades = HabilidadeSerializer(many=True, read_only=True)
    
    professor_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['Funcionario']).Funcionario.objects.all(),
        source='professor',
        write_only=True
    )
    disciplina_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['Disciplina']).Disciplina.objects.all(),
        source='disciplina',
        write_only=True
    )
    turmas_ids = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['Turma']).Turma.objects.all(),
        source='turmas',
        many=True,
        write_only=True
    )
    habilidades_ids = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['Habilidade']).Habilidade.objects.all(),
        source='habilidades',
        many=True,
        write_only=True,
        required=False
    )
    
    class Meta:
        model = PlanoAula
        fields = [
            'id', 'professor', 'professor_id', 'disciplina', 'disciplina_id',
            'turmas', 'turmas_ids', 'data_inicio', 'data_fim', 'conteudo',
            'habilidades', 'habilidades_ids', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_em', 'atualizado_em']


class AulaSerializer(serializers.ModelSerializer):
    professor = FuncionarioSerializer(read_only=True)
    disciplina_turma = DisciplinaTurmaSerializer(read_only=True)
    
    professor_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['Funcionario']).Funcionario.objects.all(),
        source='professor',
        write_only=True
    )
    disciplina_turma_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['DisciplinaTurma']).DisciplinaTurma.objects.all(),
        source='disciplina_turma',
        write_only=True
    )
    total_faltas = serializers.SerializerMethodField()
    
    class Meta:
        model = Aula
        fields = [
            'id', 'professor', 'professor_id', 'disciplina_turma', 'disciplina_turma_id',
            'data', 'conteudo', 'numero_aulas', 'total_faltas', 'criado_em'
        ]
        read_only_fields = ['criado_em']
    
    def get_total_faltas(self, obj):
        return obj.faltas.count()


class FaltasSerializer(serializers.ModelSerializer):
    estudante = EstudanteSerializer(read_only=True)
    
    aula_id = serializers.PrimaryKeyRelatedField(
        queryset=Aula.objects.all(),
        source='aula',
        write_only=True
    )
    estudante_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.academic.models', fromlist=['Estudante']).Estudante.objects.all(),
        source='estudante',
        write_only=True
    )
    
    class Meta:
        model = Faltas
        fields = ['id', 'aula', 'aula_id', 'estudante', 'estudante_id', 'aula_numero']
        read_only_fields = ['aula']


class FaltasRegistroSerializer(serializers.Serializer):
    """Serializer para registro em lote de faltas."""
    aula_id = serializers.IntegerField()
    estudantes_ids = serializers.ListField(child=serializers.IntegerField())
    aula_numero = serializers.IntegerField(min_value=1, max_value=4)


class TipoOcorrenciaSerializer(serializers.ModelSerializer):
    gestor = FuncionarioSerializer(read_only=True)
    
    class Meta:
        model = TipoOcorrencia
        fields = ['id', 'gestor', 'texto', 'ativo']


class OcorrenciaPedagogicaSerializer(serializers.ModelSerializer):
    estudante = EstudanteSerializer(read_only=True)
    autor = FuncionarioSerializer(read_only=True)
    tipo = TipoOcorrenciaSerializer(read_only=True)
    
    estudante_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.academic.models', fromlist=['Estudante']).Estudante.objects.all(),
        source='estudante',
        write_only=True
    )
    tipo_id = serializers.PrimaryKeyRelatedField(
        queryset=TipoOcorrencia.objects.all(),
        source='tipo',
        write_only=True
    )
    
    class Meta:
        model = OcorrenciaPedagogica
        fields = [
            'id', 'estudante', 'estudante_id', 'autor',
            'tipo', 'tipo_id', 'data', 'texto'
        ]
        read_only_fields = ['data', 'autor']


class OcorrenciaResponsavelCienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = OcorrenciaResponsavelCiente
        fields = ['id', 'responsavel', 'ocorrencia', 'ciente', 'data_ciencia']
        read_only_fields = ['data_ciencia']


class NotaBimestralSerializer(serializers.ModelSerializer):
    matricula_turma = MatriculaTurmaSerializer(read_only=True)
    disciplina_turma = DisciplinaTurmaSerializer(read_only=True)
    bimestre_display = serializers.CharField(source='get_bimestre_display', read_only=True)
    nota_final = serializers.DecimalField(max_digits=4, decimal_places=2, read_only=True)
    
    matricula_turma_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.academic.models', fromlist=['MatriculaTurma']).MatriculaTurma.objects.all(),
        source='matricula_turma',
        write_only=True
    )
    disciplina_turma_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['DisciplinaTurma']).DisciplinaTurma.objects.all(),
        source='disciplina_turma',
        write_only=True
    )
    
    class Meta:
        model = NotaBimestral
        fields = [
            'id', 'matricula_turma', 'matricula_turma_id',
            'disciplina_turma', 'disciplina_turma_id',
            'bimestre', 'bimestre_display', 'nota', 'nota_recuperacao', 'nota_final'
        ]


class RecuperacaoSerializer(serializers.ModelSerializer):
    matriculas_turma = MatriculaTurmaSerializer(many=True, read_only=True)
    disciplina = DisciplinaSerializer(read_only=True)
    professor = FuncionarioSerializer(read_only=True)
    bimestre_display = serializers.CharField(source='get_bimestre_display', read_only=True)
    
    matriculas_turma_ids = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.academic.models', fromlist=['MatriculaTurma']).MatriculaTurma.objects.all(),
        source='matriculas_turma',
        many=True,
        write_only=True
    )
    disciplina_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['Disciplina']).Disciplina.objects.all(),
        source='disciplina',
        write_only=True
    )
    professor_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['Funcionario']).Funcionario.objects.all(),
        source='professor',
        write_only=True
    )
    
    class Meta:
        model = Recuperacao
        fields = [
            'id', 'matriculas_turma', 'matriculas_turma_ids',
            'disciplina', 'disciplina_id', 'professor', 'professor_id',
            'bimestre', 'bimestre_display', 'data_prova', 'criado_em'
        ]
        read_only_fields = ['criado_em']


class NotificacaoRecuperacaoSerializer(serializers.ModelSerializer):
    recuperacao = RecuperacaoSerializer(read_only=True)
    estudante = EstudanteSerializer(read_only=True)
    
    class Meta:
        model = NotificacaoRecuperacao
        fields = ['id', 'recuperacao', 'estudante', 'visualizado', 'data_visualizacao']
        read_only_fields = ['data_visualizacao']

