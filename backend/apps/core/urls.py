"""
URLs para o App Core
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FuncionarioViewSet, PeriodoTrabalhoViewSet, DisciplinaViewSet,
    CursoViewSet, TurmaViewSet, DisciplinaTurmaViewSet,
    ProfessorDisciplinaTurmaViewSet, CalendarioEscolarViewSet, HabilidadeViewSet,
    BimestreViewSet
)

router = DefaultRouter()
router.register('funcionarios', FuncionarioViewSet)
router.register('periodos-trabalho', PeriodoTrabalhoViewSet)
router.register('disciplinas', DisciplinaViewSet)
router.register('cursos', CursoViewSet)
router.register('turmas', TurmaViewSet)
router.register('disciplinas-turma', DisciplinaTurmaViewSet)
router.register('atribuicoes', ProfessorDisciplinaTurmaViewSet)
router.register('calendario', CalendarioEscolarViewSet)
router.register('habilidades', HabilidadeViewSet)
router.register('bimestres', BimestreViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

