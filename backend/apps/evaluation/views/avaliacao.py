"""
ViewSets para Avaliações.

Este módulo contém a ViewSet principal para o gerenciamento de avaliações,
centralizando a lógica de permissions e actions customizadas.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.evaluation.models import Avaliacao, AvaliacaoConfigDisciplinaTurma
from apps.evaluation.serializers import (
    AvaliacaoSerializer,
    AvaliacaoListSerializer,
    AvaliacaoChoicesSerializer,
    AvaliacaoConfigDisciplinaTurmaSerializer
)
from apps.core.models import ProfessorDisciplinaTurma
from apps.users.permissions import IsCreatorOrReadOnly, AnoLetivoFilterMixin
from django.utils import timezone
from apps.evaluation.config import get_config_from_ano_letivo


class AvaliacaoViewSet(AnoLetivoFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet para Avaliações.
    
    Permissões:
    - Create: Apenas PROFESSOR (para suas turmas)
    - Read: Qualquer autenticado
    - Update/Delete: Apenas o criador (criado_por)
    """
    queryset = Avaliacao.objects.select_related(
        'ano_letivo',
        'criado_por'
    ).prefetch_related(
        'professores_disciplinas_turmas__disciplina_turma__turma__curso',
        'professores_disciplinas_turmas__disciplina_turma__disciplina',
        'professores_disciplinas_turmas__professor__usuario',
        'habilidades'
    )
    
    permission_classes = [IsCreatorOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    
    # Filtros
    filterset_fields = {
        'bimestre': ['exact'],
        'tipo': ['exact'],
        'data_inicio': ['gte', 'lte'],
        'data_fim': ['gte', 'lte'],
    }
    ano_letivo_field = 'ano_letivo__ano'

    def get_serializer_class(self):
        if self.action == 'list':
            return AvaliacaoListSerializer
        return AvaliacaoSerializer

    def get_queryset(self):
        """
        Refina o queryset base:
        - PROFESSOR: avaliações que criou ou tem vínculo via PDT
        - OUTROS: todas do ano letivo selecionado
        """
        qs = super().get_queryset()
        user = self.request.user
        
        if user.tipo_usuario == 'PROFESSOR':
            # Professor vê avaliações que criou OU que está vinculado
            from django.db.models import Q
            qs = qs.filter(
                Q(criado_por=user) |
                Q(professores_disciplinas_turmas__professor__usuario=user)
            ).distinct()
        
        return qs.order_by('-data_inicio', '-criado_em')

    def get_serializer_context(self):
        """Adiciona request ao contexto do serializer."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


    # =========================================================================
    # ACTIONS: DADOS AUXILIARES
    # =========================================================================

    @action(detail=False, methods=['get'])
    def choices(self, request):
        """
        Retorna dados para o formulário de nova avaliação:
        - Atribuições (Turmas/Disciplinas) do professor no ano selecionado.
        - Tipos de avaliação.
        - Valor máximo permitido.
        - Dias letivos do ano.
        """
        user = request.user
        
        if not hasattr(user, 'funcionario'):
            return Response({'error': 'Usuário sem vínculo de funcionário.'}, status=400)

        ano_selecionado = user.get_ano_letivo_selecionado()
        
        if not ano_selecionado:
            return Response({'error': 'Nenhum ano letivo selecionado.'}, status=400)

        # Busca Atribuições do professor
        atribuicoes = ProfessorDisciplinaTurma.objects.filter(
            professor=user.funcionario,
            disciplina_turma__turma__ano_letivo=ano_selecionado.ano
        ).select_related(
            'disciplina_turma__turma__curso',
            'disciplina_turma__disciplina'
        ).order_by(
            'disciplina_turma__turma__numero',
            'disciplina_turma__turma__letra',
            'disciplina_turma__disciplina__nome'
        )

        # Verifica configurações existentes para estas turmas
        disciplinas_turmas_ids = [pdt.disciplina_turma_id for pdt in atribuicoes]
        configs_existentes = AvaliacaoConfigDisciplinaTurma.objects.filter(
            ano_letivo=ano_selecionado,
            disciplina_turma_id__in=disciplinas_turmas_ids
        )
        configs_map = {str(c.disciplina_turma_id): c for c in configs_existentes}

        # Identifica as turmas que ainda não têm configuração
        tem_pendencia = False
        for dt_id in disciplinas_turmas_ids:
            if str(dt_id) not in configs_map:
                tem_pendencia = True
                break

        # Verifica se o professor tem formas de cálculo mistas
        formas_calculo_unicas = set(c.forma_calculo for c in configs_existentes)
        has_mixed_methods = len(formas_calculo_unicas) > 1

        serializer = AvaliacaoChoicesSerializer(atribuicoes)
        
        data = serializer.data
        data['ano_letivo'] = ano_selecionado.ano
        data['has_pending_configs'] = tem_pendencia
        data['has_mixed_methods'] = has_mixed_methods
        data['available_methods'] = list(formas_calculo_unicas) if has_mixed_methods else []
        
        # Adiciona a forma_calculo específica para cada atribuição (usado no frontend)
        for attr in data['atribuicoes']:
            config = configs_map.get(attr['disciplina_turma_id']) # Nota: AvaliacaoChoicesSerializer precisa retornar disciplina_turma_id
            if config:
                attr['forma_calculo'] = config.forma_calculo
                attr['pode_alterar_config'] = config.pode_alterar
            else:
                attr['forma_calculo'] = None
                attr['pode_alterar_config'] = True

        # Pega direto do cache (já em formato ISO string)
        bim = ano_selecionado.bimestre()
        data['datasLiberadas'] = ano_selecionado.controles.get(str(bim), {}).get('dias_letivos_base', []) if bim else []
        data['data_atual'] = timezone.localdate().isoformat()
        data['config'] = get_config_from_ano_letivo(ano_selecionado)
        
        return Response(data)
