/**
 * Switch de ativo/inativo estilizado
 * Usado em formulários para campos booleanos de ativação
 * 
 * @param {Object} props
 * @param {string} props.label - Label principal
 * @param {string} [props.description] - Descrição adicional
 * @param {boolean} props.checked - Estado do switch
 * @param {Function} props.onChange - Callback quando muda (recebe novo valor)
 * @param {boolean} [props.disabled] - Se está desabilitado
 */
export default function ToggleSwitch({
    label,
    description,
    checked,
    onChange,
    disabled = false
}) {
    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </span>
                {description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {description}
                    </p>
                )}
            </div>
            <button
                type="button"
                onClick={() => !disabled && onChange(!checked)}
                disabled={disabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''
                    } ${checked
                        ? 'bg-success-500'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    )
}
