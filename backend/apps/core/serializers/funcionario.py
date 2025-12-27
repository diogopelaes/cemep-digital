"""
Serializers para Funcionário
"""
from rest_framework import serializers
from apps.core.models import Funcionario
from apps.users.serializers import UserSerializer


class FuncionarioSerializer(serializers.ModelSerializer):
    usuario = UserSerializer(read_only=True)
    nome_completo = serializers.CharField(source='usuario.get_full_name', read_only=True)
    data_entrada = serializers.SerializerMethodField()
    
    class Meta:
        model = Funcionario
        fields = [
            'id', 'usuario', 'nome_completo', 'matricula', 'area_atuacao', 'apelido', 'data_entrada', 'data_admissao',
            'cpf', 'cin', 'nome_social', 'data_nascimento', 'telefone',
            'logradouro', 'numero', 'bairro', 'cidade', 'estado', 'cep', 'complemento'
        ]
    
    def get_data_entrada(self, obj):
        """Retorna a data de entrada do primeiro período de trabalho."""
        periodo = obj.periodos_trabalho.order_by('data_entrada').first()
        return periodo.data_entrada if periodo else None


class FuncionarioCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Funcionario
        fields = [
            'usuario', 'matricula', 'area_atuacao', 'apelido', 'data_admissao',
            'cpf', 'cin', 'nome_social', 'data_nascimento', 'telefone',
            'logradouro', 'numero', 'bairro', 'cidade', 'estado', 'cep', 'complemento'
        ]


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

    # Dados pessoais extras
    cpf = serializers.CharField(max_length=14, required=False, allow_blank=True)
    cin = serializers.CharField(max_length=20, required=False, allow_blank=True)
    nome_social = serializers.CharField(max_length=255, required=False, allow_blank=True)
    data_nascimento = serializers.DateField(required=False, allow_null=True)
    
    # Endereço
    logradouro = serializers.CharField(max_length=255, required=False, allow_blank=True)
    numero = serializers.CharField(max_length=10, required=False, allow_blank=True)
    bairro = serializers.CharField(max_length=100, required=False, allow_blank=True)
    cidade = serializers.CharField(max_length=100, required=False, allow_blank=True)
    estado = serializers.CharField(max_length=2, required=False, allow_blank=True)
    cep = serializers.CharField(max_length=8, required=False, allow_blank=True)
    complemento = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Data de admissão
    data_admissao = serializers.DateField(required=False, allow_null=True)
    
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

    # Dados pessoais extras
    cpf = serializers.CharField(max_length=14, required=False, allow_blank=True)
    cin = serializers.CharField(max_length=20, required=False, allow_blank=True)
    nome_social = serializers.CharField(max_length=255, required=False, allow_blank=True)
    data_nascimento = serializers.DateField(required=False, allow_null=True)
    
    # Endereço
    logradouro = serializers.CharField(max_length=255, required=False, allow_blank=True)
    numero = serializers.CharField(max_length=10, required=False, allow_blank=True)
    bairro = serializers.CharField(max_length=100, required=False, allow_blank=True)
    cidade = serializers.CharField(max_length=100, required=False, allow_blank=True)
    estado = serializers.CharField(max_length=2, required=False, allow_blank=True)
    cep = serializers.CharField(max_length=8, required=False, allow_blank=True)
    complemento = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Data de admissão
    data_admissao = serializers.DateField(required=False, allow_null=True)
    
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
