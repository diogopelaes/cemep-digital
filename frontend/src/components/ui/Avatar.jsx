/**
 * Componente Avatar - Exibe inicial do nome em círculo colorido
 * 
 * Props:
 * - name: Nome do usuário (para extrair a inicial)
 * - alt: Texto alternativo (fallback para extrair inicial)
 * - size: 'sm' (32px) | 'md' (40px) | 'lg' (48px) | 'xl' (64px)
 * - onClick: Callback de clique (opcional)
 * - className: Classes adicionais (opcional)
 */
export default function Avatar({
    name,
    alt = '',
    size = 'md',
    onClick,
    className = ''
}) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    }

    const textSizes = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-2xl'
    }

    // Pega a primeira letra do nome ou do alt
    const displayName = name || alt || ''
    const initial = displayName.charAt(0).toUpperCase() || '?'

    const baseClasses = `
        ${sizeClasses[size]} 
        rounded-full 
        overflow-hidden 
        flex-shrink-0
        ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
        ${className}
    `.trim().replace(/\s+/g, ' ')

    const Wrapper = onClick ? 'button' : 'div'

    return (
        <Wrapper
            className={baseClasses}
            onClick={onClick}
            type={onClick ? 'button' : undefined}
        >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center">
                <span className={`text-white font-bold ${textSizes[size]}`}>
                    {initial}
                </span>
            </div>
        </Wrapper>
    )
}
