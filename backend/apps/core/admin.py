"""
Admin para o App Core
"""
from django.contrib import admin
from .models import (
    Funcionario, PeriodoTrabalho, Disciplina, Curso, Turma,
    DisciplinaTurma, ProfessorDisciplinaTurma, Habilidade,
    AnoLetivo, DiaLetivoExtra, DiaNaoLetivo
)


@admin.register(Funcionario)
class FuncionarioAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'matricula', 'cpf', 'area_atuacao']
    list_filter = ['usuario__tipo_usuario', 'estado', 'cidade']
    search_fields = ['usuario__first_name', 'usuario__last_name', 'area_atuacao', 'matricula', 'cpf']
    fieldsets = (
        ('Dados Pessoais', {
            'fields': ('usuario', 'nome_social', 'cpf', 'cin', 'data_nascimento', 'telefone')
        }),
        ('Dados Profissionais', {
            'fields': ('matricula', 'area_atuacao', 'apelido', 'data_admissao')
        }),
        ('Endereço', {
            'fields': ('logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep')
        }),
    )


@admin.register(PeriodoTrabalho)
class PeriodoTrabalhoAdmin(admin.ModelAdmin):
    list_display = ['funcionario', 'data_entrada', 'data_saida']
    list_filter = ['data_entrada']
    search_fields = ['funcionario__usuario__first_name']


@admin.register(Disciplina)
class DisciplinaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'sigla', 'is_active']
    list_filter = ['is_active']
    search_fields = ['nome', 'sigla']


@admin.register(Curso)
class CursoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'sigla', 'is_active']
    search_fields = ['nome', 'sigla']


@admin.register(Turma)
class TurmaAdmin(admin.ModelAdmin):
    list_display = ['numero', 'letra', 'ano_letivo', 'nomenclatura', 'curso', 'is_active']
    list_filter = ['ano_letivo', 'curso', 'nomenclatura']
    search_fields = ['numero', 'letra']
    filter_horizontal = ['professores_representantes']


@admin.register(DisciplinaTurma)
class DisciplinaTurmaAdmin(admin.ModelAdmin):
    list_display = ['disciplina', 'turma', 'aulas_semanais']
    list_filter = ['turma__ano_letivo', 'disciplina']


@admin.register(ProfessorDisciplinaTurma)
class ProfessorDisciplinaTurmaAdmin(admin.ModelAdmin):
    list_display = ['professor', 'disciplina_turma']
    list_filter = ['disciplina_turma__turma__ano_letivo']





@admin.register(Habilidade)
class HabilidadeAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'disciplina', 'descricao', 'is_active']
    list_filter = ['disciplina']
    search_fields = ['codigo', 'descricao']


@admin.register(DiaLetivoExtra)
class DiaLetivoExtraAdmin(admin.ModelAdmin):
    list_display = ['data', 'descricao']
    date_hierarchy = 'data'


@admin.register(DiaNaoLetivo)
class DiaNaoLetivoAdmin(admin.ModelAdmin):
    list_display = ['data', 'tipo', 'descricao']
    list_filter = ['tipo']
    date_hierarchy = 'data'


@admin.register(AnoLetivo)
class AnoLetivoAdmin(admin.ModelAdmin):
    list_display = ['ano', 'is_active', 'total_dias_letivos']
    list_filter = ['is_active']


