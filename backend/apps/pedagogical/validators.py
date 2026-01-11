"""
Validadores para o módulo Pedagogical.

Este módulo contém funções de validação otimizadas para alto volume,
usando cache com TTL de 2 horas para evitar recálculos frequentes.
"""
from datetime import datetime, timedelta
from django.utils import timezone


def _obter_datas_com_grade_valida(ano_letivo):
    """
    Retorna um set de datas (ISO strings) que possuem grade horária válida.
    
    Uma data é considerada válida se existe pelo menos uma GradeHorariaValidade
    onde data_inicio <= data <= data_fim.
    
    Args:
        ano_letivo: Instância de AnoLetivo
        
    Returns:
        set: Conjunto de datas ISO que têm grade válida, ou None se não filtrar
    """
    from apps.core.models import GradeHorariaValidade
    
    # Busca todas as validades do ano letivo
    validades = GradeHorariaValidade.objects.filter(
        turma__ano_letivo=ano_letivo.ano
    ).values_list('data_inicio', 'data_fim')
    
    if not validades:
        return None  # Sem validades = não filtrar por grade
    
    datas_validas = set()
    for data_inicio, data_fim in validades:
        if data_inicio and data_fim:
            curr = data_inicio
            while curr <= data_fim:
                datas_validas.add(curr.isoformat())
                curr += timedelta(days=1)
    
    return datas_validas if datas_validas else None


def obter_datas_liberadas_cached(ano_letivo):
    """
    Retorna datas liberadas usando cache com validade diária.
    
    Se cache de hoje: retorna dados em O(1)
    Se cache de outro dia: recalcula, salva, e retorna
    
    Args:
        ano_letivo: Instância de AnoLetivo
        
    Returns:
        set: Conjunto de datas ISO (strings 'YYYY-MM-DD') liberadas
    """
    if not ano_letivo:
        return set()
    
    hoje = timezone.localdate().isoformat()
    cache = ano_letivo.datas_liberadas_aulas_faltas or {}
    
    # Verifica se cache é de hoje
    validade = cache.get('validade') if isinstance(cache, dict) else None
    
    if validade == hoje:
        # Cache válido (mesmo dia) - retorna imediatamente
        return set(cache.get('datasLiberadas', []))
    
    # Cache expirado (outro dia) ou inexistente - recalcula
    datas = _calcular_datas_liberadas(ano_letivo)
    
    # Salva novo cache (validade = hoje)
    novo_cache = {
        'datasLiberadas': sorted(list(datas)),
        'validade': hoje
    }
    
    # Update atômico sem disparar save()
    from apps.core.models import AnoLetivo
    AnoLetivo.objects.filter(pk=ano_letivo.pk).update(
        datas_liberadas_aulas_faltas=novo_cache
    )
    
    return datas


def _calcular_datas_liberadas(ano_letivo):
    """
    Calcula as datas liberadas para registro de aula baseado nos controles.
    
    Lógica (por bimestre com AULA):
    - Se data_liberada_inicio <= hoje <= data_liberada_fim:
        - Se digitacao_futura=True: todos os dias_letivos
        - Se digitacao_futura=False: apenas dias_letivos <= hoje
    - Filtra apenas datas que possuem grade horária válida (GradeHorariaValidade)
    
    Returns:
        set: Conjunto de datas ISO liberadas
    """
    hoje_iso = timezone.localdate().isoformat()
    datas_liberadas = set()
    
    controles = ano_letivo.controles if ano_letivo else None
    if not controles:
        return datas_liberadas
    
    # Percorre bimestres 1-5
    for bim_key in ('1', '2', '3', '4', '5'):
        bimestre = controles.get(bim_key)
        if not bimestre:
            continue
        
        # Apenas dados de AULA
        aula = bimestre.get('AULA')
        if not aula:
            continue
        
        inicio = aula.get('data_liberada_inicio')
        fim = aula.get('data_liberada_fim')
        dias_letivos = aula.get('dias_letivos', [])
        digitacao_futura = aula.get('digitacao_futura', True)
        
        # Verifica se período está aberto (hoje entre inicio e fim)
        if inicio and hoje_iso < inicio:
            continue
        if fim and hoje_iso > fim:
            continue
        
        # Adiciona dias letivos conforme regra
        if digitacao_futura:
            datas_liberadas.update(dias_letivos)
        else:
            for dia in dias_letivos:
                if dia <= hoje_iso:
                    datas_liberadas.add(dia)
    
    # Filtra apenas datas que têm grade horária válida
    datas_com_grade = _obter_datas_com_grade_valida(ano_letivo)
    if datas_com_grade:
        datas_liberadas = datas_liberadas.intersection(datas_com_grade)
    
    return datas_liberadas


def verificar_data_registro_aula(ano_letivo, data_verificar):
    """
    Verifica se uma data pode ser usada para registrar aula.
    Usa cache para performance.
    
    Args:
        ano_letivo: Instância de AnoLetivo
        data_verificar: date object ou string ISO 'YYYY-MM-DD'
        
    Returns:
        dict: {'valida': bool, 'mensagem': str, 'bimestre': int|None}
    """
    if not ano_letivo:
        return {'valida': False, 'mensagem': 'Ano letivo não informado.', 'bimestre': None}
    
    # Normaliza para string ISO
    if hasattr(data_verificar, 'isoformat'):
        data_iso = data_verificar.isoformat()
    elif isinstance(data_verificar, str):
        data_iso = data_verificar
    else:
        return {'valida': False, 'mensagem': 'Formato de data inválido.', 'bimestre': None}
    
    # Sem controles = libera tudo
    if not ano_letivo.controles:
        return {'valida': True, 'mensagem': 'Período não configurado.', 'bimestre': None}
    
    # Obtém datas liberadas (com cache)
    datas_liberadas = obter_datas_liberadas_cached(ano_letivo)
    
    if data_iso in datas_liberadas:
        bimestre = _identificar_bimestre(ano_letivo.controles, data_iso)
        return {'valida': True, 'mensagem': 'Data válida.', 'bimestre': bimestre}
    
    return {
        'valida': False, 
        'mensagem': 'Data não permitida (feriado, fim de semana ou fora do período letivo).', 
        'bimestre': None
    }


def _identificar_bimestre(controles, data_iso):
    """Retorna o número do bimestre (1-4) para uma data, ou None."""
    for bim_key in ('1', '2', '3', '4'):
        bimestre = controles.get(bim_key, {})
        aula = bimestre.get('AULA', {})
        if data_iso in aula.get('dias_letivos', []):
            return int(bim_key)
    return None
