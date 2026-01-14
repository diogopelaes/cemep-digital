from django.contrib import admin
from .models import Avaliacao, ControleVisto, NotaAvaliacao, NotaBimestral

@admin.register(Avaliacao)
class AvaliacaoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'tipo', 'valor', 'bimestre', 'ano_letivo', 'data_inicio', 'data_fim')
    list_filter = ('tipo', 'bimestre', 'ano_letivo', 'data_inicio')
    search_fields = ('titulo', 'descricao')
    filter_horizontal = ('professores_disciplinas_turmas', 'arquivos', 'habilidades')
    raw_id_fields = ('ano_letivo', 'criado_por')
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
    list_display = ('avaliacao', 'matricula_turma', 'nota')
    list_filter = ('avaliacao__bimestre', 'avaliacao__tipo')
    search_fields = ('matricula_turma__matricula_cemep__estudante__nome_social', 'avaliacao__titulo')
    raw_id_fields = ('avaliacao', 'matricula_turma', 'criado_por')

@admin.register(NotaBimestral)
class NotaBimestralAdmin(admin.ModelAdmin):
    list_display = ('matricula_turma', 'professor_disciplina_turma', 'bimestre', 'nota_final')
    list_filter = ('bimestre', 'professor_disciplina_turma__disciplina_turma__disciplina')
    search_fields = ('matricula_turma__matricula_cemep__estudante__nome_social', 'professor_disciplina_turma__professor__nome_social')
    raw_id_fields = ('matricula_turma', 'professor_disciplina_turma', 'criado_por')
