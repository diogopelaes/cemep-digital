# =============================================================================
# CONSTANTES GLOBAIS E CONFIGURAÇÕES DE AVALIAÇÃO
# =============================================================================
"""
Este módulo centraliza as configurações de avaliação.

IMPORTANTE:
- As constantes definidas aqui são VALORES PADRÃO usados para inicialização
- Em runtime, os valores devem ser obtidos de AnoLetivo.controles['avaliacao']
- Use get_config_from_ano_letivo(ano_letivo) para obter as configs de um ano específico
"""
from decimal import Decimal, ROUND_CEILING, ROUND_HALF_UP
from typing import Callable

# -----------------------------------------------------------------------------
# Constantes Numéricas (pré-alocadas para evitar criação repetida)
# -----------------------------------------------------------------------------
_D1 = Decimal('1')
_D2 = Decimal('2')



# -----------------------------------------------------------------------------
# Opções para Formulários/Choices (constantes fixas, nunca mudam por ano)
# -----------------------------------------------------------------------------
BIMESTRE_CHOICES = [
    (1, '1º Bimestre'),
    (2, '2º Bimestre'),
    (3, '3º Bimestre'),
    (4, '4º Bimestre'),
]

OPCOES_FORMA_CALCULO = [
    ('SOMA', 'Soma'),
    ('MEDIA_PONDERADA', 'Média Ponderada'),
    ('LIVRE_ESCOLHA', 'Livre Escolha'),
]

OPCOES_REGRA_ARREDONDAMENTO = [
    ('MATEMATICO_CLASSICO', 'Arredondamento Matemático Clássico'),
    ('FAIXAS_MULTIPLOS_05', 'Arredondamento por Faixas (Múltiplos de 0,5)'),
    ('SEMPRE_PARA_CIMA', 'Arredondamento Sempre para Cima (Base Decimal)'),
    ('SEMPRE_PARA_CIMA_05', 'Arredondamento Sempre para Cima (Múltiplos de 0,5)'),
]


# =============================================================================
# FUNÇÕES PARA OBTER CONFIGURAÇÃO DO ANO LETIVO
# =============================================================================

def get_config_from_ano_letivo(ano_letivo) -> dict:
    """
    Retorna as configurações de avaliação do ano letivo.
    Acessa diretamente AnoLetivo.controles['avaliacao'].
    """
    cfg = ano_letivo.controles['avaliacao']
    
    return {
        "VALOR_MAXIMO": cfg['valor_maximo'],
        "MEDIA_APROVACAO": cfg['media_aprovacao'],
        "FORMA_CALCULO": cfg['forma_calculo'],
        "REGRA_ARREDONDAMENTO": cfg['regra_arredondamento'],
        "CASAS_DECIMAIS_BIMESTRAL": cfg['casas_decimais_bimestral'],
        "CASAS_DECIMAIS_AVALIACAO": cfg['casas_decimais_avaliacao'],
        "LIVRE_ESCOLHA_PROFESSOR": cfg['livre_escolha_professor'],
        "PODE_CRIAR": cfg.get('pode_criar', False),
        "BIMESTRE_CHOICES": [{"id": k, "label": v} for k, v in BIMESTRE_CHOICES],
        "OPCOES_FORMA_CALCULO": [{"id": k, "label": v} for k, v in OPCOES_FORMA_CALCULO],
        "OPCOES_REGRA_ARREDONDAMENTO": [{"id": k, "label": v} for k, v in OPCOES_REGRA_ARREDONDAMENTO],
    }






# =============================================================================
# FUNÇÕES DE ARREDONDAMENTO
# =============================================================================

def _arredondar_matematico_classico(valor: Decimal, casas: int) -> Decimal:
    """Arredondamento matemático clássico (ROUND_HALF_UP)."""
    return valor.quantize(_D1.scaleb(-casas), rounding=ROUND_HALF_UP)


