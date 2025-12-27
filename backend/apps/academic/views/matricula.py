"""
View para Matrículas
"""
from rest_framework import viewsets, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.academic.models import MatriculaCEMEP, MatriculaTurma
from apps.academic.serializers import MatriculaCEMEPSerializer, MatriculaTurmaSerializer
from apps.users.permissions import GestaoSecretariaWriteFuncionarioReadMixin


class MatriculaCEMEPViewSet(GestaoSecretariaWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Matrículas CEMEP. Leitura: Funcionários | Escrita: Gestão/Secretaria"""
    queryset = MatriculaCEMEP.objects.select_related('estudante__usuario', 'curso').all()
    serializer_class = MatriculaCEMEPSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'curso', 'estudante']
    search_fields = ['numero_matricula', 'estudante__usuario__first_name']

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class MatriculaTurmaViewSet(GestaoSecretariaWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Matrículas Turma. Leitura: Funcionários | Escrita: Gestão/Secretaria"""
    queryset = MatriculaTurma.objects.select_related(
        'matricula_cemep__estudante__usuario', 'turma__curso'
    ).all()
    serializer_class = MatriculaTurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'turma', 'matricula_cemep', 'turma__ano_letivo']
    search_fields = ['matricula_cemep__estudante__usuario__first_name', 'matricula_cemep__numero_matricula']

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
