from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AvaliacaoViewSet, DigitarNotaViewSet, AvaliacaoConfigDisciplinaTurmaViewSet

router = DefaultRouter()
router.register('avaliacoes', AvaliacaoViewSet, basename='avaliacoes')
router.register('digitar-notas', DigitarNotaViewSet, basename='digitar-notas')
router.register('config-disciplina-turma', AvaliacaoConfigDisciplinaTurmaViewSet, basename='config-disciplina-turma')

app_name = 'evaluation'

urlpatterns = [
    path('', include(router.urls)),
]
