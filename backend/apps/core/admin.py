"""
Admin para o App Core
"""
from django.contrib import admin
from .models import (
    Funcionario, PeriodoTrabalho, Disciplina, Curso, Turma,
    DisciplinaTurma, ProfessorDisciplinaTurma, Habilidade,
    AnoLetivo, DiaLetivoExtra, DiaNaoLetivo, HorarioAula, GradeHoraria,
    GradeHorariaValidade, ControleRegistrosVisualizacao, AnoLetivoSelecionado,
    Arquivo
)


@admin.register(Arquivo)
class ArquivoAdmin(admin.ModelAdmin):
    list_display = ['id', 'nome_original', 'categoria', 'tamanho', 'mime_type', 'criado_em', 'criado_por']
    list_filter = ['categoria', 'ano_letivo', 'criado_em']
    search_fields = ['nome_original', 'criado_por__first_name', 'criado_por__last_name']
    raw_id_fields = ['criado_por']
    readonly_fields = ['tamanho', 'mime_type', 'criado_em']


@admin.register(Funcionario)
class FuncionarioAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'matricula', 'cpf', 'get_apelido', 'area_atuacao']
    list_filter = ['usuario__tipo_usuario', 'area_atuacao', 'estado', 'cidade']
    search_fields = ['usuario__first_name', 'usuario__last_name', 'area_atuacao', 'matricula', 'cpf', 'apelido']
    raw_id_fields = ['usuario']
    fieldsets = (
        ('Dados Pessoais', {
            'fields': ('usuario', 'nome_social', 'cpf', 'cin', 'data_nascimento', 'telefone')
        }),
        ('Dados Profissionais', {
            'fields': ('matricula', 'area_atuacao', 'apelido', 'data_admissao')
        }),
        ('Endereço', {
            'fields': ('logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep')
        }),
        ('Cache', {
            'fields': ('grade_horaria',),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Apelido')
    def get_apelido(self, obj):
        return obj.get_apelido()


@admin.register(PeriodoTrabalho)
class PeriodoTrabalhoAdmin(admin.ModelAdmin):
    list_display = ['funcionario', 'data_entrada', 'data_saida']
    list_filter = ['data_entrada']
    search_fields = ['funcionario__usuario__first_name', 'funcionario__usuario__last_name']
    raw_id_fields = ['funcionario']


@admin.register(Disciplina)
class DisciplinaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'sigla', 'is_active']
    list_filter = ['is_active']
    search_fields = ['nome', 'sigla']
    filter_horizontal = ['habilidades']


@admin.register(Curso)
class CursoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'sigla', 'is_active']
    search_fields = ['nome', 'sigla']


@admin.register(Turma)
class TurmaAdmin(admin.ModelAdmin):
    list_display = ['numero', 'letra', 'ano_letivo', 'nomenclatura', 'curso', 'is_active']
    list_filter = ['ano_letivo', 'curso', 'nomenclatura', 'is_active']
    search_fields = ['numero', 'letra', 'curso__nome', 'curso__sigla']
    filter_horizontal = ['professores_representantes']
    raw_id_fields = ['curso']
    fieldsets = (
        (None, {
            'fields': ('numero', 'letra', 'ano_letivo', 'nomenclatura', 'curso', 'is_active')
        }),
        ('Representantes', {
            'fields': ('professores_representantes',)
        }),
        ('Cache', {
            'fields': ('grade_horaria',),
            'classes': ('collapse',),
        }),
    )


@admin.register(DisciplinaTurma)
class DisciplinaTurmaAdmin(admin.ModelAdmin):
    list_display = ['disciplina', 'turma', 'aulas_semanais']
    list_filter = ['turma__ano_letivo', 'disciplina', 'turma__curso']
    raw_id_fields = ['disciplina', 'turma']
    search_fields = ['disciplina__nome', 'turma__numero', 'turma__letra']


@admin.register(ProfessorDisciplinaTurma)
class ProfessorDisciplinaTurmaAdmin(admin.ModelAdmin):
    list_display = ['professor', 'disciplina_turma', 'tipo', 'data_inicio', 'data_fim']
    list_filter = ['tipo', 'disciplina_turma__turma__ano_letivo', 'disciplina_turma__turma__curso']
    search_fields = ['professor__usuario__first_name', 'professor__usuario__last_name', 'disciplina_turma__disciplina__nome']
    raw_id_fields = ['professor', 'disciplina_turma']


@admin.register(Habilidade)
class HabilidadeAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'descricao', 'is_active']
    list_filter = ['is_active']
    search_fields = ['codigo', 'descricao']


