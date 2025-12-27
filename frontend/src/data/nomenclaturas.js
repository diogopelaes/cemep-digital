/**
 * Nomenclaturas de turmas
 */
export const NOMENCLATURAS = [
    { value: 'ANO', label: 'Ano' },
    { value: 'SERIE', label: 'Série' },
    { value: 'MODULO', label: 'Módulo' },
]

/**
 * Retorna o label de uma nomenclatura
 */
export const getNomenclaturaLabel = (value) => {
    const item = NOMENCLATURAS.find(n => n.value === value)
    return item ? item.label : value
}
