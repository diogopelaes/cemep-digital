from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from apps.management.models import Aviso, AvisoVisualizacao
from apps.management.serializers import AvisoSerializer, AvisoVisualizacaoSerializer


class AvisoViewSet(viewsets.ModelViewSet):
    """ViewSet de Avisos. Leitura: Todos autenticados | Escrita: Gestão/Secretaria"""
    queryset = Aviso.objects.select_related('criado_por__usuario').prefetch_related('destinatarios')
    serializer_class = AvisoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['criado_por']
    
    def perform_create(self, serializer):
        aviso = serializer.save(criado_por=self.request.user.funcionario)
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
