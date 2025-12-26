export const formatCPF = (value) => {
    if (!value) return '-'
    const cpf = value.replace(/\D/g, '')
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export const formatTelefone = (value) => {
    if (!value) return '-'
    const phone = value.replace(/\D/g, '')
    if (phone.length === 11) {
        return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export const formatCEP = (value) => {
    if (!value) return '-'
    const cep = value.replace(/\D/g, '')
    return cep.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2-$3')
}
