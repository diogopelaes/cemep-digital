from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Funcionario, PeriodoTrabalho,
    Disciplina,
    Curso,
    Turma, DisciplinaTurma, ProfessorDisciplinaTurma,
    Habilidade,
    DiaLetivoExtra, DiaNaoLetivo, AnoLetivo, ControleRegistrosVisualizacao,
    HorarioAula, GradeHorariaValidade, GradeHoraria,
    AnoLetivoSelecionado,
    Arquivo
)

@admin.register(Funcionario)
class FuncionarioAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'matricula', 'apelido', 'area_atuacao', 'cpf', 'telefone')
    search_fields = ('usuario__first_name', 'usuario__last_name', 'matricula', 'apelido', 'cpf')
    list_filter = ('area_atuacao', 'cidade', 'estado')
    raw_id_fields = ('usuario',)

@admin.register(PeriodoTrabalho)
class PeriodoTrabalhoAdmin(admin.ModelAdmin):
    list_display = ('funcionario', 'data_entrada', 'data_saida')
    search_fields = ('funcionario__usuario__first_name', 'funcionario__usuario__last_name')
    list_filter = ('data_entrada',)
    autocomplete_fields = ('funcionario',)

@admin.register(Disciplina)
class DisciplinaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'sigla', 'area_conhecimento', 'is_active')
    search_fields = ('nome', 'sigla')
    list_filter = ('area_conhecimento', 'is_active')
    filter_horizontal = ('habilidades',)

@admin.register(Curso)
class CursoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'sigla', 'is_active')
    search_fields = ('nome', 'sigla')
    list_filter = ('is_active',)

class DisciplinaTurmaInline(admin.TabularInline):
    model = DisciplinaTurma
    extra = 0
    autocomplete_fields = ('disciplina',)

@admin.register(Turma)
class TurmaAdmin(admin.ModelAdmin):
    list_display = ('nome_completo', 'numero', 'letra', 'ano_letivo', 'curso', 'nomenclatura', 'is_active')
    search_fields = ('numero', 'letra', 'ano_letivo')
    list_filter = ('ano_letivo', 'curso', 'nomenclatura', 'is_active')
    filter_horizontal = ('professores_representantes',)
    inlines = [DisciplinaTurmaInline]

@admin.register(DisciplinaTurma)
class DisciplinaTurmaAdmin(admin.ModelAdmin):
    list_display = ('disciplina', 'turma', 'aulas_semanais')
    search_fields = ('disciplina__nome', 'turma__numero', 'turma__letra')
    list_filter = ('turma__ano_letivo', 'disciplina__area_conhecimento')
    autocomplete_fields = ('disciplina', 'turma')

@admin.register(ProfessorDisciplinaTurma)
class ProfessorDisciplinaTurmaAdmin(admin.ModelAdmin):
    list_display = ('professor', 'disciplina_turma', 'tipo', 'data_inicio', 'data_fim')
    search_fields = ('professor__usuario__first_name', 'disciplina_turma__disciplina__nome')
    list_filter = ('tipo', 'data_inicio')
    autocomplete_fields = ('professor', 'disciplina_turma')

@admin.register(Habilidade)
class HabilidadeAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'get_descricao_short', 'is_active')
    search_fields = ('codigo', 'descricao')
    list_filter = ('is_active',)

    def get_descricao_short(self, obj):
        return format_html(obj.descricao[:100] + '...' if len(obj.descricao) > 100 else obj.descricao)
    get_descricao_short.short_description = 'Descrição'

@admin.register(DiaLetivoExtra)
class DiaLetivoExtraAdmin(admin.ModelAdmin):
    list_display = ('data', 'descricao')
    search_fields = ('descricao',)
    date_hierarchy = 'data'

@admin.register(DiaNaoLetivo)
class DiaNaoLetivoAdmin(admin.ModelAdmin):
    list_display = ('data', 'tipo', 'descricao')
    search_fields = ('descricao',)
    list_filter = ('tipo',)
    date_hierarchy = 'data'

