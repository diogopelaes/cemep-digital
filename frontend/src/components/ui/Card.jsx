export default function Card({
  children,
  className = '',
  hover = false,
  padding = true,
  ...props
}) {
  return (
    <div
      className={`
        glass rounded-2xl 
        ${padding ? 'p-6' : ''} 
        ${hover ? 'transition-all duration-300 hover:shadow-premium hover:scale-[1.02]' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-xl font-semibold text-slate-800 dark:text-white ${className}`}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-slate-500 dark:text-slate-400 ${className}`}>
      {children}
    </p>
  )
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  )
}
