"""
View para Notificações de Recuperação
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from apps.pedagogical.models import NotificacaoRecuperacao
from apps.pedagogical.serializers import NotificacaoRecuperacaoSerializer


class NotificacaoRecuperacaoViewSet(viewsets.ModelViewSet):
    queryset = NotificacaoRecuperacao.objects.select_related(
        'professor_disciplina_turma__disciplina_turma__disciplina', 'estudante__usuario'
    )
    serializer_class = NotificacaoRecuperacaoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['estudante', 'visualizado']
    
    @action(detail=True, methods=['post'])
    def marcar_visualizado(self, request, pk=None):
        """Marca a notificação como visualizada."""
        obj = self.get_object()
        obj.visualizado = True
        obj.data_visualizacao = timezone.now()
        obj.save()
        return Response(NotificacaoRecuperacaoSerializer(obj).data)
