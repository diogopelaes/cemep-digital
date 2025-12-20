"""
Admin para o App Core
"""
from django.contrib import admin
from .models import (
    Funcionario, PeriodoTrabalho, Disciplina, Curso, Turma,
    DisciplinaTurma, ProfessorDisciplinaTurma, CalendarioEscolar, Habilidade
)


@admin.register(Funcionario)
class FuncionarioAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'funcao', 'ativo']
    list_filter = ['ativo', 'funcao']
    search_fields = ['usuario__first_name', 'usuario__last_name', 'funcao']


@admin.register(PeriodoTrabalho)
class PeriodoTrabalhoAdmin(admin.ModelAdmin):
    list_display = ['funcionario', 'data_entrada', 'data_saida']
    list_filter = ['data_entrada']
    search_fields = ['funcionario__usuario__first_name']


@admin.register(Disciplina)
class DisciplinaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'sigla']
    search_fields = ['nome', 'sigla']


@admin.register(Curso)
class CursoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'sigla']
    search_fields = ['nome', 'sigla']


@admin.register(Turma)
class TurmaAdmin(admin.ModelAdmin):
    list_display = ['numero', 'letra', 'ano_letivo', 'nomenclatura', 'curso']
    list_filter = ['ano_letivo', 'curso', 'nomenclatura']
    search_fields = ['numero', 'letra']


@admin.register(DisciplinaTurma)
class DisciplinaTurmaAdmin(admin.ModelAdmin):
    list_display = ['disciplina', 'turma', 'carga_horaria']
    list_filter = ['turma__ano_letivo', 'disciplina']


@admin.register(ProfessorDisciplinaTurma)
class ProfessorDisciplinaTurmaAdmin(admin.ModelAdmin):
    list_display = ['professor', 'disciplina_turma']
    list_filter = ['disciplina_turma__turma__ano_letivo']


@admin.register(CalendarioEscolar)
class CalendarioEscolarAdmin(admin.ModelAdmin):
    list_display = ['data', 'letivo', 'tipo', 'descricao']
    list_filter = ['letivo', 'tipo']
    date_hierarchy = 'data'


@admin.register(Habilidade)
class HabilidadeAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'disciplina', 'descricao']
    list_filter = ['disciplina']
    search_fields = ['codigo', 'descricao']

