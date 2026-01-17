"""
Serializer para Atestado
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.academic.models import Atestado
from apps.users.serializers import UserSerializer


User = get_user_model()


class AtestadoSerializer(serializers.ModelSerializer):
    usuario_alvo = UserSerializer(read_only=True)
    criado_por = UserSerializer(read_only=True)
    usuario_alvo_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='usuario_alvo',
        write_only=True
    )

    def is_owner(self, user) -> bool:
        if not user or user.is_anonymous or not user.is_active:
            return False

        return self.criado_por == user
    
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
