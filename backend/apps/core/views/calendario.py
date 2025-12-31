from rest_framework import viewsets, status, decorators
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from apps.core.models import AnoLetivo, DiaLetivoExtra, DiaNaoLetivo
from apps.core.serializers import AnoLetivoSerializer, DiaLetivoExtraSerializer, DiaNaoLetivoSerializer
from apps.users.permissions import GestaoWritePublicReadMixin

class AnoLetivoViewSet(GestaoWritePublicReadMixin, viewsets.ModelViewSet):
    """
    ViewSet para AnoLetivo.
    Leitura: Público (Autenticado) | Escrita: Gestão
    """
    queryset = AnoLetivo.objects.all()
    serializer_class = AnoLetivoSerializer
    lookup_field = 'ano'
    pagination_class = None

    @decorators.action(detail=True, methods=['get'])
    def calendario(self, request, ano=None):
        """Retorna todos os eventos (dias não letivos e extras) do ano."""
        ano_obj = self.get_object()
        dias_nao_letivos = DiaNaoLetivoSerializer(ano_obj.dias_nao_letivos.all(), many=True).data
        dias_extras = DiaLetivoExtraSerializer(ano_obj.dias_letivos_extras.all(), many=True).data
        
        return Response({
            'dias_nao_letivos': dias_nao_letivos,
            'dias_letivos_extras': dias_extras
        })

    @decorators.action(detail=True, methods=['post'], url_path='dia-nao-letivo')
    def add_dia_nao_letivo(self, request, ano=None):
        """Cria e adiciona um dia não letivo ao ano."""
        ano_obj = self.get_object()
        serializer = DiaNaoLetivoSerializer(data=request.data)
        if serializer.is_valid():
            dia = serializer.save()
            ano_obj.dias_nao_letivos.add(dia)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @decorators.action(detail=True, methods=['post'], url_path='dia-letivo-extra')
    def add_dia_letivo_extra(self, request, ano=None):
        """Cria e adiciona um dia letivo extra ao ano."""
        ano_obj = self.get_object()
        serializer = DiaLetivoExtraSerializer(data=request.data)
        if serializer.is_valid():
            dia = serializer.save()
            ano_obj.dias_letivos_extras.add(dia)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @decorators.action(detail=True, methods=['delete'], url_path='remover-dia')
    def remove_dia(self, request, ano=None):
        """Remove um dia (não letivo ou extra) pelo ID e Tipo passed via Query Params."""
        ano_obj = self.get_object()
        dia_id = request.query_params.get('id')
        tipo = request.query_params.get('tipo') # 'extra' ou 'nao_letivo'
        
        if not dia_id or not tipo:
            return Response(
                {'error': 'Parâmetros "id" e "tipo" (extra/nao_letivo) são obrigatórios.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if tipo == 'nao_letivo':
                dia = get_object_or_404(DiaNaoLetivo, pk=dia_id)
                ano_obj.dias_nao_letivos.remove(dia)
                dia.delete() # Opção: deletar o objeto ou apenas remover do ano? 
                             # Como DiaNaoLetivo é específico por data/ano, deletar faz sentido.
            elif tipo == 'extra':
                dia = get_object_or_404(DiaLetivoExtra, pk=dia_id)
                ano_obj.dias_letivos_extras.remove(dia)
                dia.delete()
            else:
                return Response({'error': 'Tipo inválido.'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
