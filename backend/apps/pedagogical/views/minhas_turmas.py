from django.db.models import Count, Q, Prefetch
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.models import Turma, ProfessorDisciplinaTurma, DisciplinaTurma
from apps.pedagogical.serializers.minhas_turmas import MinhasTurmasSerializer, MinhaTurmaDetalhesSerializer
from core_project.permissions import Policy, PROFESSOR, NONE


class MinhasTurmasViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para retornar as turmas onde o professor autenticado leciona.
    Otimizado para performance máxima com Annotation e Prefetch.
    """
    permission_classes = [Policy(
        create=NONE,
        read=[PROFESSOR],
        update=NONE,
        delete=NONE,
    )]
    serializer_class = MinhasTurmasSerializer


    def get_queryset(self):
        user = self.request.user
        
        # 1. Validações iniciais
        if not hasattr(user, 'funcionario'):
            return Turma.objects.none()

        ano_letivo = user.get_ano_letivo_selecionado()
        if not ano_letivo:
            return Turma.objects.none()

        # 2. Prefetch otimizado: Carrega apenas as disciplinas que o professor leciona nesta turma
        prof_atribuicoes_prefetch = Prefetch(
            'disciplinas_vinculadas',
            queryset=DisciplinaTurma.objects.filter(
                professores__professor=user.funcionario
            ).select_related('disciplina'),
            to_attr='disciplinas_docente' # Disponível no objeto Turma
        )

        # 3. Query principal com Annotation
        return Turma.objects.filter(
            disciplinas_vinculadas__professores__professor=user.funcionario,
            ano_letivo=ano_letivo.ano,
            is_active=True
        ).annotate(
            total_estudantes=Count(
                'matriculas', 
                filter=Q(matriculas__status__in=['CURSANDO', 'RETIDO', 'PROMOVIDO']),
                distinct=True
            )
        ).select_related(
            'curso'
        ).prefetch_related(
            prof_atribuicoes_prefetch
        ).distinct().order_by('numero', 'letra')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MinhaTurmaDetalhesSerializer
        return MinhasTurmasSerializer
