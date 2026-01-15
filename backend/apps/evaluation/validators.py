"""
Validators para o módulo de avaliações.

Este módulo centraliza as validações de regras de negócio para notas de avaliações.
"""
from decimal import Decimal
from django.core.exceptions import ValidationError
from apps.evaluation.config import get_config_from_ano_letivo


def validar_estudante_elegivel(matricula_turma, avaliacao):
    """
    Valida se um estudante é elegível para receber nota em uma avaliação.
    
    Regra: O estudante só pode receber nota se:
    - data_saida é None (ainda está na turma), OU
    - data_saida >= avaliacao.data_fim (saiu após o fim da avaliação)
    
    Args:
        matricula_turma: Instância de MatriculaTurma
        avaliacao: Instância de Avaliacao
    
    Raises:
        ValidationError: Se o estudante não é elegível
    """
    if matricula_turma.data_saida is not None:
        if matricula_turma.data_saida < avaliacao.data_fim:
            raise ValidationError(
                f"O estudante saiu da turma em {matricula_turma.data_saida.strftime('%d/%m/%Y')}, "
                f"antes do fim da avaliação ({avaliacao.data_fim.strftime('%d/%m/%Y')})."
            )


def validar_nota_avaliacao(nota, avaliacao, ano_letivo):
    """
    Valida se uma nota está dentro do range permitido e respeita as casas decimais.
    
    Regras:
    - 0.0 <= nota <= avaliacao.valor
    - Nota deve respeitar casas_decimais_avaliacao do ano letivo
    
    Args:
        nota: Valor da nota (Decimal ou None)
        avaliacao: Instância de Avaliacao
        ano_letivo: Instância de AnoLetivo
    
    Raises:
        ValidationError: Se a nota é inválida
    """
    if nota is None:
        return  # Nota vazia é permitida
    
    nota = Decimal(str(nota))
    
    # Validação de range
    if nota < Decimal('0'):
        raise ValidationError("A nota não pode ser negativa.")
    
    if nota > avaliacao.valor:
        raise ValidationError(
            f"A nota ({nota}) não pode exceder o valor máximo da avaliação ({avaliacao.valor})."
        )
    
    # Validação de casas decimais
    cfg = get_config_from_ano_letivo(ano_letivo)
    casas_decimais = cfg['CASAS_DECIMAIS_AVALIACAO']
    
    # Verifica se a nota tem mais casas decimais que o permitido
    # Multiplica pelo fator e verifica se é inteiro
    fator = Decimal(10) ** casas_decimais
    if (nota * fator) % 1 != 0:
        raise ValidationError(
            f"A nota deve ter no máximo {casas_decimais} casa(s) decimal(ais)."
        )


def get_estudantes_elegiveis(avaliacao, turma_id):
    """
    Retorna queryset de MatriculaTurma elegíveis para uma avaliação em uma turma específica.
    
    Args:
        avaliacao: Instância de Avaliacao
        turma_id: UUID da turma
    
    Returns:
        QuerySet de MatriculaTurma
    """
    from apps.academic.models import MatriculaTurma
    from django.db.models import Q
    
    return MatriculaTurma.objects.filter(
        turma_id=turma_id
    ).filter(
        # data_saida é None OU data_saida >= avaliacao.data_fim
        Q(data_saida__isnull=True) | Q(data_saida__gte=avaliacao.data_fim)
    ).select_related(
        'matricula_cemep__estudante__usuario'
    ).order_by('mumero_chamada')
