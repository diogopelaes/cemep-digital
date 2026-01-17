"""
Serializers para Tarefas e Notificações de Tarefa.
"""
from rest_framework import serializers
from apps.management.models import Tarefa, NotificacaoTarefa
from apps.core.models import Funcionario
from apps.core.serializers import FuncionarioSerializer
from apps.users.serializers import UserSerializer


class TarefaSerializer(serializers.ModelSerializer):
    funcionarios = FuncionarioSerializer(many=True, read_only=True)
    criado_por = UserSerializer(read_only=True)
    funcionarios_ids = serializers.PrimaryKeyRelatedField(
        queryset=Funcionario.objects.all(), source='funcionarios', many=True, write_only=True
    )
    
    class Meta:
        model = Tarefa
        fields = [
            'id', 'titulo', 'descricao', 'prazo', 'funcionarios', 'funcionarios_ids',
            'concluido', 'data_conclusao', 'data_cadastro', 'criado_por'
        ]
        read_only_fields = ['data_cadastro', 'criado_por', 'data_conclusao']


class NotificacaoTarefaSerializer(serializers.ModelSerializer):
    tarefa = TarefaSerializer(read_only=True)
    funcionario = FuncionarioSerializer(read_only=True)
    
    class Meta:
        model = NotificacaoTarefa
        fields = ['id', 'tarefa', 'funcionario', 'visualizado', 'data_visualizacao']
        read_only_fields = ['data_visualizacao']
