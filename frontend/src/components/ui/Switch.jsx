import React from 'react'

const Switch = React.forwardRef(({
    checked,
    onChange,
    labelTrue = "Sim",
    labelFalse = "Não",
    disabled,
    className,
    ...props
}, ref) => {

    const handleChange = (newValue) => {
        if (disabled) return
        if (onChange) {
            // Emulate standard checkbox event for compatibility
            onChange({ target: { checked: newValue } })
        }
    }

    return (
        <div className={`
            inline-flex p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
            ${disabled ? 'opacity-60 cursor-not-allowed' : ''} 
            ${className || ''}
        `}>
            {/* True / Sim Option */}
            <button
                type="button"
                onClick={() => handleChange(true)}
                disabled={disabled}
                className={`
                    px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex-1 text-center min-w-[3rem]
                    ${checked
                        ? 'bg-white dark:bg-slate-700 text-success-600 dark:text-success-500 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }
                `}
            >
                {labelTrue}
            </button>

            {/* False / Não Option */}
            <button
                type="button"
                onClick={() => handleChange(false)}
                disabled={disabled}
                className={`
                    px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex-1 text-center min-w-[3rem]
                    ${!checked
                        ? 'bg-white dark:bg-slate-700 text-danger-600 dark:text-danger-500 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }
                `}
            >
                {labelFalse}
            </button>
        </div>
    )
})

Switch.displayName = 'Switch'

export default Switch
