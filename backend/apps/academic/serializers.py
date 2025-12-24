"""
Serializers para o App Academic
"""
from rest_framework import serializers
from .models import (
    Estudante, Responsavel, ResponsavelEstudante,
    MatriculaCEMEP, MatriculaTurma, Atestado
)
from apps.users.serializers import UserSerializer, UserCreateSerializer
from apps.core.serializers import CursoSerializer, TurmaSerializer


class EstudanteSerializer(serializers.ModelSerializer):
    usuario = UserSerializer(read_only=True)
    endereco_completo = serializers.CharField(read_only=True)
    nome_exibicao = serializers.SerializerMethodField()
    responsaveis = serializers.SerializerMethodField()
    cursos_matriculados = serializers.SerializerMethodField()
    
    class Meta:
        model = Estudante
        fields = [
            'cpf', 'usuario', 'cpf_formatado', 'cin', 'nome_social', 'nome_exibicao',
            'data_nascimento',
            'bolsa_familia', 'pe_de_meia', 'usa_onibus', 'linha_onibus',
            'permissao_sair_sozinho',
            'logradouro', 'numero', 'bairro', 'cidade', 'estado', 'cep', 'complemento',
            'telefone', 'telefone_formatado', 'endereco_completo', 'responsaveis',
            'cursos_matriculados'
        ]
    
    def get_nome_exibicao(self, obj):
        return obj.nome_social or obj.usuario.get_full_name()
    
    def get_responsaveis(self, obj):
        """Retorna lista de responsáveis vinculados ao estudante."""
        vinculos = ResponsavelEstudante.objects.filter(estudante=obj).select_related(
            'responsavel', 'responsavel__usuario'
        )
        result = []
        for v in vinculos:
            resp = v.responsavel
            result.append({
                'cpf': resp.cpf,
                'cpf_formatado': resp.cpf_formatado,
                'telefone': resp.telefone,
                'telefone_formatado': resp.telefone_formatado,
                'parentesco': v.parentesco,
                'usuario': {
                    'first_name': resp.usuario.first_name if resp.usuario else '',
                    'email': resp.usuario.email if resp.usuario else '',
                }
            })
        return result
    
    def get_cursos_matriculados(self, obj):
        """Retorna lista de cursos em que o estudante está matriculado."""
        from .models import MatriculaCEMEP
        matriculas = MatriculaCEMEP.objects.filter(
            estudante=obj, 
            status='MATRICULADO'
        ).select_related('curso')
        return [
            {
                'sigla': m.curso.sigla,
                'nome': m.curso.nome,
                'numero_matricula': m.numero_matricula
            }
            for m in matriculas
        ]


class EstudanteCreateSerializer(serializers.ModelSerializer):
    # Dados do usuário
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(write_only=True)
    telefone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    cin = serializers.CharField(required=False, allow_blank=True)
    responsavel = serializers.JSONField(required=False, write_only=True)
    
    class Meta:
        model = Estudante
        fields = [
            'username', 'email', 'password', 'first_name', 'telefone',
            'cpf', 'cin', 'nome_social', 'data_nascimento',
            'bolsa_familia', 'pe_de_meia', 'usa_onibus', 'linha_onibus',
            'permissao_sair_sozinho',
            'logradouro', 'numero', 'bairro', 'cidade', 'estado', 'cep', 'complemento',
            'responsavel'
        ]
    
    def create(self, validated_data):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Extrai dados do usuário
        first_name = validated_data.pop('first_name')
        
        user_data = {
            'username': validated_data.pop('username'),
            'email': validated_data.pop('email'),
            'first_name': first_name,
            'last_name': '',
            'telefone': validated_data.pop('telefone', ''),
            'tipo_usuario': 'ESTUDANTE'
        }
        password = validated_data.pop('password')
        
        # Cria o usuário
        user = User(**user_data)
        user.set_password(password)
        user.save()
        
        # Cria o estudante
        estudante = Estudante.objects.create(usuario=user, **validated_data)
        return estudante



class ResponsavelSummarySerializer(serializers.ModelSerializer):
    """Serializer simplificado para exibir dados do responsável aninhado."""
    usuario = UserSerializer(read_only=True)
    
    class Meta:
        model = Responsavel
        fields = ['cpf', 'usuario', 'cpf_formatado', 'telefone', 'telefone_formatado']


