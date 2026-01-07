"""
Funções utilitárias para o App Core

Funções de datas liberadas para registro:
- get_datas_liberadas_aula(): Datas liberadas para registro de aulas/faltas
- get_datas_liberadas_nota(): (futuro) Datas liberadas para registro de notas
- get_datas_liberadas_boletim(): (futuro) Datas liberadas para visualização de boletim
"""
from datetime import timedelta
from django.utils import timezone


def get_datas_liberadas_aula(ano_letivo_id):
    """
    Retorna lista de datas liberadas para registro de aulas e faltas.
    
    Lógica:
    1. Busca ControleRegistrosVisualizacao do tipo AULA liberados HOJE
    2. Para cada bimestre liberado, gera os dias letivos do período
    3. Se digitacao_futura=False, remove datas posteriores a hoje
    4. Remove fins de semana (exceto dias letivos extras)
    5. Remove dias não letivos (feriados, recessos, etc)
    
    Args:
        ano_letivo_id: int - O ano (ex: 2026)
    
    Returns:
        dict:
        - datas: list[str] - Lista de datas ISO liberadas, ordenadas
        - hoje: str - Data atual ISO
        - mensagem: str ou None - Mensagem se houver restrição
    """
    from apps.core.models import AnoLetivo, ControleRegistrosVisualizacao
    
    # Resposta padrão para erros
    erro_response = lambda msg: {'datas': [], 'hoje': timezone.localdate().isoformat(), 'mensagem': msg}
    
    if not ano_letivo_id:
        return erro_response('Nenhum ano letivo selecionado.')
    
    # Busca o ano letivo com prefetch dos relacionamentos
    try:
        ano_letivo = AnoLetivo.objects.prefetch_related(
            'dias_nao_letivos',
            'dias_letivos_extras'
        ).get(ano=ano_letivo_id)
    except AnoLetivo.DoesNotExist:
        return erro_response(f'Ano letivo {ano_letivo_id} não encontrado.')
    
    hoje = timezone.localdate()
    
    # Busca controles de AULA
    controles = ControleRegistrosVisualizacao.objects.filter(
        ano_letivo=ano_letivo,
        tipo=ControleRegistrosVisualizacao.TipoControle.REGISTRO_AULA
    )
    
    # Filtra bimestres liberados hoje e coleta info
    bimestres_liberados = []
    for controle in controles:
        if controle.esta_liberado(hoje):
            bim = controle.bimestre
            
            # Pega datas do bimestre no AnoLetivo
            inicio = getattr(ano_letivo, f'data_inicio_{bim}bim', None)
            fim = getattr(ano_letivo, f'data_fim_{bim}bim', None)
            
            if inicio and fim:
                bimestres_liberados.append({
                    'bimestre': bim,
                    'inicio': inicio,
                    'fim': fim,
                    'permite_futuro': controle.digitacao_futura
                })
    
    if not bimestres_liberados:
        return erro_response('Nenhum bimestre liberado para registro no momento.')
    
    # Prepara conjuntos para lookup O(1)
    dias_nao_letivos = set(d.data for d in ano_letivo.dias_nao_letivos.all())
    dias_letivos_extras = set(d.data for d in ano_letivo.dias_letivos_extras.all())
    
    # Gera lista de datas válidas
    datas_liberadas = set()
    
    for bim_info in bimestres_liberados:
        data_atual = bim_info['inicio']
        data_fim = bim_info['fim']
        permite_futuro = bim_info['permite_futuro']
        
        while data_atual <= data_fim:
            # Pula se não permite futuro e é data futura
            if not permite_futuro and data_atual > hoje:
                data_atual += timedelta(days=1)
                continue
            
            # É dia letivo extra? (sábado/domingo especial) - Sempre válido
            if data_atual in dias_letivos_extras:
                datas_liberadas.add(data_atual.isoformat())
                data_atual += timedelta(days=1)
                continue
            
            # Fim de semana normal? Pula
            if data_atual.weekday() >= 5:  # 5=sábado, 6=domingo
                data_atual += timedelta(days=1)
                continue
            
            # Dia não letivo (feriado, recesso)? Pula
            if data_atual in dias_nao_letivos:
                data_atual += timedelta(days=1)
                continue
            
            # Dia válido!
            datas_liberadas.add(data_atual.isoformat())
            data_atual += timedelta(days=1)
    
    return {
        'datas': sorted(datas_liberadas),
        'hoje': hoje.isoformat(),
        'mensagem': None
    }
