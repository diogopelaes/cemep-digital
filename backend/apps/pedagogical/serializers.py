"""
Serializers para o App Pedagogical
"""
from rest_framework import serializers
from .models import (
    PlanoAula, Aula, Faltas, DescritorOcorrenciaPedagogica, OcorrenciaPedagogica,
    OcorrenciaResponsavelCiente, NotaBimestral, NotificacaoRecuperacao
)
from apps.core.serializers import (
    FuncionarioSerializer, DisciplinaSerializer, TurmaSerializer,
    DisciplinaTurmaSerializer, HabilidadeSerializer, BimestreSerializer
)
from apps.academic.serializers import EstudanteSerializer, MatriculaTurmaSerializer


class PlanoAulaSerializer(serializers.ModelSerializer):
    professor = FuncionarioSerializer(read_only=True)
    disciplina = DisciplinaSerializer(read_only=True)
    turmas = TurmaSerializer(many=True, read_only=True)
    habilidades = HabilidadeSerializer(many=True, read_only=True)
    bimestre = BimestreSerializer(read_only=True)
    
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
            'habilidades', 'habilidades_ids', 'bimestre', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_em', 'atualizado_em', 'bimestre']


class AulaSerializer(serializers.ModelSerializer):
    professor_disciplina_turma = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['ProfessorDisciplinaTurma']).ProfessorDisciplinaTurma.objects.all(),
        write_only=True
    )
    professor_disciplina_turma_detail = serializers.SerializerMethodField(read_only=True)
    total_faltas = serializers.SerializerMethodField()
    bimestre = BimestreSerializer(read_only=True)
    
    class Meta:
        model = Aula
        fields = [
            'id', 'professor_disciplina_turma', 'professor_disciplina_turma_detail',
            'data', 'conteudo', 'numero_aulas', 'total_faltas', 'bimestre', 'criado_em'
        ]
        read_only_fields = ['criado_em', 'bimestre']
    
    def get_professor_disciplina_turma_detail(self, obj):
        from apps.core.serializers import ProfessorDisciplinaTurmaSerializer
        return ProfessorDisciplinaTurmaSerializer(obj.professor_disciplina_turma).data
    
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


class DescritorOcorrenciaPedagogicaSerializer(serializers.ModelSerializer):
    gestor = FuncionarioSerializer(read_only=True)
    
    class Meta:
        model = DescritorOcorrenciaPedagogica
        fields = ['id', 'gestor', 'texto', 'ativo']


class OcorrenciaPedagogicaSerializer(serializers.ModelSerializer):
    estudante = EstudanteSerializer(read_only=True)
    autor = FuncionarioSerializer(read_only=True)
    tipo = DescritorOcorrenciaPedagogicaSerializer(read_only=True)
    bimestre = BimestreSerializer(read_only=True)
    
    estudante_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.academic.models', fromlist=['Estudante']).Estudante.objects.all(),
        source='estudante',
        write_only=True
    )
    tipo_id = serializers.PrimaryKeyRelatedField(
        queryset=DescritorOcorrenciaPedagogica.objects.all(),
        source='tipo',
        write_only=True
    )
    
    class Meta:
        model = OcorrenciaPedagogica
        fields = [
            'id', 'estudante', 'estudante_id', 'autor',
            'tipo', 'tipo_id', 'data', 'bimestre'
        ]
        read_only_fields = ['data', 'autor', 'bimestre']


class OcorrenciaResponsavelCienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = OcorrenciaResponsavelCiente
        fields = ['id', 'responsavel', 'ocorrencia', 'ciente', 'data_ciencia']
        read_only_fields = ['data_ciencia']


class NotaBimestralSerializer(serializers.ModelSerializer):
    matricula_turma = MatriculaTurmaSerializer(read_only=True)
    professor_disciplina_turma = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['ProfessorDisciplinaTurma']).ProfessorDisciplinaTurma.objects.all(),
        write_only=True
    )
    professor_disciplina_turma_detail = serializers.SerializerMethodField(read_only=True)
    bimestre = BimestreSerializer(read_only=True)
    
    matricula_turma_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.academic.models', fromlist=['MatriculaTurma']).MatriculaTurma.objects.all(),
        source='matricula_turma',
        write_only=True
    )
    bimestre_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['Bimestre']).Bimestre.objects.all(),
        source='bimestre',
        write_only=True
    )
    
    class Meta:
        model = NotaBimestral
        fields = [
            'id', 'matricula_turma', 'matricula_turma_id',
            'professor_disciplina_turma', 'professor_disciplina_turma_detail',
            'bimestre', 'bimestre_id', 'nota'
        ]

    def get_professor_disciplina_turma_detail(self, obj):
        from apps.core.serializers import ProfessorDisciplinaTurmaSerializer
        return ProfessorDisciplinaTurmaSerializer(obj.professor_disciplina_turma).data


class NotificacaoRecuperacaoSerializer(serializers.ModelSerializer):
    estudante = EstudanteSerializer(read_only=True)
    professor_disciplina_turma = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['ProfessorDisciplinaTurma']).ProfessorDisciplinaTurma.objects.all(),
        write_only=True
    )
    professor_disciplina_turma_detail = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = NotificacaoRecuperacao
        fields = ['id', 'estudante', 'professor_disciplina_turma', 'professor_disciplina_turma_detail', 'visualizado', 'data_visualizacao']
        read_only_fields = ['data_visualizacao']

    def get_professor_disciplina_turma_detail(self, obj):
        from apps.core.serializers import ProfessorDisciplinaTurmaSerializer
        return ProfessorDisciplinaTurmaSerializer(obj.professor_disciplina_turma).data

