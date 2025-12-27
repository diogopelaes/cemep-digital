"""
View para Atestado
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.http import FileResponse

from apps.academic.models import Atestado
from apps.academic.serializers import AtestadoSerializer
from apps.users.permissions import GestaoSecretariaWriteFuncionarioReadMixin


class AtestadoViewSet(GestaoSecretariaWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Atestados. Leitura: Funcionários | Escrita: Gestão/Secretaria"""
    queryset = Atestado.objects.select_related('usuario_alvo', 'criado_por').all()
    serializer_class = AtestadoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['usuario_alvo']
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download protegido do arquivo do atestado."""
        atestado = self.get_object()
        
        user = request.user
        if user.tipo_usuario not in ['GESTAO', 'SECRETARIA']:
            if hasattr(user, 'estudante') and atestado.usuario_alvo != user:
                return Response(
                    {'error': 'Acesso não autorizado'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return FileResponse(
            atestado.arquivo.open('rb'),
            as_attachment=True,
            filename=atestado.arquivo.name.split('/')[-1]
        )
