import { HiCheck, HiSelector } from 'react-icons/hi'

/**
 * TurmaSelector - Componente padrão para seleção múltipla de turmas
 * 
 * @param {Array} turmas - Lista de objetos de turma [{ id, numero, letra, curso: { sigla } }]
 * @param {Array} selectedIds - Lista de IDs das turmas selecionadas
 * @param {Function} onChange - Callback disparado ao alterar a seleção (recebe o novo array de IDs)
 * @param {string} label - Rótulo opcional para o campo
 */
export default function TurmaSelector({
    turmas = [],
    selectedIds = [],
    onChange,
    label = "Selecione as Turmas"
}) {
    // Verifica se "Todas" estão selecionadas
    const isAllSelected = turmas.length > 0 && selectedIds.length === turmas.length

    // Calcula estado de "indeterminado" (parcialmente selecionado) se necessário
    // mas aqui o comportamento solicitado é toggle All/None com o botão "Todas".

    const handleToggle = (id) => {
        if (!onChange) return

        const isSelected = selectedIds.includes(id)
        const newSelection = isSelected
            ? selectedIds.filter(item => item !== id)
            : [...selectedIds, id]

        onChange(newSelection)
    }

    const handleToggleAll = () => {
        if (!onChange) return
        // Se todas já estiverem selecionadas, desmarca todas. Caso contrário, seleciona todas.
        const allIds = turmas.map(t => t.id)
        onChange(isAllSelected ? [] : allIds)
    }

    // Botão de "Todas" funciona como um checkbox mestre
    const renderOption = (key, isSelected, onClick, labelText, metaText = null) => (
        <button
            key={key}
            type="button"
            onClick={onClick}
            className={`
                group relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-200 select-none
                ${isSelected
                    ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'
                }
            `}
        >
            <div className={`
                w-4 h-4 rounded-full border items-center justify-center flex transition-colors flex-shrink-0
                ${isSelected
                    ? 'bg-white border-white'
                    : 'border-slate-300 dark:border-slate-500 group-hover:border-primary-400'
                }
             `}>
                {isSelected && <HiCheck className="w-3 h-3 text-primary-600" />}
            </div>

            <span className="whitespace-nowrap">
                {labelText} {metaText && <span className={`text-[10px] uppercase opacity-70 ${isSelected ? 'text-primary-100' : 'text-slate-400'}`}>{metaText}</span>}
            </span>
        </button>
    )

    return (
        <div className="space-y-3">
            {label && (
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    {label}
                </label>
            )}

            <div className="flex flex-wrap gap-2">
                {/* Botão "Todas" incorporado como opção */}
                {turmas.length > 1 && renderOption(
                    'all-turmas-option',
                    isAllSelected,
                    handleToggleAll,
                    "Todas",
                    null
                )}

                {turmas.map((turma) => (
                    renderOption(
                        turma.id,
                        selectedIds.includes(turma.id),
                        () => handleToggle(turma.id),
                        `${turma.numero}${turma.letra}`,
                        `- ${turma.curso?.sigla}`
                    )
                ))}

                {turmas.length === 0 && (
                    <div className="w-full py-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <p className="text-sm text-slate-400">Nenhuma turma disponível.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