@admin.register(DiaLetivoExtra)
class DiaLetivoExtraAdmin(admin.ModelAdmin):
    list_display = ['data', 'descricao']
    date_hierarchy = 'data'


@admin.register(DiaNaoLetivo)
class DiaNaoLetivoAdmin(admin.ModelAdmin):
    list_display = ['data', 'tipo', 'descricao']
    list_filter = ['tipo']
    date_hierarchy = 'data'


@admin.register(AnoLetivo)
class AnoLetivoAdmin(admin.ModelAdmin):
    list_display = ['ano', 'is_active']
    list_filter = ['is_active']
    search_fields = ['ano']
    readonly_fields = ['controles', 'datas_liberadas_aulas_faltas']
    fieldsets = (
        (None, {
            'fields': ('ano', 'is_active', 'numero_chamadas_turmas_travadas')
        }),
        ('1º Bimestre', {
            'fields': (('data_inicio_1bim', 'data_fim_1bim'),)
        }),
        ('2º Bimestre', {
            'fields': (('data_inicio_2bim', 'data_fim_2bim'),)
        }),
        ('3º Bimestre', {
            'fields': (('data_inicio_3bim', 'data_fim_3bim'),)
        }),
        ('4º Bimestre', {
            'fields': (('data_inicio_4bim', 'data_fim_4bim'),)
        }),
        ('Calendário Especial', {
            'fields': ('dias_letivos_extras', 'dias_nao_letivos')
        }),
        ('Cache de Controles', {
            'fields': ('controles', 'datas_liberadas_aulas_faltas'),
            'classes': ('collapse',),
        }),
    )
    filter_horizontal = ['dias_letivos_extras', 'dias_nao_letivos']


@admin.register(HorarioAula)
class HorarioAulaAdmin(admin.ModelAdmin):
    list_display = ['ano_letivo', 'dia_semana', 'numero', 'hora_inicio', 'hora_fim']
    list_filter = ['ano_letivo', 'dia_semana']
    ordering = ['ano_letivo', 'dia_semana', 'hora_inicio']
    raw_id_fields = ['ano_letivo']


@admin.register(GradeHorariaValidade)
class GradeHorariaValidadeAdmin(admin.ModelAdmin):
    list_display = ['ano_letivo', 'turma_numero', 'turma_letra', 'data_inicio', 'data_fim']
    list_filter = ['ano_letivo', 'turma_numero', 'turma_letra']
    search_fields = ['turma_numero', 'turma_letra']
    raw_id_fields = ['ano_letivo']


@admin.register(GradeHoraria)
class GradeHorariaAdmin(admin.ModelAdmin):
    list_display = ['validade', 'horario_aula', 'disciplina', 'curso']
    list_filter = ['validade__ano_letivo', 'curso', 'horario_aula__dia_semana']
    search_fields = ['validade__turma_numero', 'validade__turma_letra', 'disciplina__nome']
    raw_id_fields = ['validade', 'horario_aula', 'disciplina', 'curso']


@admin.register(AnoLetivoSelecionado)
class AnoLetivoSelecionadoAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'ano_letivo']
    list_filter = ['ano_letivo']
    search_fields = ['usuario__username', 'usuario__first_name']
    raw_id_fields = ['usuario', 'ano_letivo']


@admin.register(ControleRegistrosVisualizacao)
class ControleRegistrosVisualizacaoAdmin(admin.ModelAdmin):
    list_display = ['ano_letivo', 'bimestre', 'tipo', 'data_inicio', 'data_fim', 'digitacao_futura', 'status_liberacao']
    list_filter = ['ano_letivo', 'bimestre', 'tipo']
    list_editable = ['data_inicio', 'data_fim', 'digitacao_futura']
    ordering = ['ano_letivo', 'bimestre', 'tipo']
    raw_id_fields = ['ano_letivo']

    @admin.display(description='Status')
    def status_liberacao(self, obj):
        return obj.status_liberacao
