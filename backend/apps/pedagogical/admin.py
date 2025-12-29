"""
Admin para o App Pedagogical
"""
from django.contrib import admin
from .models import (
    PlanoAula, Aula, Faltas, DescritorOcorrenciaPedagogica, OcorrenciaPedagogica,
    OcorrenciaResponsavelCiente, NotaBimestral, NotificacaoRecuperacao
)


@admin.register(PlanoAula)
class PlanoAulaAdmin(admin.ModelAdmin):
    list_display = ['professor', 'disciplina', 'data_inicio', 'data_fim']
    list_filter = ['disciplina', 'data_inicio']
    filter_horizontal = ['turmas', 'habilidades']


@admin.register(Aula)
class AulaAdmin(admin.ModelAdmin):
    list_display = ['professor_disciplina_turma', 'data', 'numero_aulas']
    list_filter = ['data', 'professor_disciplina_turma__disciplina_turma__turma__ano_letivo']
    date_hierarchy = 'data'


@admin.register(Faltas)
class FaltasAdmin(admin.ModelAdmin):
    list_display = ['estudante', 'aula', 'aula_numero']
    list_filter = ['aula__data']


@admin.register(DescritorOcorrenciaPedagogica)
class DescritorOcorrenciaPedagogicaAdmin(admin.ModelAdmin):
    list_display = ['texto', 'gestor', 'ativo']
    list_filter = ['ativo']


@admin.register(OcorrenciaPedagogica)
class OcorrenciaPedagogicaAdmin(admin.ModelAdmin):
    list_display = ['estudante', 'tipo', 'autor', 'data']
    list_filter = ['tipo', 'data']
    date_hierarchy = 'data'


@admin.register(OcorrenciaResponsavelCiente)
class OcorrenciaResponsavelCienteAdmin(admin.ModelAdmin):
    list_display = ['responsavel', 'ocorrencia', 'ciente', 'data_ciencia']
    list_filter = ['ciente']


@admin.register(NotaBimestral)
class NotaBimestralAdmin(admin.ModelAdmin):
    list_display = ['matricula_turma', 'professor_disciplina_turma', 'nota']
    list_filter = ['professor_disciplina_turma__disciplina_turma__turma__ano_letivo']


@admin.register(NotificacaoRecuperacao)
class NotificacaoRecuperacaoAdmin(admin.ModelAdmin):
    list_display = ['estudante', 'professor_disciplina_turma', 'visualizado']
    list_filter = ['visualizado']

