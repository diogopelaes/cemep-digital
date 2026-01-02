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
from .views.dashboard import DashboardViewSet

router = DefaultRouter()
router.register('tarefas', TarefaViewSet)
router.register('notificacoes-tarefas', NotificacaoTarefaViewSet)
router.register('htpc', ReuniaoHTPCViewSet)
router.register('notificacoes-htpc', NotificacaoHTPCViewSet)
router.register('avisos', AvisoViewSet)
router.register('visualizacoes-avisos', AvisoVisualizacaoViewSet)
router.register('dashboard', DashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
