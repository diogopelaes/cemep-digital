"""
URLs para o App Management
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TarefaViewSet, NotificacaoTarefaViewSet,
    ReuniaoHTPCViewSet, NotificacaoHTPCViewSet,
    AvisoViewSet, AvisoVisualizacaoViewSet
)

router = DefaultRouter()
router.register('tarefas', TarefaViewSet)
router.register('notificacoes-tarefas', NotificacaoTarefaViewSet)
router.register('htpc', ReuniaoHTPCViewSet)
router.register('notificacoes-htpc', NotificacaoHTPCViewSet)
router.register('avisos', AvisoViewSet)
router.register('visualizacoes-avisos', AvisoVisualizacaoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

