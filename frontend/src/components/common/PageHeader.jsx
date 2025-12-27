import { HiArrowLeft } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui'

/**
 * Header padrão para páginas
 * 
 * @param {Object} props
 * @param {string} props.title - Título da página
 * @param {string} [props.subtitle] - Subtítulo opcional
 * @param {string} [props.backTo] - Path para navegação ao clicar no botão voltar
 * @param {Function} [props.onBack] - Callback customizado para voltar (substitui backTo)
 * @param {Array} [props.actions] - Array de ações {icon, label, onClick, variant}
 * @param {React.ReactNode} [props.children] - Conteúdo adicional no header
 */
export default function PageHeader({
    title,
    subtitle,
    backTo,
    onBack,
    actions = [],
    children
}) {
    const navigate = useNavigate()

    const handleBack = () => {
        if (onBack) {
            onBack()
        } else if (backTo) {
            navigate(backTo)
        }
    }

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
                {(backTo || onBack) && (
                    <button
                        onClick={handleBack}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <HiArrowLeft className="h-6 w-6" />
                    </button>
                )}
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {(actions.length > 0 || children) && (
                <div className="flex items-center gap-3">
                    {children}
                    {actions.map((action, index) => (
                        <Button
                            key={index}
                            icon={action.icon}
                            variant={action.variant || 'primary'}
                            onClick={action.onClick}
                            loading={action.loading}
                            disabled={action.disabled}
                        >
                            {action.label}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    )
}
