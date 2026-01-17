from django.contrib import admin
from .models import (
    PlanoAula, Aula, Faltas,
    DescritorOcorrenciaPedagogica, OcorrenciaPedagogica, OcorrenciaResponsavelCiente,
    Atividade
)

@admin.register(PlanoAula)
class PlanoAulaAdmin(admin.ModelAdmin):
    list_display = ('professor', 'disciplina', 'titulo', 'data_inicio', 'data_fim', 'ano_letivo', 'bimestre')
    list_filter = ('ano_letivo', 'bimestre', 'disciplina')
    search_fields = ('titulo', 'professor__usuario__first_name', 'disciplina__nome')
    filter_horizontal = ('turmas', 'habilidades')
    raw_id_fields = ('professor', 'disciplina', 'ano_letivo')

@admin.register(Aula)
class AulaAdmin(admin.ModelAdmin):
    list_display = ('professor_disciplina_turma', 'data', 'numero_aulas', 'bimestre')
    list_filter = ('bimestre', 'data')
    search_fields = ('professor_disciplina_turma__professor__usuario__first_name',)
    raw_id_fields = ('professor_disciplina_turma',)

@admin.register(Faltas)
class FaltasAdmin(admin.ModelAdmin):
    list_display = ('aula', 'estudante', 'qtd_faltas')
    search_fields = ('estudante__nome_social', 'estudante__matricula_cemep__matricula')
    raw_id_fields = ('aula', 'estudante')

@admin.register(DescritorOcorrenciaPedagogica)
class DescritorOcorrenciaPedagogicaAdmin(admin.ModelAdmin):
    list_display = ('texto', 'ativo')
    list_filter = ('ativo',)
    search_fields = ('texto',)

@admin.register(OcorrenciaPedagogica)
class OcorrenciaPedagogicaAdmin(admin.ModelAdmin):
    list_display = ('estudante', 'tipo', 'autor', 'data', 'bimestre')
    list_filter = ('tipo', 'bimestre', 'data')
    search_fields = ('estudante__nome_social', 'autor__usuario__first_name', 'tipo__texto')
    raw_id_fields = ('estudante', 'autor', 'tipo')

@admin.register(OcorrenciaResponsavelCiente)
class OcorrenciaResponsavelCienteAdmin(admin.ModelAdmin):
    list_display = ('responsavel', 'ocorrencia', 'ciente', 'data_ciencia')
    list_filter = ('ciente', 'data_ciencia')
    raw_id_fields = ('responsavel', 'ocorrencia')

@admin.register(Atividade)
class AtividadeAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'data_inicio', 'data_fim', 'com_visto', 'criado_por')
    list_filter = ('com_visto', 'data_inicio')
    search_fields = ('titulo', 'descricao')
    filter_horizontal = ('turmas_professores', 'arquivos', 'habilidades')
    raw_id_fields = ('criado_por',)
