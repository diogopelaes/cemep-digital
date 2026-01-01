"""
Serializers para Estudante
"""
from rest_framework import serializers
from apps.academic.models import Estudante, ResponsavelEstudante
from apps.users.serializers import UserSerializer


class EstudanteSerializer(serializers.ModelSerializer):
    usuario = UserSerializer(read_only=True)
    endereco_completo = serializers.CharField(read_only=True)
    nome_exibicao = serializers.SerializerMethodField()
    responsaveis = serializers.SerializerMethodField()
    cursos_matriculados = serializers.SerializerMethodField()
    
    class Meta:
        model = Estudante
        fields = [
            'id', 'cpf', 'usuario', 'cpf_formatado', 'cin', 'nome_social', 'nome_exibicao',
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
        from apps.academic.models import MatriculaCEMEP
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
        
        user = User(**user_data)
        user.set_password(password)
        user.save()
        
        estudante = Estudante.objects.create(usuario=user, **validated_data)
        return estudante
