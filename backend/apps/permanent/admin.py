"""
Admin para o App Permanent
"""
from django.contrib import admin
from .models import (
    DadosPermanenteEstudante, DadosPermanenteResponsavel,
    HistoricoEscolar, HistoricoEscolarAnoLetivo, HistoricoEscolarNotas,
    OcorrenciaDisciplinar, OcorrenciaDisciplinarAnexo
)


class DadosPermanenteResponsavelInline(admin.TabularInline):
    model = DadosPermanenteResponsavel
    extra = 0


class HistoricoEscolarInline(admin.StackedInline):
    model = HistoricoEscolar
    extra = 0


@admin.register(DadosPermanenteEstudante)
class DadosPermanenteEstudanteAdmin(admin.ModelAdmin):
    list_display = ['nome', 'cpf', 'data_nascimento', 'email']
    search_fields = ['nome', 'cpf', 'email']
    inlines = [DadosPermanenteResponsavelInline, HistoricoEscolarInline]


@admin.register(DadosPermanenteResponsavel)
class DadosPermanenteResponsavelAdmin(admin.ModelAdmin):
    list_display = ['nome', 'cpf', 'estudante', 'parentesco']
    search_fields = ['nome', 'cpf']
    list_filter = ['parentesco']


class HistoricoEscolarAnoLetivoInline(admin.TabularInline):
    model = HistoricoEscolarAnoLetivo
    extra = 0


@admin.register(HistoricoEscolar)
class HistoricoEscolarAdmin(admin.ModelAdmin):
    list_display = ['estudante', 'numero_matricula', 'nome_curso', 'concluido']
    search_fields = ['estudante__nome', 'numero_matricula']
    list_filter = ['concluido']
    inlines = [HistoricoEscolarAnoLetivoInline]


class HistoricoEscolarNotasInline(admin.TabularInline):
    model = HistoricoEscolarNotas
    extra = 0


@admin.register(HistoricoEscolarAnoLetivo)
class HistoricoEscolarAnoLetivoAdmin(admin.ModelAdmin):
    list_display = ['historico', 'ano_letivo', 'status_final']
    list_filter = ['ano_letivo', 'status_final']
    inlines = [HistoricoEscolarNotasInline]


@admin.register(HistoricoEscolarNotas)
class HistoricoEscolarNotasAdmin(admin.ModelAdmin):
    list_display = ['ano_letivo_ref', 'nome_disciplina', 'nota_final', 'frequencia_total']
    list_filter = ['ano_letivo_ref__ano_letivo']


class OcorrenciaDisciplinarAnexoInline(admin.TabularInline):
    model = OcorrenciaDisciplinarAnexo
    extra = 1


@admin.register(OcorrenciaDisciplinar)
class OcorrenciaDisciplinarAdmin(admin.ModelAdmin):
    list_display = ['nome_estudante', 'cpf', 'ano_letivo', 'bimestre', 'autor_nome', 'data_ocorrido']
    search_fields = ['nome_estudante', 'cpf', 'descricao']
    list_filter = ['ano_letivo', 'bimestre', 'data_ocorrido']
    date_hierarchy = 'data_ocorrido'
    inlines = [OcorrenciaDisciplinarAnexoInline]

