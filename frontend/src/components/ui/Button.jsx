import { forwardRef } from 'react'

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  accent: 'btn-accent',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3',
  lg: 'px-8 py-4 text-lg',
}

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  type = 'button',
  responsive = false,
  ...props
}, ref) => {
  const baseClasses = variants[variant] || variants.primary
  const baseSizeClasses = sizes[size] || sizes.md

  // Padding reduzido no mobile quando é responsivo com ícone
  const sizeClasses = (responsive && Icon) ? `p-3 sm:${baseSizeClasses}` : baseSizeClasses

  return (
    <button
      ref={ref}
      type={type}
      className={`${baseClasses} ${sizeClasses} ${className} inline-flex items-center justify-center gap-2`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="h-5 w-5" />}
          {responsive ? (
            <span className="hidden sm:inline">{children}</span>
          ) : (
            children
          )}
          {Icon && iconPosition === 'right' && <Icon className="h-5 w-5" />}
        </>
      )}
    </button>
  )
})

Button.displayName = 'Button'

export default Button

