/**
 * Componente para exibição de informações em formato label: value
 * Usado em páginas de detalhes (EstudanteDetalhes, FuncionarioDetalhes)
 * 
 * @param {Object} props
 * @param {React.ComponentType} [props.icon] - Ícone opcional (componente HeroIcon)
 * @param {string} props.label - Label da informação
 * @param {string|React.ReactNode} props.value - Valor a exibir
 * @param {string} [props.className] - Classes CSS adicionais
 */
export default function InfoItem({ icon: Icon, label, value, className = '' }) {
    return (
        <div className={`flex items-start gap-3 ${className}`}>
            {Icon && (
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </div>
            )}
            <div className={Icon ? '' : 'flex-1'}>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {label}
                </p>
                <p className="font-medium text-slate-800 dark:text-white">
                    {value || '-'}
                </p>
            </div>
        </div>
    )
}