def _arredondar_faixas_multiplos_05(valor: Decimal, casas: int) -> Decimal:
    """Arredonda para múltiplos de 0.5.
    
    Faixas: <0.25 -> 0, [0.25, 0.75) -> 0.5, >=0.75 -> 1.0
    """
    return (valor * _D2).quantize(_D1, rounding=ROUND_HALF_UP) / _D2


def _arredondar_sempre_para_cima(valor: Decimal, casas: int) -> Decimal:
    """Arredonda sempre para cima (ROUND_CEILING) na casa decimal especificada."""
    return valor.quantize(_D1.scaleb(-casas), rounding=ROUND_CEILING)


def _arredondar_sempre_para_cima_05(valor: Decimal, casas: int) -> Decimal:
    """Arredonda sempre para cima em múltiplos de 0.5."""
    return (valor * _D2).quantize(_D1, rounding=ROUND_CEILING) / _D2


# Mapa de Despacho (lookup direto)
_MAPA_ARREDONDAMENTO: dict[str, Callable[[Decimal, int], Decimal]] = {
    'MATEMATICO_CLASSICO': _arredondar_matematico_classico,
    'FAIXAS_MULTIPLOS_05': _arredondar_faixas_multiplos_05,
    'SEMPRE_PARA_CIMA': _arredondar_sempre_para_cima,
    'SEMPRE_PARA_CIMA_05': _arredondar_sempre_para_cima_05,
}


def arredondar(
    valor: Decimal,
    regra: str,
    casas_decimais: int = 1,
) -> Decimal:
    """
    Arredonda um valor decimal com base na regra e casas decimais informadas.
    
    Args:
        valor: Valor decimal a ser arredondado.
        regra: Chave da regra de arredondamento (obtida do ano letivo).
        casas_decimais: Número de casas decimais.
    
    Returns:
        Valor arredondado conforme a regra especificada.
    """
    func = _MAPA_ARREDONDAMENTO.get(regra)
    if func is not None:
        return func(valor, casas_decimais)
    
    # Regra inválida: retorna valor original
    return valor


def arredondar_bimestral(valor: Decimal, ano_letivo) -> Decimal:
    """
    Arredonda um valor para nota bimestral usando config do ano letivo.
    
    Args:
        valor: Valor a ser arredondado
        ano_letivo: Instância de AnoLetivo para obter a config
    """
    cfg = get_config_from_ano_letivo(ano_letivo)
    return arredondar(
        valor,
        cfg["REGRA_ARREDONDAMENTO"],
        cfg["CASAS_DECIMAIS_BIMESTRAL"]
    )


def arredondar_avaliacao(valor: Decimal, ano_letivo) -> Decimal:
    """
    Arredonda um valor para nota de avaliação usando config do ano letivo.
    
    Args:
        valor: Valor a ser arredondado
        ano_letivo: Instância de AnoLetivo para obter a config
    """
    cfg = get_config_from_ano_letivo(ano_letivo)
    return arredondar(
        valor,
        cfg["REGRA_ARREDONDAMENTO"],
        cfg["CASAS_DECIMAIS_AVALIACAO"]
    )


def valida_valor_nota(nota: Decimal, ano_letivo) -> bool:
    """
    Valida se a nota:
    - Está no intervalo [0, valor_maximo]
    - Respeita o incremento exigido pela regra de arredondamento
    - Zero é sempre considerado válido
    """
    cfg = ano_letivo.controles['avaliacao']
    
    max_valor = Decimal(str(cfg['valor_maximo']))
    regra = cfg['regra_arredondamento']
    casas = cfg['casas_decimais_avaliacao']

    if nota < 0 or nota > max_valor:
        return False

    if nota == 0:
        return True

    # Regras baseadas em múltiplos de 0.5
    if regra in ('FAIXAS_MULTIPLOS_05', 'SEMPRE_PARA_CIMA_05'):
        return (nota * _D2) % _D1 == 0

    # Regras baseadas em número fixo de casas decimais
    fator = _D1.scaleb(casas)
    return (nota * fator) % _D1 == 0
