from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from apps.users.models import User


class ProtectedImageField(serializers.ImageField):
    """
    Campo de imagem que retorna URL protegida.
    Converte /media/path para /api/v1/media/path
    """
    def to_representation(self, value):
        if not value:
            return None
        
        request = self.context.get('request')
        if request is None:
            # Sem request, retorna o path relativo para a API protegida
            return f'/api/v1/media/{value.name}'
        
        # Com request, retorna URL absoluta
        return request.build_absolute_uri(f'/api/v1/media/{value.name}')


class UserSerializer(serializers.ModelSerializer):
    """Serializer completo do usuário."""
    foto = ProtectedImageField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'tipo_usuario', 'foto', 'dark_mode', 'ano_letivo_selecionado',
            'bimestre_atual', 'is_active', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'ano_letivo_selecionado', 'bimestre_atual']

    ano_letivo_selecionado = serializers.IntegerField(source='get_ano_letivo_selecionado', read_only=True)
    bimestre_atual = serializers.SerializerMethodField()

    def get_bimestre_atual(self, obj):
        from apps.core.models import AnoLetivo, AnoLetivoSelecionado
        try:
            # Tenta pegar o ano selecionado pelo usuário
            selecao = obj.ano_letivo_selecionado
            ano_letivo = selecao.ano_letivo
        except Exception:
            # Caso não tenha selecionado, pega o ano ativo do sistema
            ano_letivo = AnoLetivo.objects.filter(is_active=True).first()
        
        if ano_letivo:
            return ano_letivo.bimestre()
        return None


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
