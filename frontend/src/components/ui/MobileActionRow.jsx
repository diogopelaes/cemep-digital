import React from 'react'

/**
 * MobileActionButton Component
 * A standardized button for the mobile action row.
 */
export const MobileActionButton = ({
    icon: Icon,
    label,
    onClick,
    variant = 'default', // default, danger, success
    className = ''
}) => {
    const variants = {
        default: 'hover:text-primary-600 dark:hover:text-primary-400',
        danger: 'hover:text-danger-600 dark:hover:text-danger-400',
        success: 'hover:text-success-600 dark:hover:text-success-400',
    }

    return (
        <button
            onClick={(e) => {
                e.stopPropagation()
                onClick && onClick()
            }}
            className={`
                py-4 flex flex-col items-center justify-center gap-1.5 
                text-[10px] font-bold uppercase tracking-wider 
                text-slate-600 dark:text-slate-400 
                hover:bg-white/80 dark:hover:bg-slate-800/80 
                transition-all active:scale-95 border-r border-slate-100 dark:border-slate-800 last:border-r-0
                ${variants[variant] || variants.default}
                ${className}
            `}
        >
            {Icon && <Icon className="h-6 w-6 stroke-[1.5]" />}
            <span>{label}</span>
        </button>
    )
}

/**
 * MobileActionRow Component
 * An expandable drawer for mobile card actions.
 */
export const MobileActionRow = ({ isOpen, children, className = '' }) => {
    // Count children to set grid columns
    const columns = React.Children.count(children)

    return (
        <div className={`
            grid transition-all duration-300 ease-in-out 
            border-t border-slate-100 dark:border-slate-800 
            bg-slate-50/50 dark:bg-slate-800/30
            ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}
            ${className}
        `}>
            <div
                className="overflow-hidden grid"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
                {children}
            </div>
        </div>
    )
}
