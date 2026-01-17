"""
View para Responsável
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404

from apps.academic.models import Estudante, Responsavel, ResponsavelEstudante
from apps.academic.serializers import ResponsavelSerializer, ResponsavelCreateSerializer



class ResponsavelViewSet(viewsets.ModelViewSet):
    """ViewSet de Responsáveis. Leitura: Funcionários | Escrita: Gestão/Secretaria"""
    queryset = Responsavel.objects.select_related('usuario').all()
    filter_backends = [DjangoFilterBackend]
    search_fields = ['usuario__first_name', 'usuario__last_name', 'usuario__email']

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ResponsavelCreateSerializer
        return ResponsavelSerializer
    
    @action(detail=True, methods=['post'])
    def vincular_estudante(self, request, pk=None):
        """Vincula um estudante ao responsável."""
        responsavel = self.get_object()
        estudante_id = request.data.get('estudante_id')
        parentesco = request.data.get('parentesco')
        
        if not estudante_id or not parentesco:
            return Response(
                {'error': 'estudante_id e parentesco são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        estudante = get_object_or_404(Estudante, id=estudante_id)
        
        vinculo, created = ResponsavelEstudante.objects.get_or_create(
            responsavel=responsavel,
            estudante=estudante,
            defaults={'parentesco': parentesco}
        )
        
        if not created:
            vinculo.parentesco = parentesco
            vinculo.save()
        
        return Response(ResponsavelSerializer(responsavel).data)
