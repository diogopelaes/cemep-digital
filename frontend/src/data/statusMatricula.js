/**
 * Opções de status da matrícula para uso em selects
 */
export const STATUS_MATRICULA = [
    { value: 'MATRICULADO', label: 'Matriculado' },
    { value: 'CONCLUIDO', label: 'Concluído' },
    { value: 'ABANDONO', label: 'Abandono' },
    { value: 'TRANSFERIDO', label: 'Transferido' },
    { value: 'OUTRO', label: 'Outro' },
]

/**
 * Cores para badges de status de matrícula
 */
export const STATUS_MATRICULA_COLORS = {
    MATRICULADO: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    CONCLUIDO: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    ABANDONO: 'bg-red-500/10 text-red-600 dark:text-red-400',
    TRANSFERIDO: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    OUTRO: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
}
