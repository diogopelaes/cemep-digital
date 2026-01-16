from rest_framework import viewsets, mixins, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.models import Arquivo
from apps.core.serializers.arquivo import ArquivoSerializer

class ArquivoViewSet(mixins.CreateModelMixin,
                     mixins.RetrieveModelMixin,
                     mixins.DestroyModelMixin,
                     viewsets.GenericViewSet):
    """
    ViewSet para upload e gerenciamento de arquivos.
    
    Endpoints:
    - POST /api/core/arquivos/ (Upload)
    - GET /api/core/arquivos/{id}/ (Detalhes)
    - DELETE /api/core/arquivos/{id}/ (Remoção)
    """
    queryset = Arquivo.objects.all()
    serializer_class = ArquivoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        """Associa o usuário logado ao arquivo criado."""
        serializer.save(criado_por=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """
        Permite deletar apenas arquivos que o usuário criou, 
        ou se o usuário tiver permissão especial (implementar futuramente se necessário).
        """
        instance = self.get_object()
        if instance.criado_por != request.user:
             return Response(
                 {"detail": "Você não tem permissão para excluir este arquivo."}, 
                 status=status.HTTP_403_FORBIDDEN
             )
        return super().destroy(request, *args, **kwargs)
