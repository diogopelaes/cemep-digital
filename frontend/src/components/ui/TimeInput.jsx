import { forwardRef, useState, useRef, useEffect } from 'react'
import { HiClock } from 'react-icons/hi'

/**
 * Aplica máscara de hora (HH:MM)
 */
const applyTimeMask = (value) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '').slice(0, 4)

    if (numbers.length <= 2) {
        return numbers
    }
    return `${numbers.slice(0, 2)}:${numbers.slice(2)}`
}

/**
 * Valida se é uma hora válida
 */
const isValidTime = (timeStr) => {
    if (!timeStr || timeStr.length !== 5) return false

    const [hours, minutes] = timeStr.split(':').map(Number)

    if (isNaN(hours) || isNaN(minutes)) return false
    if (hours < 0 || hours > 23) return false
    if (minutes < 0 || minutes > 59) return false

    return true
}

const TimeInput = forwardRef(({
    label,
    error,
    className = '',
    value = '', // Valor em formato HH:MM
    onChange,
    ...props
}, ref) => {
    const [displayValue, setDisplayValue] = useState(value)
    const hiddenInputRef = useRef(null)
    const containerRef = useRef(null)

    // Sincroniza valor externo com display
    useEffect(() => {
        setDisplayValue(value || '')
    }, [value])

    const handleTextChange = (e) => {
        const masked = applyTimeMask(e.target.value)
        setDisplayValue(masked)

        // Se estiver completo e válido, ou vazio, propaga a mudança
        if ((masked.length === 5 && isValidTime(masked)) || masked.length === 0) {
            onChange?.({ target: { value: masked } })
        }
    }

    const handlePickerChange = (e) => {
        const time = e.target.value // Formato HH:MM
        setDisplayValue(time)
        onChange?.({ target: { value: time } })

        // Foca de volta no input visível após seleção (opcional)
        // containerRef.current?.querySelector('input[type="text"]')?.focus()
    }

    const handleClockClick = () => {
        hiddenInputRef.current?.showPicker?.()
    }

    const handleBlur = () => {
        // Se a hora não for válida, reseta para o valor anterior válido (value prop)
        if (displayValue && !isValidTime(displayValue) && displayValue.length > 0) {
            setDisplayValue(value)
        }
    }

    return (
        <div className="w-full" ref={containerRef}>
            {label && (
                <label className="label">{label}</label>
            )}
            <div className="relative">
                <input
                    ref={ref}
                    type="text"
                    inputMode="numeric"
                    placeholder="00:00"
                    value={displayValue}
                    onChange={handleTextChange}
                    onBlur={handleBlur}
                    className={`input pr-12 ${error ? 'input-error' : ''} ${className}`}
                    maxLength={5}
                    autoComplete="off"
                    data-lpignore="true"
                    {...props}
                />
                <button
                    type="button"
                    onClick={handleClockClick}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition-colors"
                >
                    <HiClock className="h-5 w-5" />
                </button>

                {/* Input time escondido para usar o picker nativo */}
                <input
                    ref={hiddenInputRef}
                    type="time"
                    value={value}
                    onChange={handlePickerChange}
                    className="date-picker-hidden opacity-0 absolute pointer-events-none -z-10" // Estilo similar ao DateInput (usando classe CSS se existir, ou inline)
                    style={{ width: 0, height: 0, border: 0, padding: 0, margin: 0 }} // Fallback inline styles
                    tabIndex={-1}
                    autoComplete="off"
                />
            </div>
            {error && (
                <p className="mt-1 text-sm text-danger-500">{error}</p>
            )}
        </div>
    )
})

TimeInput.displayName = 'TimeInput'

export default TimeInput
