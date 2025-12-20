"""
Admin para o App Pedagogical
"""
from django.contrib import admin
from .models import (
    PlanoAula, Aula, Faltas, TipoOcorrencia, OcorrenciaPedagogica,
    OcorrenciaResponsavelCiente, NotaBimestral, Recuperacao, NotificacaoRecuperacao
)


@admin.register(PlanoAula)
class PlanoAulaAdmin(admin.ModelAdmin):
    list_display = ['professor', 'disciplina', 'data_inicio', 'data_fim']
    list_filter = ['disciplina', 'data_inicio']
    filter_horizontal = ['turmas', 'habilidades']


@admin.register(Aula)
class AulaAdmin(admin.ModelAdmin):
    list_display = ['disciplina_turma', 'professor', 'data', 'numero_aulas']
    list_filter = ['data', 'disciplina_turma__turma__ano_letivo']
    date_hierarchy = 'data'


@admin.register(Faltas)
class FaltasAdmin(admin.ModelAdmin):
    list_display = ['estudante', 'aula', 'aula_numero']
    list_filter = ['aula__data']


@admin.register(TipoOcorrencia)
class TipoOcorrenciaAdmin(admin.ModelAdmin):
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
    list_display = ['matricula_turma', 'disciplina_turma', 'bimestre', 'nota', 'nota_recuperacao']
    list_filter = ['bimestre', 'disciplina_turma__turma__ano_letivo']


@admin.register(Recuperacao)
class RecuperacaoAdmin(admin.ModelAdmin):
    list_display = ['disciplina', 'professor', 'bimestre', 'data_prova']
    list_filter = ['bimestre', 'disciplina']
    filter_horizontal = ['matriculas_turma']


@admin.register(NotificacaoRecuperacao)
class NotificacaoRecuperacaoAdmin(admin.ModelAdmin):
    list_display = ['estudante', 'recuperacao', 'visualizado']
    list_filter = ['visualizado']

