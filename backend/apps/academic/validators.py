
def validate_matricula_digits(value):
    """Valida se a matrícula contém apenas números, podendo terminar com X."""
    if not value:
        raise ValidationError('A matrícula é obrigatória.')
    
    # Remove formatação mas mantém X/x
    clean_value = re.sub(r'[^0-9Xx]', '', str(value))
    
    if not clean_value:
        raise ValidationError('A matrícula deve conter pelo menos um caractere válido.')
    
    # Verifica formato: apenas dígitos, podendo terminar com X
    # Se tem X, deve ser apenas no final
    if 'X' in clean_value.upper():
        # X só pode aparecer na última posição
        if clean_value.upper().index('X') != len(clean_value) - 1:
            raise ValidationError('X só pode aparecer no final da matrícula.')
        # Todos os caracteres antes do X devem ser dígitos
        if not clean_value[:-1].isdigit():
            raise ValidationError('Todos os caracteres antes do X devem ser dígitos.')
    else:
        # Sem X, todos devem ser dígitos
        if not clean_value.isdigit():
            raise ValidationError('A matrícula deve conter apenas números (e opcionalmente X no final).')