"""
Serializers para Responsável
"""
from rest_framework import serializers
from apps.academic.models import Estudante, Responsavel, ResponsavelEstudante
from apps.users.serializers import UserSerializer


class ResponsavelSummarySerializer(serializers.ModelSerializer):
    """Serializer simplificado para exibir dados do responsável aninhado."""
    usuario = UserSerializer(read_only=True)
    
    class Meta:
        model = Responsavel
        fields = ['cpf', 'usuario', 'cpf_formatado', 'telefone', 'telefone_formatado']


class ResponsavelEstudanteSerializer(serializers.ModelSerializer):
    # Import local para evitar dependência circular
    from .estudante import EstudanteSerializer
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
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    telefone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
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
        
        user_data = {
            'username': validated_data.pop('username'),
            'email': validated_data.pop('email'),
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'telefone': validated_data.pop('telefone', ''),
            'tipo_usuario': 'RESPONSAVEL'
        }
        password = validated_data.pop('password')
        
        user = User(**user_data)
        user.set_password(password)
        user.save()
        
        responsavel = Responsavel.objects.create(usuario=user)
        
        estudante = Estudante.objects.get(id=estudante_id)
        ResponsavelEstudante.objects.create(
            responsavel=responsavel,
            estudante=estudante,
            parentesco=parentesco
        )
        
        return responsavel
