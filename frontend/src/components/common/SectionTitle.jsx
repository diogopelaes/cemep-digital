/**
 * Título de seção dentro de formulários
 * 
 * @param {Object} props
 * @param {string} props.title - Título da seção
 * @param {string} [props.badge] - Badge opcional ao lado do título
 * @param {React.ReactNode} [props.actions] - Ações no lado direito
 */
export default function SectionTitle({ title, badge, actions }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                {title}
                {badge && (
                    <span className="ml-2 text-sm font-normal text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                        {badge}
                    </span>
                )}
            </h2>
            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    )
}
