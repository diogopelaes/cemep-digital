"""
Views para Descritores de Ocorrência Pedagógica
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter

from apps.pedagogical.models import DescritorOcorrenciaPedagogica, DescritorOcorrenciaPedagogicaAnoLetivo
from apps.pedagogical.serializers import (
    DescritorOcorrenciaPedagogicaSerializer,
    DescritorOcorrenciaPedagogicaAnoLetivoSerializer,
    SalvarLoteDescritoresSerializer
)
from core_project.permissions import Policy, GESTAO, AUTHENTICATED, NONE


class DescritorOcorrenciaPedagogicaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para DescritorOcorrenciaPedagogica.
    Create: GESTAO | Read: AUTHENTICATED | Update: NONE | Delete: NONE
    """
    queryset = DescritorOcorrenciaPedagogica.objects.all()
    serializer_class = DescritorOcorrenciaPedagogicaSerializer
    filter_backends = [SearchFilter]
    search_fields = ['texto']
    
    permission_classes = [Policy(
        create=[GESTAO],
        read=AUTHENTICATED,
        update=NONE,
        delete=NONE,
    )]


class DescritorOcorrenciaPedagogicaAnoLetivoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para DescritorOcorrenciaPedagogicaAnoLetivo.
    Create: GESTAO | Read: AUTHENTICATED | Update: GESTAO | Delete: NONE
    """
    queryset = DescritorOcorrenciaPedagogicaAnoLetivo.objects.select_related(
        'descritor', 'ano_letivo'
    ).all()
    serializer_class = DescritorOcorrenciaPedagogicaAnoLetivoSerializer
    filterset_fields = ['ano_letivo', 'is_active']
    
    permission_classes = [Policy(
        create=[GESTAO],
        read=AUTHENTICATED,
        update=[GESTAO],
        delete=NONE,
        custom={'salvar_lote': [GESTAO]}
    )]
    
    def get_queryset(self):
        """Retorna descritores ordenados por posição."""
        return super().get_queryset().order_by('posicao')
    
    @action(detail=False, methods=['post'])
    def salvar_lote(self, request):
        """
        Salva lista de descritores em lote.
        - Cria DescritorOcorrenciaPedagogica se não existir (busca case insensitive por texto)
        - Cria ou atualiza DescritorOcorrenciaPedagogicaAnoLetivo
        """
        serializer = SalvarLoteDescritoresSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        ano_letivo = request.user.get_ano_letivo_selecionado()
        if not ano_letivo:
            return Response(
                {'error': 'Nenhum ano letivo selecionado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        descritores_data = serializer.validated_data['descritores']
        
        # IDs dos descritores que devem estar ativos
        descritores_enviados = set()
        
        for item in descritores_data:
            # Busca ou cria DescritorOcorrenciaPedagogica (case insensitive)
            descritor = DescritorOcorrenciaPedagogica.objects.filter(
                texto__iexact=item['texto']
            ).first()
            
            if not descritor:
                descritor = DescritorOcorrenciaPedagogica.objects.create(
                    texto=item['texto']
                )
            
            # Cria ou atualiza DescritorOcorrenciaPedagogicaAnoLetivo
            obj, created = DescritorOcorrenciaPedagogicaAnoLetivo.objects.update_or_create(
                descritor=descritor,
                ano_letivo=ano_letivo,
                defaults={
                    'posicao': item['posicao'],
                    'is_active': item.get('is_active', True)
                }
            )
            descritores_enviados.add(obj.id)
        
        # Marca como inativo os que não foram enviados
        DescritorOcorrenciaPedagogicaAnoLetivo.objects.filter(
            ano_letivo=ano_letivo
        ).exclude(
            id__in=descritores_enviados
        ).update(is_active=False)
        
        # Reordena para mover inativos para o final
        DescritorOcorrenciaPedagogicaAnoLetivo.reordenar_por_ano_letivo(ano_letivo)
        
        return Response({'status': 'ok', 'count': len(descritores_data)})
