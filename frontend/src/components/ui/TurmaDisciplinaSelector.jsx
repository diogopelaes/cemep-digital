import { HiCheck } from 'react-icons/hi'

/**
 * TurmaDisciplinaSelector - Componente para seleção múltipla de turmas/disciplinas (PDTs)
 * 
 * @param {Array} atribuicoes - Lista de objetos [{ id, turma_numero_letra, disciplina_sigla }]
 * @param {Array} selectedIds - Lista de IDs selecionados
 * @param {Function} onChange - Callback ao alterar seleção (recebe array de IDs)
 * @param {string} label - Rótulo do campo
 * @param {boolean} multiDisciplinas - Se true, mostra a sigla da disciplina junto à turma
 */
export default function TurmaDisciplinaSelector({
    atribuicoes = [],
    selectedIds = [],
    onChange,
    label = "Turmas e Disciplinas",
    multiDisciplinas = true
}) {
    const isAllSelected = atribuicoes.length > 0 && selectedIds.length === atribuicoes.length

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
        const allIds = atribuicoes.map(a => a.id)
        onChange(isAllSelected ? [] : allIds)
    }

    const getLabel = (attr) => {
        if (multiDisciplinas) {
            return `${attr.turma_numero_letra} - ${attr.disciplina_sigla}`
        }
        return attr.turma_numero_letra
    }

    const renderOption = (key, isSelected, onClick, labelText) => (
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
            <span className="whitespace-nowrap">{labelText}</span>
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
                {atribuicoes.length > 1 && renderOption(
                    'all-option',
                    isAllSelected,
                    handleToggleAll,
                    "Todas"
                )}

                {atribuicoes.map((attr) => (
                    renderOption(
                        attr.id,
                        selectedIds.includes(attr.id),
                        () => handleToggle(attr.id),
                        getLabel(attr)
                    )
                ))}

                {atribuicoes.length === 0 && (
                    <div className="w-full py-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <p className="text-sm text-slate-400">Nenhuma atribuição disponível.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
