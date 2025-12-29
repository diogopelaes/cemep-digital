"""
Serializers para o App Core

Re-exporta todos os Serializers para manter compatibilidade com imports existentes.
"""
from .funcionario import (
    FuncionarioSerializer, 
    FuncionarioCreateSerializer,
    FuncionarioCompletoSerializer,
    FuncionarioUpdateSerializer
)
from .periodo_trabalho import PeriodoTrabalhoSerializer
from .disciplina import DisciplinaSerializer
from .curso import CursoSerializer
from .turma import TurmaSerializer
from .disciplina_turma import DisciplinaTurmaSerializer
from .professor_disciplina_turma import ProfessorDisciplinaTurmaSerializer
# from .bimestre import BimestreSerializer
# from .bimestre import BimestreSerializer
from .calendario import (
    AnoLetivoSerializer, 
    DiaLetivoExtraSerializer, 
    DiaNaoLetivoSerializer
)
from .habilidade import HabilidadeSerializer


__all__ = [
    'FuncionarioSerializer',
    'FuncionarioCreateSerializer',
    'FuncionarioCompletoSerializer',
    'FuncionarioUpdateSerializer',
    'PeriodoTrabalhoSerializer',
    'DisciplinaSerializer',
    'CursoSerializer',
    'TurmaSerializer',
    'DisciplinaTurmaSerializer',
    'ProfessorDisciplinaTurmaSerializer',
    'AnoLetivoSerializer',
    'DiaLetivoExtraSerializer',
    'DiaNaoLetivoSerializer',
    'HabilidadeSerializer',
]
