"""
View para Faltas
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.pedagogical.models import Aula, Faltas
from apps.pedagogical.serializers import FaltasSerializer, FaltasRegistroSerializer
from apps.users.permissions import ProfessorWriteFuncionarioReadMixin


class FaltasViewSet(ProfessorWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Faltas. Leitura: Funcionários | Escrita: Professores/Gestão"""
    queryset = Faltas.objects.select_related('aula', 'estudante__usuario')
    serializer_class = FaltasSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['aula', 'estudante', 'aula__professor_disciplina_turma__disciplina_turma__turma']
    
    @action(detail=False, methods=['post'])
    def registrar_lote(self, request):
        """Registra faltas em lote para uma aula."""
        serializer = FaltasRegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        aula_id = serializer.validated_data['aula_id']
        estudantes_ids = serializer.validated_data['estudantes_ids']
        aula_numero = serializer.validated_data['aula_numero']
        
        aula = Aula.objects.get(id=aula_id)
        
        Faltas.objects.filter(aula=aula, aula_numero=aula_numero).delete()
        
        faltas = [
            Faltas(aula=aula, estudante_id=est_id, aula_numero=aula_numero)
            for est_id in estudantes_ids
        ]
        Faltas.objects.bulk_create(faltas)
        
        return Response({'message': f'{len(faltas)} faltas registradas.'})
