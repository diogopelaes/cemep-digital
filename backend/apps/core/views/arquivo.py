from rest_framework import viewsets, mixins, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from apps.core.models import Arquivo
from apps.core.serializers.arquivo import ArquivoSerializer
from core_project.permissions import Policy, AUTHENTICATED, OWNER, FUNCIONARIO, GESTAO

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
    
    Permissões:
    - Create: Qualquer autenticado
    - Read: Dono OU Funcionário (protege dados sensíveis como fotos de estudantes)
    - Delete: Dono OU Gestão
    """
    queryset = Arquivo.objects.all()
    serializer_class = ArquivoSerializer
    
    permission_classes = [Policy(
        create=AUTHENTICATED,
        read=[OWNER, FUNCIONARIO],
        update=OWNER,
        delete=[OWNER, GESTAO],
    )]


    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        """Associa o usuário logado ao arquivo criado."""
        serializer.save(criado_por=self.request.user)

    def perform_destroy(self, instance):
        """Garante que o usuário seja passado para a validação no model."""
        instance.delete(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """
        Deleção de arquivo com validação de propriedade.
        """
        # A própria lógica do model.delete(user=request.user) já valida,
        # mas mantemos o check aqui para retornar 403 explicitamente se preferir.
        return super().destroy(request, *args, **kwargs)
