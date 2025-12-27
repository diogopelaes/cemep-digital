/**
 * Formatadores centralizados para o projeto CEMEP Digital
 * 
 * Convenção:
 * - format*: Máscaras de input (para onChange em campos de formulário)
 * - display*: Formatação para exibição (retorna '-' se vazio)
 */

// =============================================================================
// MÁSCARAS DE INPUT (para uso em onChange de formulários)
// =============================================================================

/**
 * Máscara de telefone para input: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 * @param {string} value - Valor do input
 * @returns {string} Valor formatado
 */
export const formatTelefone = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)

    if (numbers.length <= 2) {
        return numbers.length ? `(${numbers}` : ''
    }
    if (numbers.length <= 6) {
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    }
    if (numbers.length <= 10) {
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
}

/**
 * Máscara de CPF para input: XXX.XXX.XXX-XX
 * @param {string} value - Valor do input
 * @returns {string} Valor formatado
 */
export const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)

    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
}

/**
 * Máscara de CEP para input: XX.XXX-XXX
 * @param {string} value - Valor do input
 * @returns {string} Valor formatado
 */
export const formatCEP = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8)

    if (numbers.length <= 2) return numbers
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}-${numbers.slice(5)}`
}

/**
 * Máscara de Matrícula para input: XXX.XXX.XXX-X (10 dígitos)
 * @param {string} value - Valor do input
 * @returns {string} Valor formatado
 */
export const formatMatricula = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 10)

    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
}

// =============================================================================
// FORMATADORES DE EXIBIÇÃO (para display, retornam '-' se vazio)
// =============================================================================

/**
 * Formata CPF para exibição
 * @param {string} value - CPF (com ou sem formatação)
 * @returns {string} CPF formatado ou '-'
 */
export const displayCPF = (value) => {
    if (!value) return '-'
    const cpf = value.replace(/\D/g, '')
    if (cpf.length !== 11) return value
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata telefone para exibição
 * @param {string} value - Telefone (com ou sem formatação)
 * @returns {string} Telefone formatado ou '-'
 */
export const displayTelefone = (value) => {
    if (!value) return '-'
    const phone = value.replace(/\D/g, '')
    if (phone.length === 11) {
        return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    if (phone.length === 10) {
        return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return value
}

/**
 * Formata CEP para exibição
 * @param {string} value - CEP (com ou sem formatação)
 * @returns {string} CEP formatado ou '-'
 */
export const displayCEP = (value) => {
    if (!value) return '-'
    const cep = value.replace(/\D/g, '')
    if (cep.length !== 8) return value
    return cep.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2-$3')
}

/**
 * Formata matrícula para exibição
 * @param {string} value - Matrícula (com ou sem formatação)
 * @returns {string} Matrícula formatada ou '-'
 */
export const displayMatricula = (value) => {
    if (!value) return '-'
    const numbers = value.replace(/\D/g, '')
    if (numbers.length !== 10) return value
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
}

// =============================================================================
// UTILITÁRIOS
// =============================================================================

/**
 * Remove formatação de um valor, mantendo apenas dígitos
 * @param {string} value - Valor formatado
 * @returns {string} Apenas dígitos
 */
export const onlyNumbers = (value) => {
    if (!value) return ''
    return value.replace(/\D/g, '')
}
