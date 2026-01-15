const variants = {
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  outline: 'badge border border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-400',
  default: 'badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
}

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

