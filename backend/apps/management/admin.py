"""
Admin para o App Management
"""
from django.contrib import admin
from .models import (
    Tarefa, NotificacaoTarefa, ReuniaoHTPC, NotificacaoHTPC,
    Aviso, AvisoVisualizacao
)


@admin.register(Tarefa)
class TarefaAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'prazo', 'concluido', 'criador']
    list_filter = ['concluido', 'prazo']
    filter_horizontal = ['funcionarios']


@admin.register(NotificacaoTarefa)
class NotificacaoTarefaAdmin(admin.ModelAdmin):
    list_display = ['funcionario', 'tarefa', 'visualizado']
    list_filter = ['visualizado']


@admin.register(ReuniaoHTPC)
class ReuniaoHTPCAdmin(admin.ModelAdmin):
    list_display = ['data_reuniao', 'quem_registrou']
    list_filter = ['data_reuniao']
    filter_horizontal = ['presentes']


@admin.register(NotificacaoHTPC)
class NotificacaoHTPCAdmin(admin.ModelAdmin):
    list_display = ['funcionario', 'reuniao', 'visualizado']
    list_filter = ['visualizado']


@admin.register(Aviso)
class AvisoAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'data_aviso', 'criador']
    list_filter = ['data_aviso']
    filter_horizontal = ['destinatarios']


@admin.register(AvisoVisualizacao)
class AvisoVisualizacaoAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'aviso', 'visualizado']
    list_filter = ['visualizado']

