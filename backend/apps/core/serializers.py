"""
Serializers para o App Core
"""
from rest_framework import serializers
from .models import (
    Funcionario, PeriodoTrabalho, Disciplina, Curso, Turma,
    DisciplinaTurma, ProfessorDisciplinaTurma, CalendarioEscolar, Habilidade, Bimestre
)
from apps.users.serializers import UserSerializer


class FuncionarioSerializer(serializers.ModelSerializer):
    usuario = UserSerializer(read_only=True)
    nome_completo = serializers.CharField(source='usuario.get_full_name', read_only=True)
    data_entrada = serializers.SerializerMethodField()
    
    class Meta:
        model = Funcionario
        fields = ['id', 'usuario', 'nome_completo', 'matricula', 'area_atuacao', 'apelido', 'data_entrada']
    
    def get_data_entrada(self, obj):
        """Retorna a data de entrada do primeiro período de trabalho."""
        periodo = obj.periodos_trabalho.order_by('data_entrada').first()
        return periodo.data_entrada if periodo else None


class FuncionarioCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Funcionario
        fields = ['usuario', 'matricula', 'area_atuacao', 'apelido']


class FuncionarioCompletoSerializer(serializers.Serializer):
    """Serializer para criar usuário e funcionário em uma única operação."""
    
    # Dados do usuário
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    nome = serializers.CharField(max_length=150)
    telefone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    tipo_usuario = serializers.ChoiceField(choices=[
        ('GESTAO', 'Gestão'),
        ('SECRETARIA', 'Secretaria'),
        ('PROFESSOR', 'Professor'),
        ('MONITOR', 'Monitor'),
    ])
    
    # Dados do funcionário
    matricula = serializers.IntegerField(min_value=1)
    area_atuacao = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    apelido = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    data_entrada = serializers.DateField()
    
    def validate_username(self, value):
        from apps.users.models import User
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Este nome de usuário já está em uso.')
        return value
    
    def validate_matricula(self, value):
        if Funcionario.objects.filter(matricula=value).exists():
            raise serializers.ValidationError('Este número de matrícula já está em uso.')
        return value
    
    def validate_email(self, value):
        from apps.users.models import User
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Este e-mail já está em uso.')
        return value


class FuncionarioUpdateSerializer(serializers.Serializer):
    """Serializer para atualizar funcionário e dados relacionados."""
    
    # Dados do usuário
    email = serializers.EmailField(required=False, allow_blank=True)
    nome = serializers.CharField(max_length=150)
    telefone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    tipo_usuario = serializers.ChoiceField(choices=[
        ('GESTAO', 'Gestão'),
        ('SECRETARIA', 'Secretaria'),
        ('PROFESSOR', 'Professor'),
        ('MONITOR', 'Monitor'),
    ])
    
    # Dados do funcionário
    matricula = serializers.IntegerField(min_value=1)
    area_atuacao = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    apelido = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    data_entrada = serializers.DateField()
    
    def validate_matricula(self, value):
        funcionario = self.context.get('funcionario')
        if funcionario and Funcionario.objects.filter(matricula=value).exclude(id=funcionario.id).exists():
            raise serializers.ValidationError('Este número de matrícula já está em uso.')
        return value
    
    def validate_email(self, value):
        from apps.users.models import User
        funcionario = self.context.get('funcionario')
        if value and funcionario:
            if User.objects.filter(email=value).exclude(id=funcionario.usuario.id).exists():
                raise serializers.ValidationError('Este e-mail já está em uso.')
        return value


class PeriodoTrabalhoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodoTrabalho
        fields = ['id', 'funcionario', 'data_entrada', 'data_saida']


class DisciplinaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disciplina
        fields = ['id', 'nome', 'sigla']


class CursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curso
        fields = ['id', 'nome', 'sigla']


