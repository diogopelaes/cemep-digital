"""
URLs para o App Academic
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EstudanteViewSet, ResponsavelViewSet,
    MatriculaCEMEPViewSet, MatriculaTurmaViewSet, AtestadoViewSet,
    CarometroView
)

router = DefaultRouter()
router.register('estudantes', EstudanteViewSet)
router.register('responsaveis', ResponsavelViewSet)
router.register('matriculas-cemep', MatriculaCEMEPViewSet)
router.register('matriculas-turma', MatriculaTurmaViewSet)
router.register('atestados', AtestadoViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('turmas/<str:turma_id>/carometro/', CarometroView.as_view(), name='turma-carometro'),
]