class ResponsavelEstudanteSerializer(serializers.ModelSerializer):
    estudante = EstudanteSerializer(read_only=True)
    responsavel = ResponsavelSummarySerializer(read_only=True)
    parentesco_display = serializers.CharField(source='get_parentesco_display', read_only=True)
    
    class Meta:
        model = ResponsavelEstudante
        fields = ['id', 'estudante', 'responsavel', 'parentesco', 'parentesco_display']



class ResponsavelSerializer(serializers.ModelSerializer):
    usuario = UserSerializer(read_only=True)
    estudantes_vinculados = ResponsavelEstudanteSerializer(
        source='responsavelestudante_set',
        many=True,
        read_only=True
    )
    
    class Meta:
        model = Responsavel
        fields = ['cpf', 'usuario', 'cpf_formatado', 'telefone', 'telefone_formatado', 'estudantes_vinculados']


class ResponsavelCreateSerializer(serializers.ModelSerializer):
    # Dados do usuário
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    telefone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    # Vínculo inicial
    estudante_id = serializers.IntegerField(write_only=True)
    parentesco = serializers.CharField(write_only=True)
    
    class Meta:
        model = Responsavel
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name', 'telefone',
            'estudante_id', 'parentesco'
        ]
    
    def create(self, validated_data):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        estudante_id = validated_data.pop('estudante_id')
        parentesco = validated_data.pop('parentesco')
        
        # Extrai dados do usuário
        user_data = {
            'username': validated_data.pop('username'),
            'email': validated_data.pop('email'),
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'telefone': validated_data.pop('telefone', ''),
            'tipo_usuario': 'RESPONSAVEL'
        }
        password = validated_data.pop('password')
        
        # Cria o usuário
        user = User(**user_data)
        user.set_password(password)
        user.save()
        
        # Cria o responsável
        responsavel = Responsavel.objects.create(usuario=user)
        
        # Vincula ao estudante
        estudante = Estudante.objects.get(id=estudante_id)
        ResponsavelEstudante.objects.create(
            responsavel=responsavel,
            estudante=estudante,
            parentesco=parentesco
        )
        
        return responsavel


class MatriculaCEMEPSerializer(serializers.ModelSerializer):
    estudante = EstudanteSerializer(read_only=True)
    curso = CursoSerializer(read_only=True)
    estudante_id = serializers.PrimaryKeyRelatedField(
        queryset=Estudante.objects.all(),
        source='estudante',
        write_only=True
    )
    curso_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['Curso']).Curso.objects.all(),
        source='curso',
        write_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    numero_matricula_formatado = serializers.CharField(read_only=True)
    
    class Meta:
        model = MatriculaCEMEP
        fields = [
            'numero_matricula', 'numero_matricula_formatado', 'estudante', 'estudante_id', 'curso', 'curso_id',
            'data_entrada', 'data_saida', 'status', 'status_display'
        ]


class MatriculaTurmaSerializer(serializers.ModelSerializer):
    matricula_cemep = MatriculaCEMEPSerializer(read_only=True)
    turma = TurmaSerializer(read_only=True)
    matricula_cemep_id = serializers.PrimaryKeyRelatedField(
        queryset=MatriculaCEMEP.objects.all(),
        source='matricula_cemep',
        write_only=True
    )
    turma_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.core.models', fromlist=['Turma']).Turma.objects.all(),
        source='turma',
        write_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = MatriculaTurma
        fields = [
            'id', 'matricula_cemep', 'matricula_cemep_id', 'turma', 'turma_id',
            'data_entrada', 'data_saida', 'status', 'status_display'
        ]


class AtestadoSerializer(serializers.ModelSerializer):
    usuario_alvo = UserSerializer(read_only=True)
    criado_por = UserSerializer(read_only=True)
    usuario_alvo_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('django.contrib.auth', fromlist=['get_user_model']).get_user_model().objects.all(),
        source='usuario_alvo',
        write_only=True
    )
    
    class Meta:
        model = Atestado
        fields = [
            'id', 'usuario_alvo', 'usuario_alvo_id',
            'data_inicio', 'data_fim', 'protocolo_prefeitura',
            'arquivo', 'criado_em', 'criado_por'
        ]
        read_only_fields = ['criado_em', 'criado_por']
    
    def create(self, validated_data):
        validated_data['criado_por'] = self.context['request'].user
        return super().create(validated_data)

