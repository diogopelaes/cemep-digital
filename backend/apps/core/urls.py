"""
URLs para o App Core
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FuncionarioViewSet, PeriodoTrabalhoViewSet, DisciplinaViewSet,
    CursoViewSet, TurmaViewSet, DisciplinaTurmaViewSet,
    ProfessorDisciplinaTurmaViewSet, HabilidadeViewSet,
    AnoLetivoViewSet, HorarioAulaViewSet, GradeHorariaViewSet,
    AnoLetivoSelecionadoViewSet,
    ControleRegistrosVisualizacaoViewSet
)

router = DefaultRouter()
router.register('funcionarios', FuncionarioViewSet)
router.register('periodos-trabalho', PeriodoTrabalhoViewSet)
router.register('disciplinas', DisciplinaViewSet)
router.register('cursos', CursoViewSet)
router.register('turmas', TurmaViewSet)
router.register('disciplinas-turma', DisciplinaTurmaViewSet)
router.register('atribuicoes', ProfessorDisciplinaTurmaViewSet)
router.register('habilidades', HabilidadeViewSet)
router.register('anos-letivos', AnoLetivoViewSet)
router.register('horarios-aula', HorarioAulaViewSet)
router.register('grades-horarias', GradeHorariaViewSet)
router.register('ano-letivo-selecionado', AnoLetivoSelecionadoViewSet, basename='ano-letivo-selecionado')
router.register('controle-registros', ControleRegistrosVisualizacaoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]




