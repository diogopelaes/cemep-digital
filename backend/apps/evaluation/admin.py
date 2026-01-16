from django.contrib import admin
from .models import Avaliacao, ControleVisto, NotaAvaliacao, NotaBimestral, AvaliacaoConfigDisciplinaTurma

@admin.register(Avaliacao)
class AvaliacaoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'tipo', 'valor', 'peso', 'bimestre', 'ano_letivo', 'data_inicio', 'data_fim')
    list_filter = ('tipo', 'bimestre', 'ano_letivo', 'data_inicio')
    search_fields = ('titulo', 'descricao')
    filter_horizontal = ('professores_disciplinas_turmas', 'arquivos', 'habilidades')
    raw_id_fields = ('ano_letivo', 'criado_por')
    readonly_fields = ('criado_em', 'atualizado_em')
    ordering = ('-data_inicio',)

@admin.register(ControleVisto)
class ControleVistoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'matricula_turma', 'professor_disciplina_turma', 'visto', 'bimestre', 'data_visto')
    list_filter = ('visto', 'bimestre', 'data_visto')
    search_fields = ('titulo', 'matricula_turma__matricula_cemep__estudante__nome_social', 'professor_disciplina_turma__professor__nome_social')
    filter_horizontal = ('arquivos',)
    raw_id_fields = ('matricula_turma', 'professor_disciplina_turma')

@admin.register(NotaAvaliacao)
class NotaAvaliacaoAdmin(admin.ModelAdmin):
    list_display = ('avaliacao', 'matricula_turma', 'nota', 'get_estudante')
    list_filter = ('avaliacao__bimestre', 'avaliacao__tipo', 'avaliacao__ano_letivo')
    search_fields = ('matricula_turma__matricula_cemep__estudante__nome_social', 'avaliacao__titulo')
    raw_id_fields = ('avaliacao', 'matricula_turma', 'criado_por')
    readonly_fields = ('criado_em', 'atualizado_em')

    @admin.display(description='Estudante', ordering='matricula_turma__matricula_cemep__estudante__nome_social')
    def get_estudante(self, obj):
        return obj.matricula_turma.matricula_cemep.estudante

@admin.register(NotaBimestral)
class NotaBimestralAdmin(admin.ModelAdmin):
    list_display = (
        'matricula_turma', 'professor_disciplina_turma', 'bimestre', 
        'nota_calculo_avaliacoes', 'nota_recuperacao', 'nota_final',
        'ficou_de_recuperacao_status'
    )
    list_filter = (
        'bimestre', 
        'professor_disciplina_turma__disciplina_turma__disciplina',
        'professor_disciplina_turma__disciplina_turma__turma'
    )
    search_fields = ('matricula_turma__matricula_cemep__estudante__nome_social', 'professor_disciplina_turma__professor__nome_social')
    raw_id_fields = ('matricula_turma', 'professor_disciplina_turma', 'criado_por')
    readonly_fields = ('criado_em', 'atualizado_em')

    @admin.display(description='Recup.', boolean=True)
    def ficou_de_recuperacao_status(self, obj):
        return obj.ficou_de_recuperacao

@admin.register(AvaliacaoConfigDisciplinaTurma)
class AvaliacaoConfigDisciplinaTurmaAdmin(admin.ModelAdmin):
    list_display = ('disciplina_turma', 'ano_letivo', 'forma_calculo', 'pode_alterar')
    list_filter = ('ano_letivo', 'forma_calculo', 'pode_alterar')
    search_fields = (
        'disciplina_turma__disciplina__nome', 
        'disciplina_turma__turma__curso__nome', 
        'disciplina_turma__turma__curso__sigla'
    )
    raw_id_fields = ('ano_letivo', 'disciplina_turma')
    ordering = ('-ano_letivo', 'disciplina_turma__turma__numero')

