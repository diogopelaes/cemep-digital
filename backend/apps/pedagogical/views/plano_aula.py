"""
View para Plano de Aula
"""
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend

from apps.pedagogical.models import PlanoAula
from apps.pedagogical.serializers import PlanoAulaSerializer
from apps.users.permissions import ProfessorWriteFuncionarioReadMixin


class PlanoAulaViewSet(ProfessorWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Planos de Aula. Leitura: Funcionários | Escrita: Professores/Gestão"""
    queryset = PlanoAula.objects.select_related('professor__usuario', 'disciplina').prefetch_related('turmas', 'habilidades')
    serializer_class = PlanoAulaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['professor', 'disciplina', 'turmas']
