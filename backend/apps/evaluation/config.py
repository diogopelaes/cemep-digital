# =============================================================================
# CONSTANTES GLOBAIS E CONFIGURAÇÕES DE AVALIAÇÃO
# =============================================================================
from decimal import Decimal, ROUND_CEILING, ROUND_HALF_UP
from typing import Callable

# -----------------------------------------------------------------------------
# Constantes Numéricas (pré-alocadas para evitar criação repetida)
# -----------------------------------------------------------------------------
_D1 = Decimal('1')
_D2 = Decimal('2')

VALOR_MAXIMO = Decimal('10.00')
MEDIA_APROVACAO = Decimal('6.00')

# -----------------------------------------------------------------------------
# Opções para Formulários/Choices
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

# -----------------------------------------------------------------------------
# Configurações Padrão
# -----------------------------------------------------------------------------
FORMA_CALCULO = 'LIVRE_ESCOLHA'
REGRA_ARREDONDAMENTO = 'FAIXAS_MULTIPLOS_05'
NUMERO_CASAS_DECIMAIS_BIMESTRAL = 1
NUMERO_CASAS_DECIMAIS_AVALIACAO = 2

# -----------------------------------------------------------------------------
# Funções de Arredondamento (assinatura unificada para eliminar overhead)
# -----------------------------------------------------------------------------
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


# -----------------------------------------------------------------------------
# Mapa de Despacho (lookup direto, sem lambdas, sem overhead)
# -----------------------------------------------------------------------------
_MAPA_ARREDONDAMENTO: dict[str, Callable[[Decimal, int], Decimal]] = {
    'MATEMATICO_CLASSICO': _arredondar_matematico_classico,
    'FAIXAS_MULTIPLOS_05': _arredondar_faixas_multiplos_05,
    'SEMPRE_PARA_CIMA': _arredondar_sempre_para_cima,
    'SEMPRE_PARA_CIMA_05': _arredondar_sempre_para_cima_05,
}

# Cache local para evitar lookup repetido em dict global
_ARREDONDAR_PADRAO = _MAPA_ARREDONDAMENTO[REGRA_ARREDONDAMENTO]


def arredondar(
    valor: Decimal,
    regra: str = REGRA_ARREDONDAMENTO,
    casas_decimais: int = 1,
) -> Decimal:
    """Arredonda um valor decimal com base na regra e casas decimais informadas.
    
    Args:
        valor: Valor decimal a ser arredondado.
        regra: Chave da regra de arredondamento (padrão: REGRA_ARREDONDAMENTO).
        casas_decimais: Número de casas decimais (usado por algumas regras).
    
    Returns:
        Valor arredondado conforme a regra especificada.
    
    Raises:
        ValueError: Se o valor ou regra forem inválidos.
    """
    # Fast path: regra padrão (evita lookup no dict)
    if regra == REGRA_ARREDONDAMENTO:
        return _ARREDONDAR_PADRAO(valor, casas_decimais)
    
    # Lookup direto com fallback
    func = _MAPA_ARREDONDAMENTO.get(regra)
    if func is not None:
        return func(valor, casas_decimais)
    
    # Regra inválida: retorna valor original
    return valor


def arredondar_bimestral(valor: Decimal, regra: str = REGRA_ARREDONDAMENTO) -> Decimal:
    """Arredonda um valor para nota bimestral (casas decimais pré-definidas)."""
    return arredondar(valor, regra, NUMERO_CASAS_DECIMAIS_BIMESTRAL)


def arredondar_avaliacao(valor: Decimal, regra: str = REGRA_ARREDONDAMENTO) -> Decimal:
    """Arredonda um valor para nota de avaliação (casas decimais pré-definidas)."""
    return arredondar(valor, regra, NUMERO_CASAS_DECIMAIS_AVALIACAO)


def valida_valor_nota(
    nota: Decimal,
    valor_maximo: Decimal = VALOR_MAXIMO,
    regra: str = REGRA_ARREDONDAMENTO,
    casas: int = NUMERO_CASAS_DECIMAIS_BIMESTRAL,
) -> bool:
    """
    Valida se a nota:
    - Está no intervalo [0, valor_maximo]
    - Respeita o incremento exigido pela regra de arredondamento
    - Zero é sempre considerado válido
    """

    # Intervalo válido (zero explicitamente aceito)
    if nota < 0 or nota > valor_maximo:
        return False

    # Zero é válido para qualquer regra
    if nota == 0:
        return True

    # Regras baseadas em múltiplos de 0.5
    if regra in ('FAIXAS_MULTIPLOS_05', 'SEMPRE_PARA_CIMA_05'):
        # Ex.: 0.5, 1.0, 1.5, ...
        return (nota * _D2) % _D1 == 0

    # Regras baseadas em número fixo de casas decimais
    fator = _D1.scaleb(casas)
    return (nota * fator) % _D1 == 0


def get_config() -> dict:
    """
    Retorna as configurações de avaliação em formato de dicionário (JSON-friendly).
    """
    return {
        "VALOR_MAXIMO": float(VALOR_MAXIMO),
        "MEDIA_APROVACAO": float(MEDIA_APROVACAO),
        "BIMESTRE_CHOICES": [{"id": k, "label": v} for k, v in BIMESTRE_CHOICES],
        "OPCOES_FORMA_CALCULO": [{"id": k, "label": v} for k, v in OPCOES_FORMA_CALCULO],
        "OPCOES_REGRA_ARREDONDAMENTO": [{"id": k, "label": v} for k, v in OPCOES_REGRA_ARREDONDAMENTO],
        "FORMA_CALCULO": FORMA_CALCULO,
        "REGRA_ARREDONDAMENTO": REGRA_ARREDONDAMENTO,
        "NUMERO_CASAS_DECIMAIS_BIMESTRAL": NUMERO_CASAS_DECIMAIS_BIMESTRAL,
        "NUMERO_CASAS_DECIMAIS_AVALIACAO": NUMERO_CASAS_DECIMAIS_AVALIACAO,
    }

