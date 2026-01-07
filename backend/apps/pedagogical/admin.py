"""
Admin para o App Pedagogical
"""
from django.contrib import admin
from .models import (
    PlanoAula, Aula, Faltas, DescritorOcorrenciaPedagogica, OcorrenciaPedagogica,
    OcorrenciaResponsavelCiente, Avaliacao, InstrumentoAvaliativo, ControleVisto,
    NotaInstrumentoAvaliativo, NotaAvaliacao, NotaBimestral, NotificacaoRecuperacao
)


@admin.register(PlanoAula)
class PlanoAulaAdmin(admin.ModelAdmin):
    list_display = ['professor', 'titulo', 'disciplina', 'ano_letivo', 'bimestre', 'data_inicio', 'data_fim']
    list_filter = ['ano_letivo', 'bimestre', 'disciplina', 'data_inicio']
    search_fields = ['titulo', 'conteudo', 'professor__usuario__first_name', 'professor__usuario__last_name']
    filter_horizontal = ['turmas', 'habilidades']
    raw_id_fields = ['professor', 'disciplina', 'ano_letivo']


@admin.register(Aula)
class AulaAdmin(admin.ModelAdmin):
    list_display = ['professor_disciplina_turma', 'data', 'numero_aulas', 'criado_em']
    list_filter = [
        'data', 
        'professor_disciplina_turma__disciplina_turma__turma__ano_letivo',
        'professor_disciplina_turma__disciplina_turma__turma',
        'professor_disciplina_turma__disciplina_turma__disciplina'
    ]
    search_fields = ['professor_disciplina_turma__professor__usuario__first_name', 'conteudo']
    date_hierarchy = 'data'
    raw_id_fields = ['professor_disciplina_turma']


@admin.register(Faltas)
class FaltasAdmin(admin.ModelAdmin):
    list_display = ['estudante', 'aula', 'qtd_faltas']
    list_filter = [
        'aula__data',
        'aula__professor_disciplina_turma__disciplina_turma__turma',
        'aula__professor_disciplina_turma__disciplina_turma__disciplina'
    ]
    search_fields = ['estudante__nome', 'estudante__ra']
    raw_id_fields = ['aula', 'estudante']


@admin.register(DescritorOcorrenciaPedagogica)
class DescritorOcorrenciaPedagogicaAdmin(admin.ModelAdmin):
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


@admin.register(Avaliacao)
class AvaliacaoAdmin(admin.ModelAdmin):
    list_display = ['professor_disciplina_turma', 'tipo', 'valor', 'tipo_calculo_instrumentos']
    list_filter = [
        'tipo', 
        'tipo_calculo_instrumentos', 
        'professor_disciplina_turma__disciplina_turma__turma__ano_letivo',
        'professor_disciplina_turma__disciplina_turma__turma'
    ]
    search_fields = [
        'professor_disciplina_turma__disciplina_turma__disciplina__nome',
        'professor_disciplina_turma__disciplina_turma__turma__nome'
    ]
    raw_id_fields = ['professor_disciplina_turma']


@admin.register(InstrumentoAvaliativo)
class InstrumentoAvaliativoAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'avaliacao', 'data_inicio', 'data_fim', 'valor', 'peso', 'usa_vistos']
    list_filter = [
        'usa_vistos', 
        'data_inicio', 
        'avaliacao__tipo',
        'avaliacao__professor_disciplina_turma__disciplina_turma__turma'
    ]
    search_fields = [
        'titulo', 
        'avaliacao__professor_disciplina_turma__disciplina_turma__disciplina__nome',
        'avaliacao__professor_disciplina_turma__disciplina_turma__turma__nome'
    ]
    date_hierarchy = 'data_inicio'
    raw_id_fields = ['avaliacao']


@admin.register(ControleVisto)
class ControleVistoAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'matricula_turma', 'professor_disciplina_turma', 'instrumento_avaliativo', 'visto', 'data_visto']
    list_filter = [
        'visto', 
        'data_visto', 
        'professor_disciplina_turma__disciplina_turma__turma__ano_letivo',
        'professor_disciplina_turma__disciplina_turma__turma'
    ]
    search_fields = ['titulo', 'matricula_turma__estudante__nome', 'matricula_turma__estudante__ra']
    date_hierarchy = 'data_visto'
    raw_id_fields = ['matricula_turma', 'professor_disciplina_turma', 'instrumento_avaliativo']


@admin.register(NotaInstrumentoAvaliativo)
class NotaInstrumentoAvaliativoAdmin(admin.ModelAdmin):
    list_display = ['instrumento_avaliativo', 'matricula_turma', 'valor']
    list_filter = [
        'instrumento_avaliativo__avaliacao__tipo', 
        'instrumento_avaliativo__avaliacao__professor_disciplina_turma__disciplina_turma__turma__ano_letivo',
        'instrumento_avaliativo__avaliacao__professor_disciplina_turma__disciplina_turma__turma'
    ]
    search_fields = ['matricula_turma__estudante__nome', 'matricula_turma__estudante__ra', 'instrumento_avaliativo__titulo']
    raw_id_fields = ['instrumento_avaliativo', 'matricula_turma']


@admin.register(NotaAvaliacao)
class NotaAvaliacaoAdmin(admin.ModelAdmin):
    list_display = ['avaliacao', 'matricula_turma', 'valor']
    list_filter = [
        'avaliacao__tipo', 
        'avaliacao__professor_disciplina_turma__disciplina_turma__turma__ano_letivo',
        'avaliacao__professor_disciplina_turma__disciplina_turma__turma'
    ]
    search_fields = [
        'matricula_turma__estudante__nome', 
        'matricula_turma__estudante__ra',
        'avaliacao__professor_disciplina_turma__disciplina_turma__disciplina__nome'
    ]
    raw_id_fields = ['avaliacao', 'matricula_turma']


@admin.register(NotaBimestral)
class NotaBimestralAdmin(admin.ModelAdmin):
    list_display = ['matricula_turma', 'professor_disciplina_turma', 'nota']
    list_filter = [
        'professor_disciplina_turma__disciplina_turma__turma__ano_letivo',
        'professor_disciplina_turma__disciplina_turma__turma'
    ]
    search_fields = ['matricula_turma__estudante__nome', 'matricula_turma__estudante__ra']
    raw_id_fields = ['matricula_turma', 'professor_disciplina_turma']


@admin.register(NotificacaoRecuperacao)
class NotificacaoRecuperacaoAdmin(admin.ModelAdmin):
    list_display = ['estudante', 'professor_disciplina_turma', 'visualizado', 'data_visualizacao']
    list_filter = ['visualizado', 'professor_disciplina_turma__disciplina_turma__turma']
    search_fields = ['estudante__nome', 'estudante__ra']
    raw_id_fields = ['estudante', 'professor_disciplina_turma']

