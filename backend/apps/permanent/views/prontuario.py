from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.http import FileResponse

from apps.permanent.models import RegistroProntuario
from apps.permanent.serializers import RegistroProntuarioSerializer


class RegistroProntuarioViewSet(viewsets.ModelViewSet):
    """ViewSet de Prontuário. Leitura e Escrita: Gestão"""
    queryset = RegistroProntuario.objects.all()
    serializer_class = RegistroProntuarioSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['cpf']
    search_fields = ['nome_estudante', 'cpf', 'descricao']

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    @action(detail=True, methods=['get'])
    def download_anexo(self, request, pk=None):
        from apps.permanent.models import RegistroProntuarioAnexo
        registro = self.get_object()
        anexo_id = request.query_params.get('anexo_id')
        
        if not anexo_id:
            return Response({'error': 'anexo_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            anexo = registro.anexos.get(id=anexo_id)
        except RegistroProntuarioAnexo.DoesNotExist:
            return Response({'error': 'Anexo não encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        return FileResponse(anexo.arquivo.open('rb'), as_attachment=True, filename=anexo.arquivo.name.split('/')[-1])
