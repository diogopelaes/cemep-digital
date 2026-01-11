from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from django.db import transaction

from django.utils import timezone
from apps.core.models import GradeHoraria, Turma, DisciplinaTurma, HorarioAula, ProfessorDisciplinaTurma, GradeHorariaValidade
from apps.core.serializers import GradeHorariaSerializer
from apps.users.permissions import GestaoWritePublicReadMixin, AnoLetivoFilterMixin


class GradeHorariaViewSet(AnoLetivoFilterMixin, GestaoWritePublicReadMixin, viewsets.ModelViewSet):
    """
    ViewSet para GradeHoraria.
    Leitura: Público (Autenticado) | Escrita: Gestão
    
    Filtrado pelo ano letivo selecionado do usuário.
    """
    queryset = GradeHoraria.objects.select_related('turma', 'horario_aula', 'disciplina')
    serializer_class = GradeHorariaSerializer
    pagination_class = None  # Retorna todos os registros

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['turma', 'horario_aula', 'disciplina', 'horario_aula__dia_semana']
    ordering_fields = ['horario_aula__dia_semana', 'horario_aula__hora_inicio']
    ordering = ['horario_aula__dia_semana', 'horario_aula__hora_inicio']
    
    ano_letivo_field = 'turma__ano_letivo'  # Campo de filtro do AnoLetivoFilterMixin

    @action(detail=False, methods=['get'])
    def dados_edicao(self, request):
        """
        Retorna todos os dados para edição da grade horária em uma única requisição.
        
        Parâmetros:
            turma_id: UUID da turma de referência
            validade_id: UUID da validade específica (opcional)
        """
        turma_id = request.query_params.get('turma_id')
        validade_id = request.query_params.get('validade_id')

        if not turma_id:
            return Response({'error': 'turma_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            turma = Turma.objects.select_related('curso').get(id=turma_id)
        except Turma.DoesNotExist:
            return Response({'error': 'Turma não encontrada'}, status=status.HTTP_404_NOT_FOUND)
        
        # 1. Busca Validades da Turma
        validades = GradeHorariaValidade.objects.filter(turma=turma).order_by('-data_inicio')
        validades_data = [{
            'id': str(v.id),
            'data_inicio': v.data_inicio,
            'data_fim': v.data_fim,
            'is_active': v.data_inicio <= timezone.now().date() <= v.data_fim
        } for v in validades]

        # 2. Define validade alvo
        alvo_validade = None
        if validade_id:
            try:
                alvo_validade = validades.get(id=validade_id)
            except GradeHorariaValidade.DoesNotExist:
                pass
        
        # Se não pediu específica, tenta a atual, senão a última criada
        if not alvo_validade:
            hoje = timezone.now().date()
            alvo_validade = validades.filter(data_inicio__lte=hoje, data_fim__gte=hoje).first()
            if not alvo_validade and validades.exists():
                alvo_validade = validades.first()

        
        # Busca turmas relacionadas (mesmo numero, letra, ano_letivo) para carregamento de disciplinas
        turmas_relacionadas = Turma.objects.filter(
            numero=turma.numero,
            letra=turma.letra,
            ano_letivo=turma.ano_letivo
        ).select_related('curso').order_by('curso__nome')
        
        turmas_list = [t for t in turmas_relacionadas if t.id == turma.id]
        turmas_list.extend([t for t in turmas_relacionadas if t.id != turma.id])
        
        # Busca disciplinas de todas as turmas
        disciplinas_turma = DisciplinaTurma.objects.filter(
            turma__in=turmas_list
        ).select_related('disciplina', 'turma', 'turma__curso').prefetch_related('professores__professor')
        
        disciplinas = []
        for dt in disciplinas_turma:
            professor_nome = '-'
            professores = dt.professores.all()
            
            def sort_key(p):
                peso_data = 0 if p.data_fim is None else 1
                peso_tipo = 3
                if p.tipo == ProfessorDisciplinaTurma.TipoProfessor.TITULAR: weight_tipo = 0
                elif p.tipo == ProfessorDisciplinaTurma.TipoProfessor.SUBSTITUTO: weight_tipo = 1
                elif p.tipo == ProfessorDisciplinaTurma.TipoProfessor.AUXILIAR: weight_tipo = 2
                return (peso_data, peso_tipo)
            
            professores_sorted = sorted(professores, key=sort_key)
            if professores_sorted:
                professor_nome = professores_sorted[0].professor.get_apelido()

            disciplinas.append({
                'id': str(dt.disciplina.id),
                'nome': dt.disciplina.nome,
                'sigla': dt.disciplina.sigla,
                'turma_id': str(dt.turma.id),
                'curso_sigla': dt.turma.curso.sigla,
                'professor_nome': professor_nome,
            })
        
        # Busca grades APENAS se tivermos uma validade alvo
        grades_data = []
        if alvo_validade:
            # Precisamos encontrar as validades correspondentes nas turmas relacionadas também
            # Ex: se alvo_validade é da Turma A (01/02 a 30/06), precisamos da validade da Turma B com mesmas datas
            
            # IDs das turmas para buscar
            ids_turmas_relacionadas = [t.id for t in turmas_list]

            # Busca todas as validades das turmas relacionadas que têm AS MESMAS DATAS da alvo
            validades_correspondentes = GradeHorariaValidade.objects.filter(
                turma__in=ids_turmas_relacionadas,
                data_inicio=alvo_validade.data_inicio,
                data_fim=alvo_validade.data_fim
            )

            grades = GradeHoraria.objects.filter(
                validade__in=validades_correspondentes
            ).select_related('horario_aula', 'disciplina', 'validade', 'validade__turma')
            
            for g in grades:
                grades_data.append({
                    'id': str(g.id),
                    'turma': str(g.validade.turma.id),
                    'validade': str(g.validade.id),
                    'horario_aula': str(g.horario_aula.id),
                    'disciplina': str(g.disciplina.id),
                })
        
        # Busca horários de aula
        horarios = HorarioAula.objects.filter(
            ano_letivo__ano=turma.ano_letivo
        ).order_by('dia_semana', 'hora_inicio')
        
        horarios_data = [{
            'id': str(h.id),
            'numero': h.numero,
            'dia_semana': h.dia_semana,
            'dia_semana_display': h.get_dia_semana_display(),
            'hora_inicio': h.hora_inicio.strftime('%H:%M') if h.hora_inicio else None,
            'hora_fim': h.hora_fim.strftime('%H:%M') if h.hora_fim else None,
        } for h in horarios]
        
        turmas_data = [{
            'id': str(t.id),
            'nome': t.nome,
            'nome_completo': t.nome_completo,
            'curso_sigla': t.curso.sigla,
        } for t in turmas_list]
        
        return Response({
            'turmas': turmas_data,
            'disciplinas': disciplinas,
            'grades': grades_data,
            'horarios_aula': horarios_data,
            'validades': validades_data,
            'validade_selecionada': {
                'id': str(alvo_validade.id),
                'data_inicio': alvo_validade.data_inicio,
                'data_fim': alvo_validade.data_fim
            } if alvo_validade else None
        })

    @action(detail=False, methods=['post'])
    def salvar_lote(self, request):
        """
        Salva grades horárias com controle de validade e turmas múltiplas.
        
        Fluxo:
        1. Identifica ou Cria GradeHorariaValidade para todas as turmas envolvidas.
        2. Remove grades anteriores dessa validade.
        3. Insere novas grades vinculadas à validade.
        """
        turma_id = request.data.get('turma_id')
        grades_data = request.data.get('grades', [])
        
        # Dados para Validade
        validade_id = request.data.get('validade_id')
        data_inicio = request.data.get('data_inicio')
        data_fim = request.data.get('data_fim')
        
        if not turma_id:
            return Response({'error': 'turma_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            turma = Turma.objects.get(id=turma_id)
        except Turma.DoesNotExist:
            return Response({'error': 'Turma não encontrada'}, status=status.HTTP_404_NOT_FOUND)
        
        # Busca turmas relacionadas
        turmas_relacionadas = Turma.objects.filter(
            numero=turma.numero,
            letra=turma.letra,
            ano_letivo=turma.ano_letivo
        )
        turmas_ids = list(turmas_relacionadas.values_list('id', flat=True))
        
        # Mapa para validar qual turma a disciplina pertence
        disciplina_turma_map = {}
        for dt in DisciplinaTurma.objects.filter(turma__in=turmas_ids):
            disciplina_turma_map[str(dt.disciplina.id)] = dt.turma.id
            
        with transaction.atomic():
            # dicionário para guardar a validade de cada turma {turma_id: validade_obj}
            validades_map = {}

            # Caso 1: Editando Validacies existentes (validade_id passada, mas precisamos achar as irmãs)
            if validade_id:
                try:
                    ref_validade = GradeHorariaValidade.objects.get(id=validade_id)
                    
                    # Busca validades irmãs (mesmas datas originais, turmas relacionadas)
                    validades_existentes = GradeHorariaValidade.objects.filter(
                        turma__in=turmas_ids,
                        data_inicio=ref_validade.data_inicio,
                        data_fim=ref_validade.data_fim
                    )
                    
                    # Se o usuário alterou as datas, atualiza todas as validades irmãs
                    if data_inicio and data_fim:
                        from datetime import datetime
                        # Converte strings para date
                        nova_data_inicio = datetime.strptime(data_inicio, '%Y-%m-%d').date() if isinstance(data_inicio, str) else data_inicio
                        nova_data_fim = datetime.strptime(data_fim, '%Y-%m-%d').date() if isinstance(data_fim, str) else data_fim
                        
                        for v in validades_existentes:
                            if v.data_inicio != nova_data_inicio or v.data_fim != nova_data_fim:
                                v.data_inicio = nova_data_inicio
                                v.data_fim = nova_data_fim
                                v.save()
                            validades_map[v.turma_id] = v
                    else:
                        for v in validades_existentes:
                            validades_map[v.turma_id] = v
                        
                except GradeHorariaValidade.DoesNotExist:
                     return Response({'error': 'Validade informada não encontrada'}, status=status.HTTP_404_NOT_FOUND)
            
            # Caso 2: Nova Validade ou criando irmãs faltantes
            if not validade_id and data_inicio and data_fim:
                from datetime import datetime as dt
                # Converte strings para date se necessário
                nova_data_inicio = dt.strptime(data_inicio, '%Y-%m-%d').date() if isinstance(data_inicio, str) else data_inicio
                nova_data_fim = dt.strptime(data_fim, '%Y-%m-%d').date() if isinstance(data_fim, str) else data_fim
                
                # Verifica sobreposição para todas as turmas antes de criar
                for t in turmas_relacionadas:
                    sobreposicao = GradeHorariaValidade.objects.filter(
                        turma=t,
                        data_inicio__lte=nova_data_fim,
                        data_fim__gte=nova_data_inicio
                    ).exists()
                    
                    if sobreposicao:
                        return Response({
                            'error': f'Já existe uma vigência de grade para a turma {t.nome_completo} que sobrepõe o período informado.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                
                # Cria validades para todas as turmas
                for t in turmas_relacionadas:
                    v, created = GradeHorariaValidade.objects.get_or_create(
                        turma=t,
                        data_inicio=nova_data_inicio,
                        data_fim=nova_data_fim
                    )
                    validades_map[t.id] = v
            
            elif not validade_id: # Falta dados
                 return Response({'error': 'Necessário informar validade_id ou datas de início/fim'}, status=status.HTTP_400_BAD_REQUEST)

            # Garante que temos validade para todas as turmas necessárias?
            # Se entrarmos no modo edição (validade_id), e alguma turma irmã não tiver validade, devíamos criar?
            # Por segurança, vamos assumir que se estamos editando, usamos o que achamos.
            
            # Limpa grades antigas DESSAS validades
            ids_validades = [v.id for v in validades_map.values()]
            GradeHoraria.objects.filter(validade__in=ids_validades).delete()
            
            # Cria novas grades
            novas_grades = []
            erros = []
            
            for item in grades_data:
                horario_id = item.get('horario_aula')
                disciplina_id = item.get('disciplina')
                
                if not horario_id or not disciplina_id:
                    continue
                
                # Identifica a turma correta através da disciplina
                turma_da_disciplina_id = disciplina_turma_map.get(str(disciplina_id))
                
                if not turma_da_disciplina_id:
                    # Pode ser disciplina desativada ou erro frontend
                    continue 

                # Pega a validade correspondente a ESSA turma
                validade_obj = validades_map.get(turma_da_disciplina_id)
                
                if not validade_obj:
                    # Se estamos criando e por algum motivo essa turma não ganhou validade (bug?), criamos?
                    # Ou se estamos editando e essa turma não tinha validade naquele range?
                    # Vamos tentar criar on-the-fly se tivermos datas
                    if data_inicio and data_fim:
                         validade_obj, _ = GradeHorariaValidade.objects.get_or_create(
                            turma_id=turma_da_disciplina_id,
                            data_inicio=data_inicio,
                            data_fim=data_fim
                         )
                         validades_map[turma_da_disciplina_id] = validade_obj
                    elif validade_id:
                         # Se veio de validade_id, usamos as datas da referencia para criar a faltando
                         ref_val = GradeHorariaValidade.objects.get(id=validade_id)
                         validade_obj, _ = GradeHorariaValidade.objects.get_or_create(
                            turma_id=turma_da_disciplina_id,
                            data_inicio=ref_val.data_inicio,
                            data_fim=ref_val.data_fim
                         )
                         validades_map[turma_da_disciplina_id] = validade_obj
                
                novas_grades.append(GradeHoraria(
                    validade=validade_obj,
                    horario_aula_id=horario_id,
                    disciplina_id=disciplina_id
                ))
            
            GradeHoraria.objects.bulk_create(novas_grades)
            
            # Rebuild manual de grade_horaria (bulk_create não dispara signals)
            # Coleta todas as turmas e disciplinas afetadas
            turmas_afetadas = set(validades_map.keys())
            disciplinas_afetadas = set(item.get('disciplina') for item in grades_data if item.get('disciplina'))
            
            # Rebuild das turmas
            for turma_afetada in turmas_relacionadas.filter(id__in=turmas_afetadas):
                turma_afetada.build_grade_horaria(save=True)
            
            # Rebuild dos professores que lecionam as disciplinas afetadas
            professores_afetados = set()
            for pdt in ProfessorDisciplinaTurma.objects.filter(
                disciplina_turma__turma__in=turmas_afetadas,
                disciplina_turma__disciplina__in=disciplinas_afetadas
            ).select_related('professor'):
                professores_afetados.add(pdt.professor)
            
            for professor in professores_afetados:
                professor.build_grade_horaria(save=True)

        # Retorna o ID da validade principal (da turma solicitada) para redirecionamento
        validade_principal = validades_map.get(turma.id)
        
        return Response({
            'message': f'{len(novas_grades)} grades salvas/atualizadas.',
            'validade_id': validade_principal.id if validade_principal else None
        })
