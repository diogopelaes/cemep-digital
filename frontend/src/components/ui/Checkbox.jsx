import React from 'react'

const Checkbox = React.forwardRef(({ label, error, className, ...props }, ref) => {
    return (
        <div className={className}>
            <label className="flex items-center space-x-3 cursor-pointer">
                <input
                    type="checkbox"
                    ref={ref}
                    className="
            form-checkbox h-5 w-5 text-brand-600 rounded border-slate-300 
            focus:ring-brand-500 focus:ring-offset-0 transition duration-150 ease-in-out
            dark:bg-slate-700 dark:border-slate-600 dark:checked:bg-brand-500
          "
                    {...props}
                />
                {label && (
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
                        {label}
                    </span>
                )}
            </label>
            {error && (
                <p className="mt-1 text-sm text-red-500 animate-slide-up">
                    {error}
                </p>
            )}
        </div>
    )
})

Checkbox.displayName = 'Checkbox'

export default Checkbox
