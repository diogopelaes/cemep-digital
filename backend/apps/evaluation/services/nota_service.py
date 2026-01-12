"""
Services para lógica de negócio de notas.
"""
from decimal import Decimal
from django.db.models import Q
from apps.evaluation.models import (
    NotaAvaliacao, 
    NotaBimestral, 
    Avaliacao,
    VALOR_MAXIMO
)
from apps.academic.models import MatriculaTurma
from apps.core.models import AnoLetivo


def intervalos_intersectam(inicio1, fim1, inicio2, fim2):
    """
    Verifica se dois intervalos fechados [inicio1, fim1] e [inicio2, fim2] 
    têm interseção não-vazia.
    
    Considera None como infinito (sem limite).
    """
    # Se algum início é None, considera desde sempre
    # Se algum fim é None, considera até sempre
    if inicio1 is None:
        inicio1 = fim2 if fim2 else inicio2  # Garante que sempre vai intersectar
    if fim1 is None:
        fim1 = inicio2 if inicio2 else fim2
    if inicio2 is None:
        inicio2 = inicio1
    if fim2 is None:
        fim2 = fim1
    
    # Interseção existe se: inicio1 <= fim2 AND inicio2 <= fim1
    return inicio1 <= fim2 and inicio2 <= fim1


def calcular_is_active_nota_avaliacao(matricula_turma, avaliacao):
    """
    Determina se uma NotaAvaliacao deve estar ativa.
    
    Regra: Se a interseção de [matricula.data_entrada, matricula.data_saida] 
    e [avaliacao.data_inicio, avaliacao.data_fim] é vazia → is_active=False
    
    Args:
        matricula_turma: Instância de MatriculaTurma
        avaliacao: Instância de Avaliacao
    
    Returns:
        bool: True se deve estar ativa, False caso contrário
    """
    return intervalos_intersectam(
        matricula_turma.data_entrada,
        matricula_turma.data_saida,
        avaliacao.data_inicio,
        avaliacao.data_fim
    )


def get_or_create_notas_avaliacao(avaliacao):
    """
    Cria NotaAvaliacao para cada MatriculaTurma da turma da avaliação.
    Define is_active conforme a regra de interseção de datas.
    
    Args:
        avaliacao: Instância de Avaliacao
    
    Returns:
        QuerySet de NotaAvaliacao ordenado por número de chamada
    """
    turma = avaliacao.professor_disciplina_turma.disciplina_turma.turma
    
    # Buscar todas as matrículas da turma
    matriculas = MatriculaTurma.objects.filter(turma=turma).select_related(
        'matricula_cemep__estudante__usuario'
    ).order_by('mumero_chamada')
    
    notas_criadas = []
    
    for matricula in matriculas:
        is_active = calcular_is_active_nota_avaliacao(matricula, avaliacao)
        
        nota, created = NotaAvaliacao.objects.get_or_create(
            avaliacao=avaliacao,
            matricula_turma=matricula,
            defaults={'is_active': is_active, 'nota': None}
        )
        
        # Atualiza is_active se já existia
        if not created and nota.is_active != is_active:
            nota.is_active = is_active
            nota.save(update_fields=['is_active'])
        
        notas_criadas.append(nota)
    
    return NotaAvaliacao.objects.filter(avaliacao=avaliacao).order_by(
        'matricula_turma__mumero_chamada'
    )


def get_datas_bimestre(ano_letivo_obj, bimestre):
    """
    Retorna as datas de início e fim de um bimestre.
    
    Args:
        ano_letivo_obj: Instância de AnoLetivo
        bimestre: Número do bimestre (1-4)
    
    Returns:
        tuple: (data_inicio, data_fim) ou (None, None) se não configurado
    """
    mapa = {
        1: (ano_letivo_obj.data_inicio_1bim, ano_letivo_obj.data_fim_1bim),
        2: (ano_letivo_obj.data_inicio_2bim, ano_letivo_obj.data_fim_2bim),
        3: (ano_letivo_obj.data_inicio_3bim, ano_letivo_obj.data_fim_3bim),
        4: (ano_letivo_obj.data_inicio_4bim, ano_letivo_obj.data_fim_4bim),
    }
    return mapa.get(bimestre, (None, None))