class ControleRegistrosVisualizacaoInline(admin.TabularInline):
    model = ControleRegistrosVisualizacao
    extra = 0

@admin.register(AnoLetivo)
class AnoLetivoAdmin(admin.ModelAdmin):
    list_display = ('ano', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('ano',)
    filter_horizontal = ('dias_letivos_extras', 'dias_nao_letivos')
    
    fieldsets = (
        (None, {
            'fields': ('ano', 'is_active', 'numero_chamadas_turmas_travadas')
        }),
        ('Bimestres', {
            'fields': (
                ('data_inicio_1bim', 'data_fim_1bim'),
                ('data_inicio_2bim', 'data_fim_2bim'),
                ('data_inicio_3bim', 'data_fim_3bim'),
                ('data_inicio_4bim', 'data_fim_4bim'),
            )
        }),
        ('Dias Especiais', {
            'fields': ('dias_letivos_extras', 'dias_nao_letivos')
        }),
        ('Controles JSON', {
            'fields': ('controles', 'datas_liberadas_aulas_faltas'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [ControleRegistrosVisualizacaoInline]

@admin.register(ControleRegistrosVisualizacao)
class ControleRegistrosVisualizacaoAdmin(admin.ModelAdmin):
    list_display = ('ano_letivo', 'bimestre', 'tipo', 'status_liberacao', 'digitacao_futura')
    list_filter = ('ano_letivo', 'bimestre', 'tipo', 'digitacao_futura')
    search_fields = ('ano_letivo__ano',)

@admin.register(HorarioAula)
class HorarioAulaAdmin(admin.ModelAdmin):
    list_display = ('ano_letivo', 'dia_semana', 'numero', 'hora_inicio', 'hora_fim')
    list_filter = ('ano_letivo', 'dia_semana')
    ordering = ('ano_letivo', 'dia_semana', 'hora_inicio')
    search_fields = ('numero', 'ano_letivo__ano')

@admin.register(GradeHorariaValidade)
class GradeHorariaValidadeAdmin(admin.ModelAdmin):
    list_display = ('ano_letivo', 'turma_numero', 'turma_letra', 'data_inicio', 'data_fim')
    list_filter = ('ano_letivo',)
    search_fields = ('turma_numero', 'turma_letra')

@admin.register(GradeHoraria)
class GradeHorariaAdmin(admin.ModelAdmin):
    list_display = ('validade', 'horario_aula', 'disciplina', 'curso')
    list_filter = ('validade__ano_letivo', 'curso', 'horario_aula__dia_semana')
    search_fields = ('disciplina__nome',)
    autocomplete_fields = ('validade', 'horario_aula', 'disciplina', 'curso')

@admin.register(AnoLetivoSelecionado)
class AnoLetivoSelecionadoAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'ano_letivo')
    search_fields = ('usuario__first_name', 'usuario__last_name', 'usuario__username')
    list_filter = ('ano_letivo',)
    autocomplete_fields = ('usuario', 'ano_letivo')

@admin.register(Arquivo)
class ArquivoAdmin(admin.ModelAdmin):
    list_display = ('nome_original', 'categoria', 'tamanho_formatado', 'criado_por', 'criado_em')
    list_filter = ('categoria', 'criado_em', 'ano_letivo', 'disciplina_sigla')
    search_fields = ('nome_original', 'criado_por__first_name', 'turma_numero', 'turma_letra')
    readonly_fields = ('tamanho', 'mime_type', 'criado_em', 'criado_por', 'nome_original')
    
    def tamanho_formatado(self, obj):
        if not obj.tamanho:
            return "-"
        for unit in ['B', 'KB', 'MB', 'GB']:
            if obj.tamanho < 1024:
                return f"{obj.tamanho:.2f} {unit}"
            obj.tamanho /= 1024
        return f"{obj.tamanho:.2f} TB"
    tamanho_formatado.short_description = "Tamanho"
