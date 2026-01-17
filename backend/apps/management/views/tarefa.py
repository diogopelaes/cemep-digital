from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from apps.management.models import Tarefa, NotificacaoTarefa
from apps.management.serializers import TarefaSerializer, NotificacaoTarefaSerializer


class TarefaViewSet(viewsets.ModelViewSet):
    """ViewSet de Tarefas. Leitura: Funcionários | Escrita: Gestão"""
    queryset = Tarefa.objects.select_related('criado_por').prefetch_related('funcionarios__usuario')
    serializer_class = TarefaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['concluido', 'funcionarios']
    
    def perform_create(self, serializer):
        tarefa = serializer.save(criado_por=self.request.user)
        for funcionario in tarefa.funcionarios.all():
            NotificacaoTarefa.objects.create(tarefa=tarefa, funcionario=funcionario)
    
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
            return Response([])
        tarefas = self.queryset.filter(funcionarios=request.user.funcionario)
        return Response(self.get_serializer(tarefas, many=True).data)
    
    @action(detail=False, methods=['get'])
    def relatorio(self, request):
        """Relatório de tarefas concluídas/pendentes."""
        total = self.queryset.count()
        concluidas = self.queryset.filter(concluido=True).count()
        atrasadas = self.queryset.filter(concluido=False, prazo__lt=timezone.now()).count()
        return Response({
            'total': total, 'concluidas': concluidas,
            'pendentes': total - concluidas, 'atrasadas': atrasadas
        })


class NotificacaoTarefaViewSet(viewsets.ModelViewSet):
    queryset = NotificacaoTarefa.objects.select_related('tarefa', 'funcionario__usuario')
    serializer_class = NotificacaoTarefaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['funcionario', 'visualizado']
    
    @action(detail=True, methods=['post'])
    def marcar_visualizado(self, request, pk=None):
        obj = self.get_object()
        obj.visualizado = True
        obj.data_visualizacao = timezone.now()
        obj.save()
        return Response(NotificacaoTarefaSerializer(obj).data)
    
    @action(detail=False, methods=['get'])
    def minhas_notificacoes(self, request):
        if not hasattr(request.user, 'funcionario'):
            return Response([])
        notificacoes = self.queryset.filter(funcionario=request.user.funcionario, visualizado=False)
        return Response(self.get_serializer(notificacoes, many=True).data)