def filtrar_estudantes_nota_bimestral(professor_disciplina_turma, bimestre):
    """
    Filtra MatriculaTurma para nota bimestral.
    
    Regra: Só inclui estudantes cuja interseção de 
    [data_entrada, data_saida] e [AnoLetivo.data_inicio_Xbim, data_fim_Xbim]
    é não-vazia.
    
    Args:
        professor_disciplina_turma: Instância de ProfessorDisciplinaTurma
        bimestre: Número do bimestre (1-4)
    
    Returns:
        QuerySet de MatriculaTurma
    """
    turma = professor_disciplina_turma.disciplina_turma.turma
    
    try:
        ano_letivo_obj = AnoLetivo.objects.get(ano=turma.ano_letivo)
    except AnoLetivo.DoesNotExist:
        return MatriculaTurma.objects.none()
    
    data_inicio_bim, data_fim_bim = get_datas_bimestre(ano_letivo_obj, bimestre)
    
    if not data_inicio_bim or not data_fim_bim:
        # Sem datas configuradas, retorna todos
        return MatriculaTurma.objects.filter(turma=turma).order_by('mumero_chamada')
    
    # Buscar matrículas e filtrar por interseção
    matriculas = MatriculaTurma.objects.filter(turma=turma).select_related(
        'matricula_cemep__estudante__usuario'
    )
    
    matriculas_ativas = []
    for matricula in matriculas:
        if intervalos_intersectam(
            matricula.data_entrada,
            matricula.data_saida,
            data_inicio_bim,
            data_fim_bim
        ):
            matriculas_ativas.append(matricula.id)
    
    return MatriculaTurma.objects.filter(id__in=matriculas_ativas).order_by('mumero_chamada')


def get_or_create_notas_bimestrais(professor_disciplina_turma, bimestre):
    """
    Cria ou busca NotaBimestral para cada estudante elegível.
    Executa atualizar_notas() em cada registro.
    
    Args:
        professor_disciplina_turma: Instância de ProfessorDisciplinaTurma
        bimestre: Número do bimestre (1-4)
    
    Returns:
        QuerySet de NotaBimestral
    """
    matriculas = filtrar_estudantes_nota_bimestral(professor_disciplina_turma, bimestre)
    
    for matricula in matriculas:
        nota, created = NotaBimestral.objects.get_or_create(
            matricula_turma=matricula,
            professor_disciplina_turma=professor_disciplina_turma,
            bimestre=bimestre,
        )
        # Atualizar notas calculadas
        nota.atualizar_notas()
        nota.save()
    
    return NotaBimestral.objects.filter(
        professor_disciplina_turma=professor_disciplina_turma,
        bimestre=bimestre
    ).order_by('matricula_turma__mumero_chamada')


def atualizar_notas_bimestrais(queryset):
    """
    Executa atualizar_notas() em cada NotaBimestral do queryset.
    
    Args:
        queryset: QuerySet de NotaBimestral
    """
    for nota in queryset:
        nota.atualizar_notas()
        nota.save()


def validar_avaliacoes_completas(professor_disciplina_turma, bimestre):
    """
    Verifica se as avaliações regulares estão completas para o bimestre.
    
    Retorna uma lista de avisos se:
    - Não há avaliações cadastradas
    - Soma dos valores não atinge VALOR_MAXIMO
    
    Args:
        professor_disciplina_turma: Instância de ProfessorDisciplinaTurma
        bimestre: Número do bimestre
    
    Returns:
        list: Lista de strings com avisos
    """
    from apps.evaluation.models import soma_valores_avaliacoes_regulares
    
    avisos = []
    disciplina_turma = professor_disciplina_turma.disciplina_turma
    
    # Verificar se existem avaliações regulares
    avaliacoes = Avaliacao.objects.filter(
        professor_disciplina_turma=professor_disciplina_turma,
        tipo='AVALIACAO_REGULAR',
        bimestre=bimestre
    )
    
    if not avaliacoes.exists():
        avisos.append('Não há avaliações regulares cadastradas para este bimestre.')
        return avisos
    
    # Verificar soma dos valores
    soma = soma_valores_avaliacoes_regulares(disciplina_turma, bimestre)
    if soma != VALOR_MAXIMO:
        avisos.append(
            f'A soma dos valores das avaliações regulares ({soma}) '
            f'é diferente de {VALOR_MAXIMO}.'
        )
    
    return avisos
