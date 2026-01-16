import { forwardRef } from 'react'

const Input = forwardRef(({
  label,
  error,
  className = '',
  icon: Icon,
  rightElement,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="label">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-slate-400" />
          </div>
        )}
        <input
          ref={ref}
          className={`input h-12 ${Icon ? 'pl-12' : ''} ${rightElement ? 'pr-12' : ''} ${error ? 'input-error' : ''} ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-danger-500">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input

