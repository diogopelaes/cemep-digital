"""
View para AnoLetivoSelecionado
"""
from rest_framework import viewsets, status
from rest_framework.response import Response

from apps.core.models import AnoLetivoSelecionado, AnoLetivo
from apps.core.serializers import AnoLetivoSelecionadoSerializer
from core_project.permissions import Policy, AUTHENTICATED, NONE


class AnoLetivoSelecionadoViewSet(viewsets.ViewSet):
    """
    ViewSet para gerenciar o ano letivo selecionado pelo usuário.
    
    Permissões: Qualquer usuário autenticado pode ler/atualizar sua própria seleção.
    
    GET /core/ano-letivo-selecionado/ - Retorna o ano selecionado do usuário
    POST /core/ano-letivo-selecionado/ - Atualiza o ano selecionado
    """
    permission_classes = [Policy(
        create=AUTHENTICATED,
        read=AUTHENTICATED,
        update=AUTHENTICATED,
        delete=NONE,
    )]


    def list(self, request):
        """Retorna o ano letivo selecionado do usuário atual."""
        # Garante que existe uma seleção ou cria a padrão
        ano_ativo = AnoLetivo.objects.filter(is_active=True).first()
        if not ano_ativo:
            # Tenta buscar qualquer ano se não tiver um ativo marcado, apenas para não quebrar (fallback de segurança)
            ano_ativo = AnoLetivo.objects.order_by('-ano').first()
            
            if not ano_ativo:
                 return Response(
                    {'detail': 'Nenhum ano letivo encontrado.'},
                    status=status.HTTP_404_NOT_FOUND
                )

        selecionado, created = AnoLetivoSelecionado.objects.get_or_create(
            usuario=request.user,
            defaults={'ano_letivo': ano_ativo}
        )
        
        serializer = AnoLetivoSelecionadoSerializer(selecionado)
        return Response(serializer.data)

    def create(self, request):
        """Atualiza o ano letivo selecionado do usuário."""
        ano_letivo_id = request.data.get('ano_letivo_id')
        
        if not ano_letivo_id:
            return Response(
                {'detail': 'ano_letivo_id é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ano_letivo = AnoLetivo.objects.get(pk=ano_letivo_id)
        except AnoLetivo.DoesNotExist:
            return Response(
                {'detail': 'Ano letivo não encontrado.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        selecionado, created = AnoLetivoSelecionado.objects.update_or_create(
            usuario=request.user,
            defaults={'ano_letivo': ano_letivo}
        )
        
        serializer = AnoLetivoSelecionadoSerializer(selecionado)
        return Response(serializer.data)
