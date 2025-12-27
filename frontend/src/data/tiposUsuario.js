/**
 * Tipos de usuário funcionário para uso em selects
 */
export const TIPOS_USUARIO = [
    { value: 'GESTAO', label: 'Gestão' },
    { value: 'SECRETARIA', label: 'Secretaria' },
    { value: 'PROFESSOR', label: 'Professor' },
    { value: 'MONITOR', label: 'Monitor' },
]

/**
 * Cores para badges de tipo de usuário
 */
export const TIPOS_USUARIO_COLORS = {
    GESTAO: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    SECRETARIA: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    PROFESSOR: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    MONITOR: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}
