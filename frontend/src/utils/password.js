/**
 * Gera uma senha segura aleatória
 * @param {number} length - Tamanho da senha (padrão: 12)
 * @returns {string} Senha gerada
 */
export function generatePassword(length = 12) {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // Sem I e O para evitar confusão
  const lowercase = 'abcdefghjkmnpqrstuvwxyz' // Sem i, l e o
  const numbers = '23456789' // Sem 0 e 1
  const symbols = '@#$%&*!'
  
  const allChars = uppercase + lowercase + numbers + symbols
  
  // Garante que tenha pelo menos um de cada tipo
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Preenche o resto
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Embaralha
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Gera um nome de usuário baseado no nome completo
 * @param {string} firstName - Primeiro nome
 * @param {string} lastName - Sobrenome
 * @returns {string} Nome de usuário sugerido
 */
export function generateUsername(firstName, lastName) {
  const first = firstName?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '') || ''
  const last = lastName?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '') || ''
  
  if (first && last) {
    return `${first}.${last}`
  }
  return first || 'usuario'
}

