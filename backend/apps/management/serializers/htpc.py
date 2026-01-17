"""
Serializers para Reuniões HTPC e Notificações de HTPC.
"""
from rest_framework import serializers
from apps.management.models import ReuniaoHTPC, NotificacaoHTPC
from apps.core.models import Funcionario
from apps.core.serializers import FuncionarioSerializer
from apps.users.serializers import UserSerializer


class ReuniaoHTPCSerializer(serializers.ModelSerializer):
    presentes = FuncionarioSerializer(many=True, read_only=True)
    quem_registrou = UserSerializer(read_only=True)
    presentes_ids = serializers.PrimaryKeyRelatedField(
        queryset=Funcionario.objects.all(), source='presentes', many=True, write_only=True, required=False
    )
    
    class Meta:
        model = ReuniaoHTPC
        fields = [
            'id', 'data_reuniao', 'pauta', 'ata', 'presentes', 'presentes_ids',
            'data_registro', 'quem_registrou'
        ]
        read_only_fields = ['data_registro', 'quem_registrou']


class NotificacaoHTPCSerializer(serializers.ModelSerializer):
    reuniao = ReuniaoHTPCSerializer(read_only=True)
    funcionario = FuncionarioSerializer(read_only=True)
    
    class Meta:
        model = NotificacaoHTPC
        fields = ['id', 'reuniao', 'funcionario', 'visualizado', 'data_visualizacao']
        read_only_fields = ['data_visualizacao']
