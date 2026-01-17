from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.evaluation.models import AvaliacaoConfigDisciplinaTurma
from apps.evaluation.serializers.avaliacao_config_disciplina_turma import AvaliacaoConfigDisciplinaTurmaSerializer
from apps.core.models import ProfessorDisciplinaTurma, DisciplinaTurma


class AvaliacaoConfigDisciplinaTurmaViewSet(viewsets.ModelViewSet):
    queryset = AvaliacaoConfigDisciplinaTurma.objects.all()
    serializer_class = AvaliacaoConfigDisciplinaTurmaSerializer


    def get_queryset(self):
        user = self.request.user
        ano_selecionado = user.get_ano_letivo_selecionado()
        if not ano_selecionado:
            return AvaliacaoConfigDisciplinaTurma.objects.none()
        
        return self.queryset.filter(
            ano_letivo=ano_selecionado,
            disciplina_turma__professores__professor__usuario=user
        ).distinct().order_by(
            'disciplina_turma__turma__numero', 
            'disciplina_turma__turma__letra', 
            'disciplina_turma__disciplina__nome'
        )

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Retorna DisciplinaTurmas do professor que ainda não têm configuração no ano selecionado."""
        user = request.user
        ano_selecionado = user.get_ano_letivo_selecionado()
        if not ano_selecionado:
            return Response({'error': 'Nenhum ano letivo selecionado.'}, status=400)

        # 1. Busca IDs únicos de DisciplinaTurma vinculados ao professor no ano
        dt_ids = ProfessorDisciplinaTurma.objects.filter(
            professor__usuario=user,
            disciplina_turma__turma__ano_letivo=ano_selecionado.ano
        ).values_list('disciplina_turma_id', flat=True).distinct()

        # 2. Identifica quais já possuem configuração
        configuradas_ids = AvaliacaoConfigDisciplinaTurma.objects.filter(
            ano_letivo=ano_selecionado,
            disciplina_turma_id__in=dt_ids
        ).values_list('disciplina_turma_id', flat=True)

        # 3. Busca detalhes apenas das que não possuem configuração
        pendentes_ids = set(dt_ids) - set(configuradas_ids)
        
        if not pendentes_ids:
            return Response([])

        disciplinas_turmas = DisciplinaTurma.objects.filter(
            id__in=pendentes_ids
        ).select_related('turma', 'disciplina').order_by('turma__numero', 'turma__letra', 'disciplina__nome')

        pending = []
        for dt in disciplinas_turmas:
            pending.append({
                'disciplina_turma_id': str(dt.id),
                'turma_numero': dt.turma.numero,
                'turma_letra': dt.turma.letra,
                'turma_nome': dt.turma.nome,
                'disciplina_nome': dt.disciplina.nome,
                'disciplina_sigla': dt.disciplina.sigla,
            })

        return Response(pending)

    @action(detail=False, methods=['get'])
    def my_configs(self, request):
        """Retorna TODAS as DisciplinaTurmas do professor com suas configurações atuais (ou padrão)."""
        user = request.user
        ano_selecionado = user.get_ano_letivo_selecionado()
        if not ano_selecionado:
            return Response({'error': 'Nenhum ano letivo selecionado.'}, status=400)

        # 1. Busca IDs vinculados ao professor no ano
        dt_ids = ProfessorDisciplinaTurma.objects.filter(
            professor__usuario=user,
            disciplina_turma__turma__ano_letivo=ano_selecionado.ano
        ).values_list('disciplina_turma_id', flat=True).distinct()

        if not dt_ids:
            return Response([])

        # 2. Busca todas as DisciplinaTurmas
        disciplinas_turmas = DisciplinaTurma.objects.filter(
            id__in=dt_ids
        ).select_related('turma', 'disciplina').order_by('turma__numero', 'turma__letra', 'disciplina__nome')

        # 3. Busca configurações existentes mapeadas por disciplina_turma_id
        configs = AvaliacaoConfigDisciplinaTurma.objects.filter(
            ano_letivo=ano_selecionado,
            disciplina_turma_id__in=dt_ids
        )
        configs_map = {c.disciplina_turma_id: c for c in configs}

        results = []
        for dt in disciplinas_turmas:
            config = configs_map.get(dt.id)
            
            # Dados base
            item = {
                'disciplina_turma_id': str(dt.id),
                'turma_numero': dt.turma.numero,
                'turma_letra': dt.turma.letra,
                'turma_nome': dt.turma.nome,
                'disciplina_nome': dt.disciplina.nome,
                'disciplina_sigla': dt.disciplina.sigla,
            }

            if config:
                item['forma_calculo'] = config.forma_calculo
                item['pode_alterar'] = config.pode_alterar
                item['configurado'] = True
            else:
                item['forma_calculo'] = 'SOMA' # Default
                item['pode_alterar'] = True
                item['configurado'] = False
            
            results.append(item)

        return Response(results)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Cria configurações para múltiplas DisciplinaTurmas de uma vez."""
        user = request.user
        ano_selecionado = user.get_ano_letivo_selecionado()
        configs_data = request.data.get('configs', [])

        if not configs_data:
            return Response({'error': 'Nenhuma configuração enviada.'}, status=400)

        created_configs = []
        for data in configs_data:
            dt_id = data.get('disciplina_turma_id')
            forma = data.get('forma_calculo', 'SOMA')
            
            config, created = AvaliacaoConfigDisciplinaTurma.objects.get_or_create(
                ano_letivo=ano_selecionado,
                disciplina_turma_id=dt_id,
                defaults={'forma_calculo': forma}
            )
            if not created:
                # Se já existia e pode alterar, atualiza a forma
                if config.pode_alterar:
                    config.forma_calculo = forma
                    config.save()
            
            created_configs.append(config)

        serializer = self.get_serializer(created_configs, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
