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


@admin.register(Estudante)
class EstudanteAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'cpf', 'nome_social', 'data_nascimento', 'bolsa_familia']
    list_filter = ['bolsa_familia', 'pe_de_meia', 'usa_onibus']
    search_fields = ['usuario__first_name', 'usuario__last_name', 'cpf', 'nome_social']
    inlines = [ResponsavelEstudanteInline]


@admin.register(Responsavel)
class ResponsavelAdmin(admin.ModelAdmin):
    list_display = ['usuario']
    search_fields = ['usuario__first_name', 'usuario__last_name', 'usuario__email']
    inlines = [ResponsavelEstudanteInline]


@admin.register(MatriculaCEMEP)
class MatriculaCEMEPAdmin(admin.ModelAdmin):
    list_display = ['numero_matricula', 'estudante', 'curso', 'status', 'data_entrada']
    list_filter = ['status', 'curso']
    search_fields = ['numero_matricula', 'estudante__usuario__first_name', 'estudante__cpf']


@admin.register(MatriculaTurma)
class MatriculaTurmaAdmin(admin.ModelAdmin):
    list_display = ['estudante', 'turma', 'status', 'data_entrada']
    list_filter = ['status', 'turma__ano_letivo', 'turma__curso']
    search_fields = ['estudante__usuario__first_name', 'estudante__cpf']


@admin.register(Atestado)
class AtestadoAdmin(admin.ModelAdmin):
    list_display = ['usuario_alvo', 'data_inicio', 'data_fim', 'protocolo_prefeitura']
    list_filter = ['data_inicio']
    search_fields = ['usuario_alvo__first_name', 'protocolo_prefeitura']

