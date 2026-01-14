from django.contrib import admin
from .models import (
    PlanoAula, Aula, Faltas, 
    DescritorOcorrenciaPedagogica, OcorrenciaPedagogica, 
    OcorrenciaResponsavelCiente, Atividade
)

@admin.register(PlanoAula)
class PlanoAulaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'professor', 'disciplina', 'data_inicio', 'data_fim', 'bimestre', 'ano_letivo')
    list_filter = ('bimestre', 'ano_letivo', 'professor', 'disciplina')
    search_fields = ('titulo', 'professor__usuario__first_name', 'professor__usuario__last_name', 'disciplina__nome')
    filter_horizontal = ('turmas', 'habilidades')
    raw_id_fields = ('professor', 'disciplina', 'ano_letivo')
    ordering = ('-data_inicio',)

class FaltaInline(admin.TabularInline):
    model = Faltas
    extra = 1

@admin.register(Aula)
class AulaAdmin(admin.ModelAdmin):
    list_display = ('data', 'professor_disciplina_turma', 'numero_aulas', 'bimestre')
    list_filter = ('data', 'bimestre', 'professor_disciplina_turma__professor', 'professor_disciplina_turma__disciplina_turma__turma')
    search_fields = ('professor_disciplina_turma__professor__usuario__first_name', 'professor_disciplina_turma__disciplina_turma__turma__numero')
    raw_id_fields = ('professor_disciplina_turma',)
    inlines = [FaltaInline]
    ordering = ('-data',)

@admin.register(Faltas)
class FaltasAdmin(admin.ModelAdmin):
    list_display = ('estudante', 'aula', 'qtd_faltas')
    list_filter = ('aula__data', 'estudante__matriculas_cemep__matriculas_turma__turma')
    search_fields = ('estudante__nome_social', 'estudante__usuario__first_name', 'aula__data')
    raw_id_fields = ('aula', 'estudante')

@admin.register(DescritorOcorrenciaPedagogica)
class DescritorOcorrenciaPedagogicaAdmin(admin.ModelAdmin):
    list_display = ('texto', 'gestor', 'ativo')
    list_filter = ('ativo', 'gestor')
    search_fields = ('texto',)
    raw_id_fields = ('gestor',)

@admin.register(OcorrenciaPedagogica)
class OcorrenciaPedagogicaAdmin(admin.ModelAdmin):
    list_display = ('estudante', 'tipo', 'autor', 'bimestre', 'data')
    list_filter = ('bimestre', 'tipo', 'autor', 'data')
    search_fields = ('estudante__nome_social', 'estudante__usuario__first_name', 'tipo__texto')
    raw_id_fields = ('estudante', 'autor', 'tipo')
    ordering = ('-data',)

@admin.register(OcorrenciaResponsavelCiente)
class OcorrenciaResponsavelCienteAdmin(admin.ModelAdmin):
    list_display = ('responsavel', 'ocorrencia', 'ciente', 'data_ciencia')
    list_filter = ('ciente', 'data_ciencia')
    search_fields = ('responsavel__usuario__first_name', 'responsavel__usuario__last_name', 'ocorrencia__estudante__nome_social')
    raw_id_fields = ('responsavel', 'ocorrencia')

@admin.register(Atividade)
class AtividadeAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'data_inicio', 'data_fim', 'com_visto', 'criado_por')
    list_filter = ('data_inicio', 'data_fim', 'com_visto', 'criado_por')
    search_fields = ('titulo', 'descricao', 'criado_por__username')
    filter_horizontal = ('turmas_professores', 'arquivos', 'habilidades')
    raw_id_fields = ('criado_por',)
    ordering = ('-data_inicio',)
