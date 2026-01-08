/**
 * Utilitários para formatação de datas no padrão brasileiro
 */

/**
 * Formata uma data para o padrão brasileiro (dd/mm/aaaa)
 * @param {string|Date} date - Data em formato ISO, Date object ou qualquer formato válido
 * @param {object} options - Opções adicionais de formatação
 * @returns {string} Data formatada ou string vazia se inválida
 */
export const formatDateBR = (date, options = {}) => {
  if (!date) return ''

  try {
    // Se for string no formato ISO (yyyy-mm-dd), adiciona T00:00:00 para evitar problemas de timezone
    const dateObj = typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)
      ? new Date(date + 'T00:00:00')
      : new Date(date)

    if (isNaN(dateObj.getTime())) return ''

    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options
    })
  } catch {
    return ''
  }
}

/**
 * Formata uma data para o padrão brasileiro curto (dd/mm), omitindo o ano
 * @param {string|Date} date - Data em formato ISO, Date object ou qualquer formato válido
 * @returns {string} Data formatada ou string vazia se inválida
 */
export const formatDateShortBR = (date) => {
  return formatDateBR(date, { year: undefined })
}

/**
 * Formata uma data para exibição com dia da semana
 * @param {string|Date} date - Data em formato ISO, Date object ou qualquer formato válido
 * @returns {string} Data formatada com dia da semana
 */
export const formatDateLongBR = (date) => {
  if (!date) return ''

  try {
    const dateObj = typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)
      ? new Date(date + 'T00:00:00')
      : new Date(date)

    if (isNaN(dateObj.getTime())) return ''

    return dateObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return ''
  }
}

/**
 * Formata data e hora para o padrão brasileiro
 * @param {string|Date} date - Data em formato ISO ou Date object
 * @returns {string} Data e hora formatadas
 */
export const formatDateTimeBR = (date) => {
  if (!date) return ''

  try {
    const dateObj = new Date(date)

    if (isNaN(dateObj.getTime())) return ''

    return dateObj.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

/**
 * Retorna a data atual no formato ISO (yyyy-mm-dd)
 * @returns {string} Data atual em formato ISO
 */
export const getCurrentDateISO = () => {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

/**
 * Converte data brasileira (dd/mm/aaaa) para ISO (yyyy-mm-dd)
 * @param {string} brDate - Data no formato dd/mm/aaaa
 * @returns {string} Data no formato yyyy-mm-dd ou string vazia se inválida
 */
export const brToISO = (brDate) => {
  if (!brDate || brDate.length !== 10) return ''
  const [day, month, year] = brDate.split('/')
  return `${year}-${month}-${day}`
}

/**
 * Converte data ISO (yyyy-mm-dd) para brasileira (dd/mm/aaaa)
 * @param {string} isoDate - Data no formato yyyy-mm-dd
 * @returns {string} Data no formato dd/mm/aaaa ou string vazia se inválida
 */
export const isoToBR = (isoDate) => {
  if (!isoDate || isoDate.length !== 10) return ''
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Calcula a idade a partir de uma data de nascimento
 * @param {string|Date} birthDate - Data de nascimento em formato ISO ou Date object
 * @returns {number|null} Idade em anos ou null se inválida
 */
export const calcularIdade = (birthDate) => {
  if (!birthDate) return null

  try {
    const dateObj = typeof birthDate === 'string' && birthDate.match(/^\d{4}-\d{2}-\d{2}$/)
      ? new Date(birthDate + 'T00:00:00')
      : new Date(birthDate)

    if (isNaN(dateObj.getTime())) return null

    const hoje = new Date()
    let idade = hoje.getFullYear() - dateObj.getFullYear()
    const m = hoje.getMonth() - dateObj.getMonth()

    if (m < 0 || (m === 0 && hoje.getDate() < dateObj.getDate())) {
      idade--
    }

    return idade
  } catch {
    return null
  }
}

