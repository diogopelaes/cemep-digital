import re
from django.core.exceptions import ValidationError

def clean_digits(value):
    """Remove caracteres não numéricos."""
    if not value:
        return ""
    return re.sub(r'\D', '', str(value))

def validate_cpf(value):
    """Valida se o CPF é válido. Permite valores vazios para campos opcionais."""
    if not value:
        return  # Permite CPF vazio quando o campo é opcional
    
    cpf = clean_digits(value)
    
    if len(cpf) != 11:
        raise ValidationError('CPF deve conter 11 dígitos.')
    
    # Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
    if cpf == cpf[0] * 11:
        raise ValidationError('CPF inválido.')
    
    # Cálculo do primeiro dígito verificador
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    resto = (soma * 10) % 11
    if resto == 10:
        resto = 0
    if resto != int(cpf[9]):
        raise ValidationError('CPF inválido.')
    
    # Cálculo do segundo dígito verificador
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    resto = (soma * 10) % 11
    if resto == 10:
        resto = 0
    if resto != int(cpf[10]):
        raise ValidationError('CPF inválido.')
