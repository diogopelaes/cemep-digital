from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.core.models import ControleRegistrosVisualizacao
from apps.core.serializers import ControleRegistrosVisualizacaoSerializer
from core_project.permissions import Policy, GESTAO



class ControleRegistrosVisualizacaoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para ControleRegistrosVisualizacao.
    Apenas GESTÃO pode CRUD.
    """
    queryset = ControleRegistrosVisualizacao.objects.all()
    serializer_class = ControleRegistrosVisualizacaoSerializer
    filterset_fields = ['ano_letivo', 'bimestre', 'tipo', 'digitacao_futura']
    pagination_class = None
    
    permission_classes = [Policy(
        create=[GESTAO],
        read=[GESTAO],
        update=[GESTAO],
        delete=[GESTAO],
        custom={
            'por_ano': [GESTAO],
            'salvar_lote': [GESTAO],
        }
    )]


    def get_queryset(self):
        """Permite filtrar por ano_letivo__ano via query param."""
        qs = super().get_queryset()
        ano = self.request.query_params.get('ano_letivo__ano')
        if ano:
            qs = qs.filter(ano_letivo__ano=ano)
        return qs

    @action(detail=False, methods=['get'], url_path='por-ano/(?P<ano>[0-9]+)')
    def por_ano(self, request, ano=None):
        """
        Retorna todos os controles de um ano letivo específico.
        GET /controle-registros/por-ano/2024/
        """
        controles = self.get_queryset().filter(ano_letivo__ano=ano)
        serializer = self.get_serializer(controles, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='salvar-lote')
    def salvar_lote(self, request):
        """
        Salva múltiplos controles de uma vez (cria ou atualiza).
        Espera um array de objetos com os campos do controle.
        POST /controle-registros/salvar-lote/
        {
            "controles": [
                {"ano_letivo": "uuid", "bimestre": 1, "tipo": "AULA", "data_inicio": "2024-02-01", "data_fim": "2024-04-30"},
                ...
            ]
        }
        """
        controles_data = request.data.get('controles', [])
        resultados = []
        erros = []

        for item in controles_data:
            ano_letivo_id = item.get('ano_letivo')
            bimestre = item.get('bimestre')
            tipo = item.get('tipo')

            # Tenta encontrar registro existente
            try:
                controle = ControleRegistrosVisualizacao.objects.get(
                    ano_letivo_id=ano_letivo_id,
                    bimestre=bimestre,
                    tipo=tipo
                )
                serializer = self.get_serializer(controle, data=item, partial=True)
            except ControleRegistrosVisualizacao.DoesNotExist:
                serializer = self.get_serializer(data=item)

            if serializer.is_valid():
                serializer.save()
                resultados.append(serializer.data)
            else:
                erros.append({
                    'item': item,
                    'errors': serializer.errors
                })

        if erros:
            return Response({
                'salvos': resultados,
                'erros': erros
            }, status=status.HTTP_207_MULTI_STATUS)

        return Response(resultados, status=status.HTTP_200_OK)
