"""
URLs para o App Pedagogical
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlanoAulaViewSet, AulaFaltasViewSet, DescritorOcorrenciaPedagogicaViewSet,
    OcorrenciaPedagogicaViewSet, OcorrenciaResponsavelCienteViewSet,
    MinhasTurmasViewSet, grade_professor_view, grade_turma_view
)

router = DefaultRouter()
router.register('planos-aula', PlanoAulaViewSet)
router.register('aulas-faltas', AulaFaltasViewSet, basename='aulas-faltas')
router.register('descritores-ocorrencia', DescritorOcorrenciaPedagogicaViewSet)
router.register('ocorrencias', OcorrenciaPedagogicaViewSet)
router.register('ciencias-ocorrencia', OcorrenciaResponsavelCienteViewSet)
router.register('minhas-turmas', MinhasTurmasViewSet, basename='minhas-turmas')

urlpatterns = [
    path('', include(router.urls)),
    # Grade horária do professor logado
    path('grade-professor/', grade_professor_view, name='grade-professor'),
    # Grade horária por turma (ano/numero/letra)
    path('grade-turma/<int:ano>/<int:numero>/<str:letra>/', grade_turma_view, name='grade-turma'),
]
