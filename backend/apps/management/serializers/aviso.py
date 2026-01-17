"""
Serializers para Avisos e Visualizações de Aviso.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.management.models import Aviso, AvisoVisualizacao
from apps.core.serializers import FuncionarioSerializer
from apps.users.serializers import UserSerializer


User = get_user_model()


class AvisoSerializer(serializers.ModelSerializer):
    criado_por = FuncionarioSerializer(read_only=True)
    destinatarios = UserSerializer(many=True, read_only=True)
    destinatarios_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='destinatarios', many=True, write_only=True
    )
    
    class Meta:
        model = Aviso
        fields = ['id', 'titulo', 'texto', 'data_aviso', 'criado_por', 'destinatarios', 'destinatarios_ids']
        read_only_fields = ['data_aviso', 'criado_por']


class AvisoVisualizacaoSerializer(serializers.ModelSerializer):
    aviso = AvisoSerializer(read_only=True)
    usuario = UserSerializer(read_only=True)
    
    class Meta:
        model = AvisoVisualizacao
        fields = ['id', 'aviso', 'usuario', 'visualizado', 'data_visualizacao']
        read_only_fields = ['data_visualizacao']
