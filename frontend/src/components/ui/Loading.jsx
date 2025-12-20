export default function Loading({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizes[size]} animate-spin rounded-full border-4 border-primary-200 border-t-primary-500`}></div>
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loading size="lg" className="mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Carregando...</p>
      </div>
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return (
    <div className={`skeleton rounded ${className}`}></div>
  )
}

