/**
 * Componente para exibição de informações booleanas
 * Usado em páginas de detalhes para campos sim/não
 * 
 * @param {Object} props
 * @param {string} props.label - Label da informação
 * @param {boolean} props.value - Valor booleano
 * @param {string} [props.trueText='Sim'] - Texto quando true
 * @param {string} [props.falseText='Não'] - Texto quando false
 */
export default function BooleanItem({
    label,
    value,
    trueText = 'Sim',
    falseText = 'Não'
}) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-600 dark:text-slate-400">{label}</span>
            <span className={`font-medium ${value
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                {value ? trueText : falseText}
            </span>
        </div>
    )
}
