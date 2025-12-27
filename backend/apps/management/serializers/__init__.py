"""
Serializers para o App Management

Re-exporta todos os Serializers para manter compatibilidade.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.management.models import (
    Tarefa, NotificacaoTarefa, ReuniaoHTPC, NotificacaoHTPC,
    Aviso, AvisoVisualizacao
)
from apps.core.models import Funcionario
from apps.core.serializers import FuncionarioSerializer
from apps.users.serializers import UserSerializer


User = get_user_model()


class TarefaSerializer(serializers.ModelSerializer):
    funcionarios = FuncionarioSerializer(many=True, read_only=True)
    criador = UserSerializer(read_only=True)
    funcionarios_ids = serializers.PrimaryKeyRelatedField(
        queryset=Funcionario.objects.all(), source='funcionarios', many=True, write_only=True
    )
    
    class Meta:
        model = Tarefa
        fields = [
            'id', 'titulo', 'descricao', 'prazo', 'funcionarios', 'funcionarios_ids',
            'concluido', 'data_conclusao', 'data_cadastro', 'criador'
        ]
        read_only_fields = ['data_cadastro', 'criador', 'data_conclusao']


class NotificacaoTarefaSerializer(serializers.ModelSerializer):
    tarefa = TarefaSerializer(read_only=True)
    funcionario = FuncionarioSerializer(read_only=True)
    
    class Meta:
        model = NotificacaoTarefa
        fields = ['id', 'tarefa', 'funcionario', 'visualizado', 'data_visualizacao']
        read_only_fields = ['data_visualizacao']


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


class AvisoSerializer(serializers.ModelSerializer):
    criador = FuncionarioSerializer(read_only=True)
    destinatarios = UserSerializer(many=True, read_only=True)
    destinatarios_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='destinatarios', many=True, write_only=True
    )
    
    class Meta:
        model = Aviso
        fields = ['id', 'titulo', 'texto', 'data_aviso', 'criador', 'destinatarios', 'destinatarios_ids']
        read_only_fields = ['data_aviso', 'criador']


class AvisoVisualizacaoSerializer(serializers.ModelSerializer):
    aviso = AvisoSerializer(read_only=True)
    usuario = UserSerializer(read_only=True)
    
    class Meta:
        model = AvisoVisualizacao
        fields = ['id', 'aviso', 'usuario', 'visualizado', 'data_visualizacao']
        read_only_fields = ['data_visualizacao']


__all__ = [
    'TarefaSerializer', 'NotificacaoTarefaSerializer',
    'ReuniaoHTPCSerializer', 'NotificacaoHTPCSerializer',
    'AvisoSerializer', 'AvisoVisualizacaoSerializer',
]
