from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from apps.users.models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer completo do usuário."""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'tipo_usuario', 'foto', 'dark_mode', 'ano_letivo_selecionado',
            'is_active', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'ano_letivo_selecionado']

    ano_letivo_selecionado = serializers.IntegerField(source='get_ano_letivo_selecionado', read_only=True)


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de usuário."""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'tipo_usuario'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password': 'As senhas não coincidem.'})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualização de usuário."""
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'foto', 'dark_mode']
