"""
Views para o App Core

Re-exporta todos os ViewSets para manter compatibilidade com imports existentes.
"""
from .funcionario import FuncionarioViewSet
from .periodo_trabalho import PeriodoTrabalhoViewSet
from .disciplina import DisciplinaViewSet
from .curso import CursoViewSet
from .turma import TurmaViewSet
from .disciplina_turma import DisciplinaTurmaViewSet
from .professor_disciplina_turma import ProfessorDisciplinaTurmaViewSet
from .calendario import AnoLetivoViewSet
from .habilidade import HabilidadeViewSet
from .horario_aula import HorarioAulaViewSet
from .grade_horaria import GradeHorariaViewSet
from .ano_letivo_selecionado import AnoLetivoSelecionadoViewSet
from .media import ProtectedMediaView
from .controle import ControleRegistrosVisualizacaoViewSet


__all__ = [
    'FuncionarioViewSet',
    'PeriodoTrabalhoViewSet',
    'DisciplinaViewSet',
    'CursoViewSet',
    'TurmaViewSet',
    'DisciplinaTurmaViewSet',
    'ProfessorDisciplinaTurmaViewSet',
    'AnoLetivoViewSet',
    'HabilidadeViewSet',
    'HorarioAulaViewSet',
    'GradeHorariaViewSet',
    'AnoLetivoSelecionadoViewSet',
    'ProtectedMediaView',
    'ControleRegistrosVisualizacaoViewSet',
]



