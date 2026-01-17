from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from apps.management.models import ReuniaoHTPC, NotificacaoHTPC
from apps.management.serializers import ReuniaoHTPCSerializer, NotificacaoHTPCSerializer
from apps.core.models import Funcionario
from core_project.permissions import Policy, GESTAO, FUNCIONARIO, OWNER, NONE


class ReuniaoHTPCViewSet(viewsets.ModelViewSet):
    """ViewSet de HTPC. Leitura: Funcionários | Escrita: Gestão"""
    queryset = ReuniaoHTPC.objects.select_related('quem_registrou').prefetch_related('presentes__usuario')
    serializer_class = ReuniaoHTPCSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['data_reuniao']
    
    permission_classes = [Policy(
        create=[GESTAO],
        read=[FUNCIONARIO],
        update=[GESTAO],
        delete=[GESTAO],
        custom={
            'registrar_presenca': [GESTAO]
        }
    )]
    
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
    
    permission_classes = [Policy(
        create=NONE,
        read=[FUNCIONARIO],
        update=[FUNCIONARIO],
        delete=NONE,
        custom={
            'marcar_visualizado': OWNER
        }
    )]

    
    @action(detail=True, methods=['post'])
    def marcar_visualizado(self, request, pk=None):
        obj = self.get_object()
        obj.visualizado = True
        obj.data_visualizacao = timezone.now()
        obj.save()
        return Response(NotificacaoHTPCSerializer(obj).data)
