"""
Views para o App Management

Re-exporta todos os ViewSets para manter compatibilidade com imports existentes.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from apps.management.models import (
    Tarefa, NotificacaoTarefa, ReuniaoHTPC, NotificacaoHTPC,
    Aviso, AvisoVisualizacao
)
from apps.management.serializers import (
    TarefaSerializer, NotificacaoTarefaSerializer,
    ReuniaoHTPCSerializer, NotificacaoHTPCSerializer,
    AvisoSerializer, AvisoVisualizacaoSerializer
)

from apps.core.models import Funcionario


class TarefaViewSet(viewsets.ModelViewSet):
    """ViewSet de Tarefas. Leitura: Funcionários | Escrita: Gestão"""
    queryset = Tarefa.objects.select_related('criador').prefetch_related('funcionarios__usuario')
    serializer_class = TarefaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['concluido', 'funcionarios']
    
    def perform_create(self, serializer):
        tarefa = serializer.save(criador=self.request.user)
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


class ReuniaoHTPCViewSet(viewsets.ModelViewSet):
    """ViewSet de HTPC. Leitura: Funcionários | Escrita: Gestão"""
    queryset = ReuniaoHTPC.objects.select_related('quem_registrou').prefetch_related('presentes__usuario')
    serializer_class = ReuniaoHTPCSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['data_reuniao']
    
    def perform_create(self, serializer):
        reuniao = serializer.save(quem_registrou=self.request.user)
        funcionarios = Funcionario.objects.filter(ativo=True)
        for funcionario in funcionarios:
            NotificacaoHTPC.objects.create(reuniao=reuniao, funcionario=funcionario)
    
    @action(detail=True, methods=['post'])
    def registrar_presenca(self, request, pk=None):
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
        obj = self.get_object()
        obj.visualizado = True
        obj.data_visualizacao = timezone.now()
        obj.save()
        return Response(NotificacaoHTPCSerializer(obj).data)


class AvisoViewSet(viewsets.ModelViewSet):
    """ViewSet de Avisos. Leitura: Todos autenticados | Escrita: Gestão/Secretaria"""
    queryset = Aviso.objects.select_related('criador__usuario').prefetch_related('destinatarios')
    serializer_class = AvisoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['criador']
    
    def perform_create(self, serializer):
        aviso = serializer.save(criador=self.request.user.funcionario)
        for destinatario in aviso.destinatarios.all():
            AvisoVisualizacao.objects.create(aviso=aviso, usuario=destinatario)
    
    @action(detail=False, methods=['get'])
    def meus_avisos(self, request):
        avisos = self.queryset.filter(destinatarios=request.user)
        return Response(self.get_serializer(avisos, many=True).data)


class AvisoVisualizacaoViewSet(viewsets.ModelViewSet):
    queryset = AvisoVisualizacao.objects.select_related('aviso', 'usuario')
    serializer_class = AvisoVisualizacaoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['usuario', 'visualizado']
    
    @action(detail=True, methods=['post'])
    def marcar_visualizado(self, request, pk=None):
        obj = self.get_object()
        obj.visualizado = True
        obj.data_visualizacao = timezone.now()
        obj.save()
        return Response(AvisoVisualizacaoSerializer(obj).data)


__all__ = [
    'TarefaViewSet', 'NotificacaoTarefaViewSet',
    'ReuniaoHTPCViewSet', 'NotificacaoHTPCViewSet',
    'AvisoViewSet', 'AvisoVisualizacaoViewSet',
]
