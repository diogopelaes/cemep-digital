"""
Views para o App Management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q

from .models import (
    Tarefa, NotificacaoTarefa, ReuniaoHTPC, NotificacaoHTPC,
    Aviso, AvisoVisualizacao
)
from .serializers import (
    TarefaSerializer, NotificacaoTarefaSerializer,
    ReuniaoHTPCSerializer, NotificacaoHTPCSerializer,
    AvisoSerializer, AvisoVisualizacaoSerializer
)
from apps.users.permissions import (
    GestaoWriteFuncionarioReadMixin, FuncionarioMixin, GestaoOnlyMixin,
    GestaoSecretariaWritePublicReadMixin
)
from apps.core.models import Funcionario


class TarefaViewSet(GestaoWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Tarefas. Leitura: Funcionários | Escrita: Gestão"""
    queryset = Tarefa.objects.select_related('criador').prefetch_related('funcionarios__usuario')
    serializer_class = TarefaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['concluido', 'funcionarios']
    
    def perform_create(self, serializer):
        tarefa = serializer.save(criador=self.request.user)
        
        # Cria notificações para os funcionários
        for funcionario in tarefa.funcionarios.all():
            NotificacaoTarefa.objects.create(
                tarefa=tarefa,
                funcionario=funcionario
            )
    
    @action(detail=True, methods=['post'])
    def concluir(self, request, pk=None):
        """Marca a tarefa como concluída."""
        tarefa = self.get_object()
        tarefa.concluido = True
        tarefa.data_conclusao = timezone.now()
        tarefa.save()
        return Response(TarefaSerializer(tarefa).data)
    
    @action(detail=False, methods=['get'])
    def minhas_tarefas(self, request):
        """Retorna as tarefas do funcionário logado."""
        if not hasattr(request.user, 'funcionario'):
            return Response([])  # Retorna lista vazia se não é funcionário
        
        tarefas = self.queryset.filter(funcionarios=request.user.funcionario)
        serializer = self.get_serializer(tarefas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def relatorio(self, request):
        """Relatório de tarefas concluídas/pendentes."""
        total = self.queryset.count()
        concluidas = self.queryset.filter(concluido=True).count()
        pendentes = total - concluidas
        atrasadas = self.queryset.filter(concluido=False, prazo__lt=timezone.now()).count()
        
        return Response({
            'total': total,
            'concluidas': concluidas,
            'pendentes': pendentes,
            'atrasadas': atrasadas
        })


class NotificacaoTarefaViewSet(viewsets.ModelViewSet):
    queryset = NotificacaoTarefa.objects.select_related('tarefa', 'funcionario__usuario')
    serializer_class = NotificacaoTarefaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['funcionario', 'visualizado']
    
    @action(detail=True, methods=['post'])
    def marcar_visualizado(self, request, pk=None):
        """Marca a notificação como visualizada."""
        obj = self.get_object()
        obj.visualizado = True
        obj.data_visualizacao = timezone.now()
        obj.save()
        return Response(NotificacaoTarefaSerializer(obj).data)
    
    @action(detail=False, methods=['get'])
    def minhas_notificacoes(self, request):
        """Retorna as notificações do funcionário logado."""
        if not hasattr(request.user, 'funcionario'):
            return Response([])  # Retorna lista vazia se não é funcionário
        
        notificacoes = self.queryset.filter(
            funcionario=request.user.funcionario,
            visualizado=False
        )
        serializer = self.get_serializer(notificacoes, many=True)
        return Response(serializer.data)


class ReuniaoHTPCViewSet(GestaoWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de HTPC. Leitura: Funcionários | Escrita: Gestão"""
    queryset = ReuniaoHTPC.objects.select_related('quem_registrou').prefetch_related('presentes__usuario')
    serializer_class = ReuniaoHTPCSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['data_reuniao']
    
    def perform_create(self, serializer):
        reuniao = serializer.save(quem_registrou=self.request.user)
        
        # Cria notificações para todos os funcionários ativos
        funcionarios = Funcionario.objects.filter(ativo=True)
        for funcionario in funcionarios:
            NotificacaoHTPC.objects.create(
                reuniao=reuniao,
                funcionario=funcionario
            )
    
    @action(detail=True, methods=['post'])
    def registrar_presenca(self, request, pk=None):
        """Registra a presença de funcionários na reunião."""
        reuniao = self.get_object()
        funcionarios_ids = request.data.get('funcionarios_ids', [])
        
        funcionarios = Funcionario.objects.filter(id__in=funcionarios_ids)
        reuniao.presentes.set(funcionarios)
        
        return Response(ReuniaoHTPCSerializer(reuniao).data)


class NotificacaoHTPCViewSet(viewsets.ModelViewSet):
    queryset = NotificacaoHTPC.objects.select_related('reuniao', 'funcionario__usuario')
    serializer_class = NotificacaoHTPCSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['funcionario', 'visualizado']
    
    @action(detail=True, methods=['post'])
    def marcar_visualizado(self, request, pk=None):
        """Marca a notificação como visualizada."""
        obj = self.get_object()
        obj.visualizado = True
        obj.data_visualizacao = timezone.now()
        obj.save()
        return Response(NotificacaoHTPCSerializer(obj).data)


class AvisoViewSet(GestaoSecretariaWritePublicReadMixin, viewsets.ModelViewSet):
    """ViewSet de Avisos. Leitura: Todos autenticados | Escrita: Gestão/Secretaria"""
    queryset = Aviso.objects.select_related('criador__usuario').prefetch_related('destinatarios')
    serializer_class = AvisoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['criador']
    
    def perform_create(self, serializer):
        aviso = serializer.save(criador=self.request.user.funcionario)
        
        # Cria registros de visualização para os destinatários
        for destinatario in aviso.destinatarios.all():
            AvisoVisualizacao.objects.create(
                aviso=aviso,
                usuario=destinatario
            )
    
    @action(detail=False, methods=['get'])
    def meus_avisos(self, request):
        """Retorna os avisos do usuário logado."""
        avisos = self.queryset.filter(destinatarios=request.user)
        serializer = self.get_serializer(avisos, many=True)
        return Response(serializer.data)


class AvisoVisualizacaoViewSet(viewsets.ModelViewSet):
    queryset = AvisoVisualizacao.objects.select_related('aviso', 'usuario')
    serializer_class = AvisoVisualizacaoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['usuario', 'visualizado']
    
    @action(detail=True, methods=['post'])
    def marcar_visualizado(self, request, pk=None):
        """Marca o aviso como visualizado."""
        obj = self.get_object()
        obj.visualizado = True
        obj.data_visualizacao = timezone.now()
        obj.save()
        return Response(AvisoVisualizacaoSerializer(obj).data)

