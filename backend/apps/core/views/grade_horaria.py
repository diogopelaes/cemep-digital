from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from django.db import transaction

from apps.core.models import GradeHoraria, Turma, DisciplinaTurma, HorarioAula
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
        
        Retorna:
            turmas: Lista de turmas (atual + relacionadas por numero/letra/ano_letivo)
            disciplinas: Lista de disciplinas de todas as turmas (com turma_id e curso_sigla)
            grades: Lista de grades existentes de todas as turmas
            horarios_aula: Lista de horários do ano letivo
        """
        turma_id = request.query_params.get('turma_id')
        if not turma_id:
            return Response({'error': 'turma_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            turma = Turma.objects.select_related('curso').get(id=turma_id)
        except Turma.DoesNotExist:
            return Response({'error': 'Turma não encontrada'}, status=status.HTTP_404_NOT_FOUND)
        
        # Busca turmas relacionadas (mesmo numero, letra, ano_letivo)
        turmas_relacionadas = Turma.objects.filter(
            numero=turma.numero,
            letra=turma.letra,
            ano_letivo=turma.ano_letivo
        ).select_related('curso').order_by('curso__nome')
        
        # Ordena: turma atual primeiro
        turmas_list = [t for t in turmas_relacionadas if t.id == turma.id]
        turmas_list.extend([t for t in turmas_relacionadas if t.id != turma.id])
        
        # Busca disciplinas de todas as turmas (via DisciplinaTurma)
        disciplinas_turma = DisciplinaTurma.objects.filter(
            turma__in=turmas_list
        ).select_related('disciplina', 'turma', 'turma__curso')
        
        disciplinas = []
        for dt in disciplinas_turma:
            disciplinas.append({
                'id': str(dt.disciplina.id),
                'nome': dt.disciplina.nome,
                'sigla': dt.disciplina.sigla,
                'turma_id': str(dt.turma.id),
                'curso_sigla': dt.turma.curso.sigla,
            })
        
        # Busca grades existentes de todas as turmas
        grades = GradeHoraria.objects.filter(
            turma__in=turmas_list
        ).select_related('horario_aula', 'disciplina', 'turma')
        
        grades_data = []
        for g in grades:
            grades_data.append({
                'id': str(g.id),
                'turma': str(g.turma.id),
                'horario_aula': str(g.horario_aula.id),
                'disciplina': str(g.disciplina.id),
            })
        
        # Busca horários de aula do ano letivo
        horarios = HorarioAula.objects.filter(
            ano_letivo__ano=turma.ano_letivo
        ).order_by('dia_semana', 'hora_inicio')
        
        horarios_data = []
        for h in horarios:
            horarios_data.append({
                'id': str(h.id),
                'numero': h.numero,
                'dia_semana': h.dia_semana,
                'dia_semana_display': h.get_dia_semana_display(),
                'hora_inicio': h.hora_inicio.strftime('%H:%M') if h.hora_inicio else None,
                'hora_fim': h.hora_fim.strftime('%H:%M') if h.hora_fim else None,
            })
        
        # Monta turmas para retorno
        turmas_data = []
        for t in turmas_list:
            turmas_data.append({
                'id': str(t.id),
                'nome': t.nome,
                'nome_completo': t.nome_completo,
                'curso_sigla': t.curso.sigla,
            })
        
        return Response({
            'turmas': turmas_data,
            'disciplinas': disciplinas,
            'grades': grades_data,
            'horarios_aula': horarios_data,
        })

    @action(detail=False, methods=['post'])
    def salvar_lote(self, request):
        """
        Salva grades horárias de múltiplas turmas em uma única requisição.
        
        Corpo da requisição:
            turma_id: UUID da turma de referência
            grades: Lista de { horario_aula: UUID, disciplina: UUID ou null }
        
        A turma correta para cada grade é identificada via DisciplinaTurma.
        """
        turma_id = request.data.get('turma_id')
        grades_data = request.data.get('grades', [])
        
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
        
        # Monta mapa de disciplina -> turma via DisciplinaTurma
        disciplina_turma_map = {}
        for dt in DisciplinaTurma.objects.filter(turma__in=turmas_ids):
            disciplina_turma_map[str(dt.disciplina.id)] = dt.turma.id
        
        with transaction.atomic():
            # Remove todas as grades existentes das turmas relacionadas
            GradeHoraria.objects.filter(turma__in=turmas_ids).delete()
            
            # Cria novas grades
            novas_grades = []
            for item in grades_data:
                horario_id = item.get('horario_aula')
                disciplina_id = item.get('disciplina')
                
                if not horario_id or not disciplina_id:
                    continue
                
                # Identifica a turma correta para esta disciplina
                turma_da_disciplina = disciplina_turma_map.get(disciplina_id)
                if not turma_da_disciplina:
                    continue  # Disciplina não vinculada a nenhuma turma
                
                novas_grades.append(GradeHoraria(
                    turma_id=turma_da_disciplina,
                    horario_aula_id=horario_id,
                    disciplina_id=disciplina_id
                ))
            
            GradeHoraria.objects.bulk_create(novas_grades)
        
        return Response({'message': f'{len(novas_grades)} grades criadas com sucesso.'})
