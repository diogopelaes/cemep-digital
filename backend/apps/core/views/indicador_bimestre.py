"""
Views para Indicadores Bimestre
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter

from apps.core.models import IndicadorBimestre, IndicadorBimestreAnoLetivo
from apps.core.serializers import (
    IndicadorBimestreSerializer,
    IndicadorBimestreAnoLetivoSerializer,
    SalvarLoteIndicadoresSerializer
)
from core_project.permissions import Policy, GESTAO, AUTHENTICATED, NONE


class IndicadorBimestreViewSet(viewsets.ModelViewSet):
    """
    ViewSet para IndicadorBimestre.
    Create: GESTAO | Read: AUTHENTICATED | Update: NONE | Delete: NONE
    """
    queryset = IndicadorBimestre.objects.all()
    serializer_class = IndicadorBimestreSerializer
    filter_backends = [SearchFilter]
    search_fields = ['nome', 'categoria']
    
    permission_classes = [Policy(
        create=[GESTAO],
        read=AUTHENTICATED,
        update=NONE,
        delete=NONE,
    )]


class IndicadorBimestreAnoLetivoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para IndicadorBimestreAnoLetivo.
    Create: GESTAO | Read: AUTHENTICATED | Update: GESTAO | Delete: NONE
    """
    queryset = IndicadorBimestreAnoLetivo.objects.select_related(
        'indicador', 'ano_letivo'
    ).all()
    serializer_class = IndicadorBimestreAnoLetivoSerializer
    filterset_fields = ['ano_letivo', 'is_active']
    
    permission_classes = [Policy(
        create=[GESTAO],
        read=AUTHENTICATED,
        update=[GESTAO],
        delete=NONE,
        custom={'salvar_lote': [GESTAO]}
    )]
    
    def get_queryset(self):
        """Retorna indicadores ordenados por posição."""
        return super().get_queryset().order_by('posicao_categoria', 'posicao')
    
    @action(detail=False, methods=['post'])
    def salvar_lote(self, request):
        """
        Salva lista de indicadores em lote.
        - Cria IndicadorBimestre se não existir (busca case insensitive por nome+categoria)
        - Cria ou atualiza IndicadorBimestreAnoLetivo
        """
        serializer = SalvarLoteIndicadoresSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        ano_letivo = request.user.get_ano_letivo_selecionado()
        if not ano_letivo:
            return Response(
                {'error': 'Nenhum ano letivo selecionado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        indicadores_data = serializer.validated_data['indicadores']
        
        # IDs dos indicadores que devem estar ativos
        indicadores_enviados = set()
        
        for item in indicadores_data:
            # Busca ou cria IndicadorBimestre (case insensitive)
            indicador = IndicadorBimestre.objects.filter(
                nome__iexact=item['nome'],
                categoria__iexact=item['categoria']
            ).first()
            
            if not indicador:
                indicador = IndicadorBimestre.objects.create(
                    nome=item['nome'],
                    categoria=item['categoria']
                )
            
            # Cria ou atualiza IndicadorBimestreAnoLetivo
            obj, created = IndicadorBimestreAnoLetivo.objects.update_or_create(
                indicador=indicador,
                ano_letivo=ano_letivo,
                defaults={
                    'posicao_categoria': item['posicao_categoria'],
                    'posicao': item['posicao'],
                    'is_active': item.get('is_active', True)
                }
            )
            indicadores_enviados.add(obj.id)
        
        # Marca como inativo os que não foram enviados
        IndicadorBimestreAnoLetivo.objects.filter(
            ano_letivo=ano_letivo
        ).exclude(
            id__in=indicadores_enviados
        ).update(is_active=False)
        
        # Reordena para mover inativos para o final
        IndicadorBimestreAnoLetivo.reordenar_por_ano_letivo(ano_letivo)
        
        return Response({'status': 'ok', 'count': len(indicadores_data)})