class TurmaSerializer(serializers.ModelSerializer):
    curso = CursoSerializer(read_only=True)
    curso_id = serializers.PrimaryKeyRelatedField(
        queryset=Curso.objects.all(),
        source='curso',
        write_only=True
    )
    nome_completo = serializers.CharField(read_only=True)
    disciplinas_count = serializers.SerializerMethodField()
    estudantes_count = serializers.SerializerMethodField()
    professores_representantes = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Funcionario.objects.all(),
        required=False
    )
    professores_representantes_details = FuncionarioSerializer(
        source='professores_representantes',
        many=True,
        read_only=True
    )
    
    class Meta:
        model = Turma
        fields = [
            'id', 'numero', 'letra', 'ano_letivo', 'nomenclatura',
            'curso', 'curso_id', 'nome_completo', 'disciplinas_count', 'estudantes_count',
            'professores_representantes', 'professores_representantes_details'
        ]
    
    def get_disciplinas_count(self, obj):
        return obj.disciplinas_vinculadas.count()
    
    def get_estudantes_count(self, obj):
        """Conta apenas estudantes com matrícula status CURSANDO."""
        return obj.matriculas.filter(status='CURSANDO').count()


class DisciplinaTurmaSerializer(serializers.ModelSerializer):
    disciplina = DisciplinaSerializer(read_only=True)
    turma = TurmaSerializer(read_only=True)
    disciplina_id = serializers.PrimaryKeyRelatedField(
        queryset=Disciplina.objects.all(),
        source='disciplina',
        write_only=True
    )
    turma_id = serializers.PrimaryKeyRelatedField(
        queryset=Turma.objects.all(),
        source='turma',
        write_only=True
    )
    
    class Meta:
        model = DisciplinaTurma
        fields = ['id', 'disciplina', 'turma', 'disciplina_id', 'turma_id', 'aulas_semanais']


class ProfessorDisciplinaTurmaSerializer(serializers.ModelSerializer):
    professor = FuncionarioSerializer(read_only=True)
    disciplina_turma = DisciplinaTurmaSerializer(read_only=True)
    professor_id = serializers.PrimaryKeyRelatedField(
        queryset=Funcionario.objects.all(),
        source='professor',
        write_only=True
    )
    disciplina_turma_id = serializers.PrimaryKeyRelatedField(
        queryset=DisciplinaTurma.objects.all(),
        source='disciplina_turma',
        write_only=True
    )
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    
    class Meta:
        model = ProfessorDisciplinaTurma
        fields = [
            'id', 'professor', 'disciplina_turma', 'professor_id', 'disciplina_turma_id',
            'tipo', 'tipo_display', 'data_inicio', 'data_fim'
        ]
    
    def validate_professor_id(self, value):
        """Valida que o funcionário é do tipo PROFESSOR."""
        if value.usuario.tipo_usuario != 'PROFESSOR':
            raise serializers.ValidationError(
                'Apenas funcionários do tipo PROFESSOR podem ser atribuídos.'
            )
        return value
    
    def validate(self, data):
        """Valida que data_fim não é anterior a data_inicio."""
        data_inicio = data.get('data_inicio')
        data_fim = data.get('data_fim')
        
        if data_inicio and data_fim and data_fim < data_inicio:
            raise serializers.ValidationError({
                'data_fim': 'A data de fim não pode ser anterior à data de início.'
            })
        
        return data


class BimestreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bimestre
        fields = ['id', 'numero', 'data_inicio', 'data_fim', 'ano_letivo']


class CalendarioEscolarSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    
    class Meta:
        model = CalendarioEscolar
        fields = ['id', 'data', 'letivo', 'tipo', 'tipo_display', 'descricao']


class HabilidadeSerializer(serializers.ModelSerializer):
    disciplina = DisciplinaSerializer(read_only=True)
    disciplina_id = serializers.PrimaryKeyRelatedField(
        queryset=Disciplina.objects.all(),
        source='disciplina',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Habilidade
        fields = ['id', 'codigo', 'descricao', 'disciplina', 'disciplina_id']

