"""
Funções utilitárias para o App Core
"""
from django.utils import timezone
from apps.core.models import AnoLetivo, ControleRegistrosVisualizacao


def get_restricoes_controle(ano_selecionado, tipo_controle='AULA'):
    """
    Retorna as restrições de controle para um ano letivo e tipo específico.
    
    Args:
        ano_selecionado: int - O ano letivo (ex: 2026)
        tipo_controle: str - Tipo do controle: 'AULA', 'NOTA' ou 'BOLETIM'
    
    Returns:
        dict com:
        - ano: int
        - bimestres: lista de bimestres com suas datas e status de liberação
        - hoje_liberados: lista de bimestres que podem ser registrados HOJE
        - data_atual: str - data de hoje em formato ISO
        
    Exemplo de uso:
        restricoes = get_restricoes_controle(2026, 'AULA')
        if 1 in restricoes['hoje_liberados']:
            print('Pode registrar aulas do 1º bimestre')
    """
    if not ano_selecionado:
        return {'ano': None, 'bimestres': [], 'hoje_liberados': [], 'data_atual': None}
    
    try:
        ano_letivo = AnoLetivo.objects.get(ano=ano_selecionado)
    except AnoLetivo.DoesNotExist:
        return {'ano': ano_selecionado, 'bimestres': [], 'hoje_liberados': [], 'data_atual': None}
    
    hoje = timezone.localdate()
    bimestres_info = []
    hoje_liberados = []
    
    # Busca todos os controles do tipo especificado para o ano
    controles = ControleRegistrosVisualizacao.objects.filter(
        ano_letivo=ano_letivo,
        tipo=tipo_controle
    ).order_by('bimestre')
    
    for controle in controles:
        bim = controle.bimestre
        
        # Datas do bimestre (período de aulas/notas)
        bim_inicio = getattr(ano_letivo, f'inicio_bim{bim}', None)
        bim_fim = getattr(ano_letivo, f'fim_bim{bim}', None)
        
        # Verifica se está liberado hoje
        liberado_hoje = controle.esta_liberado(hoje)
        
        bimestre_data = {
            'bimestre': bim,
            'aula_inicio': bim_inicio.isoformat() if bim_inicio else None,
            'aula_fim': bim_fim.isoformat() if bim_fim else None,
            'registro_inicio': controle.data_inicio.isoformat() if controle.data_inicio else None,
            'registro_fim': controle.data_fim.isoformat() if controle.data_fim else None,
            'liberado_hoje': liberado_hoje,
            'digitacao_futura': controle.digitacao_futura if tipo_controle == 'AULA' else None,
            'status': controle.status_liberacao
        }
        bimestres_info.append(bimestre_data)
        
        if liberado_hoje:
            hoje_liberados.append(bim)
    
    return {
        'ano': ano_selecionado,
        'bimestres': bimestres_info,
        'hoje_liberados': hoje_liberados,
        'data_atual': hoje.isoformat()
    }


def verificar_data_registro_aula(ano_selecionado, data_registro):
    """
    Verifica se uma data específica pode ser usada para registro de aula.
    
    Args:
        ano_selecionado: int - O ano letivo
        data_registro: date - A data que se deseja registrar
    
    Returns:
        dict com:
        - liberado: bool
        - bimestre: int ou None
        - mensagem: str
    """
    from datetime import date
    
    if not ano_selecionado:
        return {'liberado': False, 'bimestre': None, 'mensagem': 'Nenhum ano letivo selecionado.'}
    
    try:
        ano_letivo = AnoLetivo.objects.get(ano=ano_selecionado)
    except AnoLetivo.DoesNotExist:
        return {'liberado': False, 'bimestre': None, 'mensagem': f'Ano letivo {ano_selecionado} não encontrado.'}
    
    # Verifica se a data pertence ao ano letivo
    if data_registro.year != ano_selecionado:
        return {'liberado': False, 'bimestre': None, 'mensagem': f'A data deve ser do ano letivo {ano_selecionado}.'}
    
    # Obtém o bimestre da data
    bimestre = ano_letivo.bimestre(data_registro)
    
    if bimestre is None:
        return {'liberado': False, 'bimestre': None, 'mensagem': 'A data está fora do período letivo.'}
    
    # Busca o controle de registro para esse bimestre
    controle = ControleRegistrosVisualizacao.objects.filter(
        ano_letivo=ano_letivo,
        bimestre=bimestre,
        tipo='AULA'
    ).first()
    
    if not controle:
        return {'liberado': False, 'bimestre': bimestre, 'mensagem': f'Não há configuração de registro para o {bimestre}º bimestre.'}
    
    # Verifica se HOJE está no período liberado
    hoje = timezone.localdate()
    liberado = controle.esta_liberado(hoje)
    
    if liberado:
        # Verifica digitacao_futura se a data_registro for futura
        if data_registro > hoje and not controle.digitacao_futura:
            return {'liberado': False, 'bimestre': bimestre, 'mensagem': 'Não é permitido registrar aulas para datas futuras neste bimestre.'}
        
        return {'liberado': True, 'bimestre': bimestre, 'mensagem': f'Registro liberado para o {bimestre}º bimestre.'}
    else:
        # Monta mensagem explicativa
        status_liberacao = controle.status_liberacao
        if status_liberacao == 'Aguardando início':
            msg = f'O período de registro do {bimestre}º bimestre ainda não iniciou.'
            if controle.data_inicio:
                msg += f' Início: {controle.data_inicio.strftime("%d/%m/%Y")}.'
        elif status_liberacao == 'Encerrado':
            msg = f'O período de registro do {bimestre}º bimestre já encerrou.'
            if controle.data_fim:
                msg += f' Encerrou em: {controle.data_fim.strftime("%d/%m/%Y")}.'
        else:
            msg = f'O registro do {bimestre}º bimestre está bloqueado.'
        
        return {'liberado': False, 'bimestre': bimestre, 'mensagem': msg}
