"""
View para exibição da grade horária do professor logado.
Retorna a grade horária com todas as turmas onde o professor dá aula.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.models import GradeHorariaValidade, GradeHoraria, ProfessorDisciplinaTurma


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def grade_professor_view(request):
    """
    Retorna a grade horária de um professor.
    
    URL: /api/core/grade-professor/
    Query params:
        - professor_id (opcional): UUID do professor (apenas para GESTAO/SECRETARIA)
    
    Se professor_id não for informado, retorna a grade do professor logado.
    """
    from django.utils import timezone
    from django.db import models
    from apps.core.models import Funcionario
    
    user = request.user
    hoje = timezone.now().date()
    
    # Se passou professor_id, verifica permissão
    professor_id = request.query_params.get('professor_id')
    
    if professor_id:
        # Apenas GESTAO e SECRETARIA podem ver grade de outros
        if user.tipo_usuario not in ('GESTAO', 'SECRETARIA'):
            return Response({
                'error': 'Sem permissão para visualizar grade de outros professores.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            professor = Funcionario.objects.get(id=professor_id)
        except Funcionario.DoesNotExist:
            return Response({
                'error': 'Professor não encontrado.'
            }, status=status.HTTP_404_NOT_FOUND)
    else:
        # Verifica se é professor
        if user.tipo_usuario != 'PROFESSOR' or not hasattr(user, 'funcionario'):
            return Response({
                'error': 'Usuário não é professor ou não possui vínculo de funcionário.'
            }, status=status.HTTP_403_FORBIDDEN)
        professor = user.funcionario
    
    # Busca ano letivo selecionado
    ano_letivo = user.get_ano_letivo_selecionado()
    if not ano_letivo:
        return Response({
            'error': 'Nenhum ano letivo selecionado.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Busca atribuições ativas do professor
    atribuicoes = ProfessorDisciplinaTurma.objects.filter(
        professor=professor,
        disciplina_turma__turma__ano_letivo=ano_letivo.ano
    ).filter(
        models.Q(data_fim__isnull=True) | models.Q(data_fim__gte=hoje)
    ).select_related(
        'disciplina_turma__turma__curso',
        'disciplina_turma__disciplina'
    )
    
    if not atribuicoes.exists():
        return Response({
            'ano_letivo': ano_letivo.ano,
            'professor_nome': professor.get_apelido(),
            'validade': None,
            'matriz': {},
            'horarios': {},
            'mostrar_disciplina': False,
            'mensagem': 'Você não possui atribuições neste ano letivo.'
        })
    
    # Identifica turmas e disciplinas do professor
    turmas = set()
    disciplinas = set()
    turma_disciplina_map = {}  # (turma_id, disciplina_id) -> turma
    
    for atrib in atribuicoes:
        turma = atrib.disciplina_turma.turma
        disciplina = atrib.disciplina_turma.disciplina
        turmas.add(turma)
        disciplinas.add(disciplina.id)
        turma_disciplina_map[(turma.id, disciplina.id)] = {
            'turma': turma,
            'disciplina': disciplina
        }
    
    # Se professor tem mais de uma disciplina, mostra sigla
    mostrar_disciplina = len(disciplinas) > 1
    
    # Busca validades vigentes das turmas do professor
    validades = GradeHorariaValidade.objects.filter(
        turma__in=turmas,
        data_inicio__lte=hoje,
        data_fim__gte=hoje
    ).select_related('turma__curso')
    
    if not validades.exists():
        return Response({
            'ano_letivo': ano_letivo.ano,
            'professor_nome': professor.get_apelido(),
            'validade': None,
            'matriz': {},
            'horarios': {},
            'mostrar_disciplina': mostrar_disciplina,
            'mensagem': 'Nenhuma grade horária vigente para suas turmas.'
        })
    
    validade_ref = validades.first()
    
    # Busca itens de grade das validades onde o professor leciona
    grades = GradeHoraria.objects.filter(
        validade__in=validades
    ).select_related(
        'horario_aula',
        'disciplina',
        'validade__turma__curso'
    ).order_by('horario_aula__dia_semana', 'horario_aula__numero')
    
    # Monta matriz com apenas as aulas do professor
    matriz = {}
    horarios = {}
    
    for g in grades:
        turma = g.validade.turma
        disciplina = g.disciplina
        
        # Verifica se essa aula é do professor
        if (turma.id, disciplina.id) not in turma_disciplina_map:
            continue
        
        numero_aula = g.horario_aula.numero
        dia = g.horario_aula.dia_semana
        num_key = str(numero_aula)
        dia_key = str(dia)
        
        if num_key not in matriz:
            matriz[num_key] = {}
        
        # Monta label: turma + disciplina (se múltiplas disciplinas)
        turma_label = f"{turma.numero}{turma.letra}"
        
        # Dados da célula
        matriz[num_key][dia_key] = {
            'turma_id': str(turma.id),
            'turma_label': turma_label,
            'disciplina_id': str(disciplina.id),
            'disciplina_sigla': disciplina.sigla if mostrar_disciplina else None,
            'curso_sigla': turma.curso.sigla
        }
        
        # Horários para legenda
        if num_key not in horarios:
            horarios[num_key] = {
                'hora_inicio': g.horario_aula.hora_inicio.strftime('%H:%M'),
                'hora_fim': g.horario_aula.hora_fim.strftime('%H:%M')
            }
    
    return Response({
        'ano_letivo': ano_letivo.ano,
        'professor_nome': professor.get_apelido(),
        'validade': {
            'data_inicio': validade_ref.data_inicio.isoformat(),
            'data_fim': validade_ref.data_fim.isoformat()
        },
        'matriz': matriz,
        'horarios': horarios,
        'mostrar_disciplina': mostrar_disciplina,
        'gerado_em': timezone.now().isoformat()
    })
