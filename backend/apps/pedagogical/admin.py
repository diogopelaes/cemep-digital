from django.contrib import admin
from .models import (
    PlanoAula,
    Aula,
    Faltas,
    DescritorOcorrenciaPedagogica,
    DescritorOcorrenciaPedagogicaAnoLetivo,
    Atividade
)

@admin.register(PlanoAula)
class PlanoAulaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'professor', 'disciplina', 'data_inicio', 'data_fim', 'bimestre', 'ano_letivo')
    list_filter = ('professor', 'disciplina', 'bimestre', 'ano_letivo')
    search_fields = ('titulo', 'conteudo')
    filter_horizontal = ('turmas', 'habilidades')

class FaltaInline(admin.TabularInline):
    model = Faltas
    extra = 1

@admin.register(Aula)
class AulaAdmin(admin.ModelAdmin):
    list_display = ('professor_disciplina_turma', 'data', 'numero_aulas', 'bimestre')
    list_filter = ('data', 'bimestre', 'professor_disciplina_turma__disciplina_turma__turma__ano_letivo')
    search_fields = ('conteudo',)
    inlines = [FaltaInline]

@admin.register(Faltas)
class FaltasAdmin(admin.ModelAdmin):
    list_display = ('estudante', 'aula', 'qtd_faltas')
    list_filter = ('aula__data', 'aula__bimestre')
    search_fields = ('estudante__nome',)

@admin.register(DescritorOcorrenciaPedagogica)
class DescritorOcorrenciaPedagogicaAdmin(admin.ModelAdmin):
    list_display = ('texto',)
    search_fields = ('texto',)

@admin.register(DescritorOcorrenciaPedagogicaAnoLetivo)
class DescritorOcorrenciaPedagogicaAnoLetivoAdmin(admin.ModelAdmin):
    list_display = ('descritor', 'ano_letivo', 'posicao', 'is_active')
    list_filter = ('ano_letivo', 'is_active')
    ordering = ('ano_letivo', 'posicao')

@admin.register(Atividade)
class AtividadeAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'data_inicio', 'data_fim', 'criado_por')
    list_filter = ('criado_por', 'data_inicio', 'data_fim')
    search_fields = ('titulo', 'descricao')
    filter_horizontal = ('turmas_professores', 'arquivos', 'habilidades')
