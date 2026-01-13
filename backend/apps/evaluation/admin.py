from django.contrib import admin
from apps.evaluation.models import (
    ConfiguracaoAvaliacaoGeral,
    ConfiguracaoAvaliacaoProfessor,
    Avaliacao,
    ControleVisto,
    NotaAvaliacao,
    NotaBimestral,
)


@admin.register(ConfiguracaoAvaliacaoGeral)
class ConfiguracaoAvaliacaoGeralAdmin(admin.ModelAdmin):
    list_display = [
        'ano_letivo',
        'livre_escolha_professor',
        'forma_calculo',
        'numero_casas_decimais_bimestral',
        'numero_casas_decimais_avaliacao',
        'regra_arredondamento',
    ]
    list_filter = ['ano_letivo', 'livre_escolha_professor', 'forma_calculo', 'regra_arredondamento']
    search_fields = ['ano_letivo__ano']


@admin.register(ConfiguracaoAvaliacaoProfessor)
class ConfiguracaoAvaliacaoProfessorAdmin(admin.ModelAdmin):
    list_display = [
        'professor',
        'ano_letivo',
        'forma_calculo_1bim',
        'forma_calculo_2bim',
        'forma_calculo_3bim',
        'forma_calculo_4bim',
    ]
    list_filter = ['ano_letivo', 'forma_calculo_1bim']
    search_fields = ['professor__usuario__first_name', 'professor__usuario__last_name']
    autocomplete_fields = ['professor', 'ano_letivo']


@admin.register(Avaliacao)
class AvaliacaoAdmin(admin.ModelAdmin):
    list_display = [
        'titulo',
        'tipo',
        'valor',
        'bimestre',
        'data_inicio',
        'data_fim',
        'criado_por',
        'criado_em',
    ]
    readonly_fields = ['criado_em', 'criado_por']
    list_filter = ['tipo', 'bimestre']
    search_fields = [
        'titulo',
        'professores_disciplinas_turmas__disciplina_turma__disciplina__nome',
        'professores_disciplinas_turmas__disciplina_turma__turma__numero',
    ]
    filter_horizontal = ['professores_disciplinas_turmas']


@admin.register(ControleVisto)
class ControleVistoAdmin(admin.ModelAdmin):
    list_display = [
        'matricula_turma',
        'professor_disciplina_turma',
        'titulo',
        'visto',
        'bimestre',
        'data_visto',
    ]
    list_filter = ['visto', 'bimestre']
    search_fields = ['titulo', 'matricula_turma__matricula_cemep__estudante__usuario__first_name']
    autocomplete_fields = ['matricula_turma', 'professor_disciplina_turma']


@admin.register(NotaAvaliacao)
class NotaAvaliacaoAdmin(admin.ModelAdmin):
    list_display = [
        'avaliacao',
        'matricula_turma',
        'nota',
        'is_active',
    ]
    list_filter = ['is_active', 'avaliacao__tipo', 'avaliacao__bimestre']
    search_fields = [
        'matricula_turma__matricula_cemep__estudante__usuario__first_name',
        'avaliacao__titulo',
    ]
    autocomplete_fields = ['avaliacao', 'matricula_turma']


@admin.register(NotaBimestral)
class NotaBimestralAdmin(admin.ModelAdmin):
    list_display = [
        'matricula_turma',
        'professor_disciplina_turma',
        'bimestre',
        'nota_calculo_avaliacoes',
        'nota_recuperacao',
        'nota_final',
        'fez_recuperacao',
    ]
    list_filter = ['bimestre', 'fez_recuperacao']
    search_fields = [
        'matricula_turma__matricula_cemep__estudante__usuario__first_name',
        'professor_disciplina_turma__disciplina_turma__disciplina__nome',
    ]
    autocomplete_fields = ['matricula_turma', 'professor_disciplina_turma']
