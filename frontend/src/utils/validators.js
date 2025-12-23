export const validateCPF = (cpf) => {
    if (!cpf) return false

    // Remove caracteres não numéricos
    const cleanCPF = cpf.replace(/[^\d]+/g, '')

    // Verifica tamanho
    if (cleanCPF.length !== 11) return false

    // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
    if (/^(\d)\1+$/.test(cleanCPF)) return false

    // Valida 1o digito verificador
    let add = 0
    for (let i = 0; i < 9; i++) {
        add += parseInt(cleanCPF.charAt(i)) * (10 - i)
    }
    let rev = 11 - (add % 11)
    if (rev === 10 || rev === 11) rev = 0
    if (rev !== parseInt(cleanCPF.charAt(9))) return false

    // Valida 2o digito verificador
    add = 0
    for (let i = 0; i < 10; i++) {
        add += parseInt(cleanCPF.charAt(i)) * (11 - i)
    }
    rev = 11 - (add % 11)
    if (rev === 10 || rev === 11) rev = 0
    if (rev !== parseInt(cleanCPF.charAt(10))) return false

    return true
}
