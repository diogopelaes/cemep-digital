"""
Admin para o App Academic
"""
from django.contrib import admin
from .models import (
    Estudante, Responsavel, ResponsavelEstudante,
    MatriculaCEMEP, MatriculaTurma, Atestado
)


class ResponsavelEstudanteInline(admin.TabularInline):
    model = ResponsavelEstudante
    extra = 1
    raw_id_fields = ['responsavel', 'estudante']


@admin.register(Estudante)
class EstudanteAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'cpf', 'cin', 'nome_social', 'data_nascimento', 'telefone', 'bolsa_familia', 'pe_de_meia']
    list_filter = ['bolsa_familia', 'pe_de_meia', 'usa_onibus', 'bairro', 'cidade']
    search_fields = ['usuario__first_name', 'usuario__last_name', 'cpf', 'cin', 'nome_social']
    inlines = [ResponsavelEstudanteInline]
    raw_id_fields = ['usuario']


@admin.register(Responsavel)
class ResponsavelAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'cpf', 'telefone']
    search_fields = ['usuario__first_name', 'usuario__last_name', 'usuario__email', 'cpf']
    inlines = [ResponsavelEstudanteInline]
    raw_id_fields = ['usuario']


@admin.register(MatriculaCEMEP)
class MatriculaCEMEPAdmin(admin.ModelAdmin):
    list_display = ['numero_matricula', 'estudante', 'curso', 'status', 'data_entrada']
    list_filter = ['status', 'curso']
    search_fields = ['numero_matricula', 'estudante__usuario__first_name', 'estudante__cpf']
    raw_id_fields = ['estudante']


@admin.register(MatriculaTurma)
class MatriculaTurmaAdmin(admin.ModelAdmin):
    list_display = ['mumero_chamada', 'matricula_cemep', 'turma', 'status', 'data_entrada']
    list_filter = ['status', 'turma__ano_letivo', 'turma__curso', 'turma']
    search_fields = ['matricula_cemep__estudante__usuario__first_name', 'matricula_cemep__numero_matricula']
    raw_id_fields = ['matricula_cemep', 'turma']


@admin.register(Atestado)
class AtestadoAdmin(admin.ModelAdmin):
    list_display = ['usuario_alvo', 'data_inicio', 'data_fim', 'protocolo_prefeitura', 'criado_por']
    list_filter = ['data_inicio', 'criado_em']
    search_fields = ['usuario_alvo__first_name', 'usuario_alvo__last_name', 'protocolo_prefeitura']
    raw_id_fields = ['usuario_alvo', 'criado_por']

