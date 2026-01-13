"""
Admin para o App Pedagogical
"""
from django.contrib import admin
from .models import (
    PlanoAula, Aula, Faltas, DescritorOcorrenciaPedagogica, OcorrenciaPedagogica,
    OcorrenciaResponsavelCiente, Atividade
)


@admin.register(Atividade)
class AtividadeAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'data_inicio', 'data_fim', 'com_visto', 'criado_por', 'criado_em']
    list_filter = ['data_inicio', 'com_visto', 'turmas_professores__disciplina_turma__turma', 'turmas_professores__disciplina_turma__disciplina']
    search_fields = ['titulo', 'descricao', 'criado_por__first_name', 'criado_por__last_name']
    filter_horizontal = ['turmas_professores', 'arquivos']
    raw_id_fields = ['criado_por']
    date_hierarchy = 'data_inicio'


@admin.register(PlanoAula)
class PlanoAulaAdmin(admin.ModelAdmin):
    list_display = ['professor', 'titulo', 'disciplina', 'ano_letivo', 'bimestre', 'data_inicio', 'data_fim']
    list_filter = ['ano_letivo', 'bimestre', 'disciplina', 'data_inicio']
    search_fields = ['titulo', 'conteudo', 'professor__usuario__first_name', 'professor__usuario__last_name']
    filter_horizontal = ['turmas', 'habilidades']
    raw_id_fields = ['professor', 'disciplina', 'ano_letivo']


@admin.register(Aula)
class AulaAdmin(admin.ModelAdmin):
    list_display = ['professor_disciplina_turma', 'data', 'numero_aulas', 'bimestre', 'criado_em']
    list_filter = [
        'data',
        'bimestre',
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
    list_display = ['estudante', 'tipo', 'autor', 'bimestre', 'data']
    list_filter = ['tipo', 'bimestre', 'data']
    date_hierarchy = 'data'


@admin.register(OcorrenciaResponsavelCiente)
class OcorrenciaResponsavelCienteAdmin(admin.ModelAdmin):
    list_display = ['responsavel', 'ocorrencia', 'ciente', 'data_ciencia']
    list_filter = ['ciente']
