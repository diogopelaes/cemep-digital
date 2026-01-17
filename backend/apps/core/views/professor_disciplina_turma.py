"""
View para Professor-Disciplina-Turma
"""
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.models import ProfessorDisciplinaTurma
from apps.core.serializers import ProfessorDisciplinaTurmaSerializer
from apps.core.mixins import AnoLetivoFilterMixin



class ProfessorDisciplinaTurmaViewSet(AnoLetivoFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet para ProfessorDisciplinaTurma.
    Leitura: Gestão, Secretaria, Professor, Monitor | Escrita: Gestão
    
    Filtrado pelo ano letivo selecionado do usuário.
    """
    queryset = ProfessorDisciplinaTurma.objects.select_related(
        'professor__usuario', 'disciplina_turma__disciplina', 'disciplina_turma__turma'
    )
    serializer_class = ProfessorDisciplinaTurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['professor', 'disciplina_turma', 'disciplina_turma__turma', 'disciplina_turma__turma__ano_letivo']
    
    ano_letivo_field = 'disciplina_turma__turma__ano_letivo'  # Campo de filtro do AnoLetivoFilterMixin
    
    def get_queryset(self):
        qs = super().get_queryset()
        turma = self.request.query_params.get('turma')
        if turma:
            qs = qs.filter(disciplina_turma__turma_id=turma)
        return qs
