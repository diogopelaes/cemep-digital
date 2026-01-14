from django.contrib import admin
from .models import Avaliacao, ControleVisto, NotaAvaliacao, NotaBimestral


@admin.register(Avaliacao)
class AvaliacaoAdmin(admin.ModelAdmin):
    list_display = [
        'titulo', 'tipo', 'bimestre', 'ano_letivo', 
        'valor', 'data_inicio', 'data_fim', 'criado_por'
    ]
    list_filter = ['tipo', 'bimestre', 'ano_letivo', 'criado_por']
    search_fields = [
        'titulo', 'descricao', 
        'criado_por__first_name', 'criado_por__last_name',
        'criado_por__username'
    ]
    raw_id_fields = ['ano_letivo', 'criado_por']
    filter_horizontal = ['professores_disciplinas_turmas', 'arquivos']
    readonly_fields = ['criado_em', 'atualizado_em']
    date_hierarchy = 'data_inicio'
    ordering = ['-data_inicio']


@admin.register(ControleVisto)
class ControleVistoAdmin(admin.ModelAdmin):
    list_display = [
        'titulo', 'matricula_turma', 'professor_disciplina_turma', 
        'data_visto', 'visto', 'bimestre'
    ]
    list_filter = ['visto', 'bimestre', 'data_visto']
    search_fields = [
        'titulo', 
        'matricula_turma__matricula_cemep__estudante__usuario__first_name',
        'matricula_turma__matricula_cemep__estudante__usuario__last_name',
        'professor_disciplina_turma__professor__usuario__first_name',
        'professor_disciplina_turma__professor__usuario__last_name'
    ]
    raw_id_fields = ['matricula_turma', 'professor_disciplina_turma']
    filter_horizontal = ['arquivos']
    date_hierarchy = 'data_visto'


@admin.register(NotaAvaliacao)
class NotaAvaliacaoAdmin(admin.ModelAdmin):
    list_display = ['avaliacao', 'matricula_turma', 'nota', 'criado_em', 'criado_por']
    list_filter = [
        'avaliacao__tipo', 
        'avaliacao__bimestre', 
        'avaliacao__ano_letivo'
    ]
    search_fields = [
        'avaliacao__titulo', 
        'matricula_turma__matricula_cemep__estudante__usuario__first_name',
        'matricula_turma__matricula_cemep__estudante__usuario__last_name'
    ]
    raw_id_fields = ['avaliacao', 'matricula_turma', 'criado_por']
    readonly_fields = ['criado_em', 'atualizado_em']


@admin.register(NotaBimestral)
class NotaBimestralAdmin(admin.ModelAdmin):
    list_display = [
        'matricula_turma', 'professor_disciplina_turma', 'bimestre', 
        'nota_calculo_avaliacoes', 'nota_recuperacao', 'nota_final'
    ]
    list_filter = [
        'bimestre', 
        'professor_disciplina_turma__disciplina_turma__turma__ano_letivo'
    ]
    search_fields = [
        'matricula_turma__matricula_cemep__estudante__usuario__first_name',
        'matricula_turma__matricula_cemep__estudante__usuario__last_name',
        'professor_disciplina_turma__professor__usuario__first_name',
        'professor_disciplina_turma__professor__usuario__last_name'
    ]
    raw_id_fields = ['matricula_turma', 'professor_disciplina_turma', 'criado_por']
    readonly_fields = ['criado_em', 'atualizado_em']
    ordering = ['matricula_turma', 'bimestre']
