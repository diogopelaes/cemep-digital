"""
View para exibição pública da grade horária de uma turma.
Retorna a grade horária unificada de todas as turmas relacionadas
(mesmo numero/letra/ano_letivo, cursos diferentes).
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.models import Turma, GradeHorariaValidade, GradeHoraria, DisciplinaTurma, ProfessorDisciplinaTurma


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def grade_turma_view(request, ano, numero, letra):
    """
    Retorna a grade horária unificada de uma turma (e suas relacionadas).
    
    URL: /api/core/grade-turma/<ano>/<numero>/<letra>/
    Exemplo: /api/core/grade-turma/2026/1/A/
    
    Retorna a grade vigente (baseada na data atual) com todas as disciplinas
    de todas as turmas relacionadas (mesmo numero/letra/ano).
    """
    from django.utils import timezone
    from django.db import models
    
    hoje = timezone.now().date()
    letra = letra.upper()
    
    # Busca todas as turmas relacionadas (mesmo numero/letra/ano, cursos diferentes)
    turmas = Turma.objects.filter(
        ano_letivo=ano,
        numero=numero,
        letra=letra,
        is_active=True
    ).select_related('curso')
    
    if not turmas.exists():
        return Response({
            'error': 'Turma não encontrada'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Pega a primeira turma como referência
    turma_ref = turmas.first()
    
    # Busca validades vigentes de qualquer uma das turmas relacionadas
    # Busca validades vigentes para esta turma (grupo)
    validades = GradeHorariaValidade.objects.filter(
        ano_letivo__ano=ano,
        turma_numero=numero,
        turma_letra=letra,
        data_inicio__lte=hoje,
        data_fim__gte=hoje
    )
    
    if not validades.exists():
        return Response({
            'ano_letivo': ano,
            'numero': numero,
            'letra': letra,
            'cursos': [t.curso.sigla for t in turmas],
            'validade': None,
            'matriz': {},
            'horarios': {},
            'mensagem': 'Nenhuma grade horária vigente para esta turma.'
        })
    
    # Usa a primeira validade como referência de datas
    validade_ref = validades.first()
    
    # Busca todos os itens de grade de todas as validades vigentes
    grades = GradeHoraria.objects.filter(
        validade__in=validades
    ).select_related(
        'horario_aula',
        'disciplina',
    ).order_by('horario_aula__dia_semana', 'horario_aula__numero')
    
    # Mapa de professores: disciplina_turma -> professor ativo
    professores_map = {}
    for turma in turmas:
        disciplinas_turma = DisciplinaTurma.objects.filter(
            turma=turma
        ).prefetch_related('professores__professor')
        
        for dt in disciplinas_turma:
            professor_ativo = dt.professores.filter(
                models.Q(data_fim__isnull=True) | models.Q(data_fim__gte=hoje)
            ).order_by(
                models.Case(
                    models.When(tipo='TITULAR', then=0),
                    models.When(tipo='SUBSTITUTO', then=1),
                    models.When(tipo='AUXILIAR', then=2),
                    default=3,
                    output_field=models.IntegerField()
                )
            ).first()
            
            # Chave: (turma_id, disciplina_id)
            key = (turma.id, dt.disciplina_id)
            if professor_ativo:
                professores_map[key] = professor_ativo.professor.get_apelido()
            else:
                professores_map[key] = None
    
    # Monta matriz unificada
    matriz = {}
    horarios = {}
    
    for g in grades:
        numero_aula = g.horario_aula.numero
        dia = g.horario_aula.dia_semana
        num_key = str(numero_aula)
        dia_key = str(dia)
        
        if num_key not in matriz:
            matriz[num_key] = {}
        
        # Pega professor para essa disciplina/turma
        # Tenta encontrar a turma relacionada que corresponde ao curso_sigla esperado ou pega a primeira
        validade = g.validade
        turma_da_grade = None
        for t in turmas:
             if t.numero == validade.turma_numero and t.letra == validade.turma_letra:
                  if g.curso and t.curso_id == g.curso_id:
                       turma_da_grade = t
                       break
        
        # Fallback: pega qualquer turma que combine (para caso de curso generico ou erro)
        if not turma_da_grade:
             turma_da_grade = turmas.first() # Simplificacao segura pois todas as turmas sao "irmas"

        prof_key = (turma_da_grade.id, g.disciplina_id)
        professor_apelido = professores_map.get(prof_key)
        
        # Dados da célula
        matriz[num_key][dia_key] = {
            'disciplina_id': str(g.disciplina.id),
            'disciplina_nome': g.disciplina.nome,
            'disciplina_sigla': g.disciplina.sigla,
            'curso_sigla': g.curso.sigla if g.curso else '',
            'professor_apelido': professor_apelido
        }
        
        # Horários para legenda
        if num_key not in horarios:
            horarios[num_key] = {
                'hora_inicio': g.horario_aula.hora_inicio.strftime('%H:%M'),
                'hora_fim': g.horario_aula.hora_fim.strftime('%H:%M')
            }
    
    # Busca disciplinas do professor logado (se for professor)
    minhas_disciplinas = []
    if request.user.tipo_usuario == 'PROFESSOR' and hasattr(request.user, 'funcionario'):
        atribuicoes = ProfessorDisciplinaTurma.objects.filter(
            professor=request.user.funcionario,
            disciplina_turma__turma__in=turmas
        ).filter(
            models.Q(data_fim__isnull=True) | models.Q(data_fim__gte=hoje)
        ).values_list('disciplina_turma__disciplina_id', flat=True)
        minhas_disciplinas = [str(d) for d in atribuicoes]
    
    return Response({
        'ano_letivo': ano,
        'numero': numero,
        'letra': letra,
        'turma_nome': f"{turma_ref.numero}º {turma_ref.get_nomenclatura_display()} {turma_ref.letra}",
        'cursos': [t.curso.sigla for t in turmas],
        'validade': {
            'data_inicio': validade_ref.data_inicio.isoformat(),
            'data_fim': validade_ref.data_fim.isoformat()
        },
        'matriz': matriz,
        'horarios': horarios,
        'minhas_disciplinas': minhas_disciplinas,
        'gerado_em': timezone.now().isoformat()
    })
