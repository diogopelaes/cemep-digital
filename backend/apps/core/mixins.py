"""
Mixins reutilizáveis para Views do Core.
"""

class AnoLetivoFilterMixin:
    """
    MIXIN CRÍTICO PARA FILTRAGEM GLOBAL POR ANO LETIVO.
    
    O QUE É ESSA MERDA:
    Este mixin intercepta o `get_queryset` das ViewSets e aplica um filtro obrigatório
    baseado no Ano Letivo que o usuário selecionou no frontend/sessão.
    
    PARA QUE SERVE:
    Impede que dados de 2024 apareçam quando o usuário está operando em 2025.
    Sem isso, as listas trariam dados misturados de todos os anos, causando caos
    na interface do professor e da secretaria.
    
    ONDE É USADO:
    Em quase todas as views principais do sistema acadêmico/pedagógico que dependem de contexto temporal:
    - Turmas (apps.core.views.turma)
    - Disciplinas da Turma (apps.core.views.disciplina_turma)
    - Aulas e Faltas (apps.pedagogical.views.aula_faltas)
    - Avaliações (apps.evaluation.views.avaliacao)
    - Horários de Aula (apps.core.views.horario_aula)
    
    COMO USAR:
    1. Herde este mixin na ViewSet.
    2. Defina o atributo `ano_letivo_field` apontando para o campo do modelo que guarda o ano.
       Ex: 'ano_letivo' (int) ou 'turma__ano_letivo' (lookup).
    """
    ano_letivo_field = 'ano_letivo'  # Campo padrão, sobrescreva na view
    
    def get_queryset(self):
        qs = super().get_queryset()
        # Assume que o request tem o user (autenticado)
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            ano = self.request.user.get_ano_letivo_selecionado()
            if ano:
                qs = qs.filter(**{self.ano_letivo_field: ano.ano})
        return qs
