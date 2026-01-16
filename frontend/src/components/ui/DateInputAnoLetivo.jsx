import { forwardRef, useState, useRef, useEffect, useMemo } from 'react'
import { HiCalendar, HiExclamationCircle, HiCheckCircle } from 'react-icons/hi'

/**
 * Formata data de ISO (yyyy-mm-dd) para brasileiro (dd/mm/yyyy)
 */
const formatToBrazilian = (isoDate) => {
    if (!isoDate) return ''
    const [year, month, day] = isoDate.split('-')
    return `${day}/${month}/${year}`
}

/**
 * Formata data de brasileiro (dd/mm/yyyy) para ISO (yyyy-mm-dd)
 */
const formatToISO = (brDate) => {
    if (!brDate || brDate.length !== 10) return ''
    const [day, month, year] = brDate.split('/')
    return `${year}-${month}-${day}`
}

/**
 * Aplica máscara de data brasileira
 */
const applyDateMask = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8)

    if (numbers.length <= 2) {
        return numbers
    }
    if (numbers.length <= 4) {
        return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
    }
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`
}

/**
 * Valida se é uma data válida
 */
const isValidDate = (brDate) => {
    if (!brDate || brDate.length !== 10) return false

    const [day, month, year] = brDate.split('/').map(Number)

    if (day < 1 || day > 31) return false
    if (month < 1 || month > 12) return false
    if (year < 1900 || year > 2100) return false

    const date = new Date(year, month - 1, day)
    return date.getDate() === day &&
        date.getMonth() === month - 1 &&
        date.getFullYear() === year
}

/**
 * DateInput com validação de registro de aula.
 * Recebe lista de datas permitidas pré-calculada pelo backend.
 * 
 * Props:
 * - datasLiberadas: array de strings ISO ['YYYY-MM-DD', ...] - datas liberadas para registro
 * - dataAtual: string ISO da data atual do servidor
 * - mensagemRestricao: mensagem de erro se nenhuma data disponível
 * - onValidationChange: callback (isValid, message) => void
 */
const DateInputAnoLetivo = forwardRef(({
    label,
    error,
    className = '',
    value = '',
    onChange,
    datasLiberadas = [],     // ['2026-01-07', '2026-01-08', ...]
    dataAtual = null,         // '2026-01-07'
    mensagemRestricao = null, // 'Nenhum bimestre liberado...'
    onValidationChange,
    ...props
}, ref) => {
    const [displayValue, setDisplayValue] = useState(() => formatToBrazilian(value))
    const [validationResult, setValidationResult] = useState(null)
    const hiddenInputRef = useRef(null)
    const containerRef = useRef(null)

    // Converte para Set para performance (O(1) lookup)
    const datasLiberadasSet = useMemo(() => new Set(datasLiberadas), [datasLiberadas])

    // Calcula min/max para o date picker nativo
    const { minDate, maxDate } = useMemo(() => {
        if (!datasLiberadas.length) {
            const ano = new Date().getFullYear()
            return { minDate: `${ano}-01-01`, maxDate: `${ano}-12-31` }
        }
        return {
            minDate: datasLiberadas[0],
            maxDate: datasLiberadas[datasLiberadas.length - 1]
        }
    }, [datasLiberadas])

    // Sincroniza valor externo com display
    useEffect(() => {
        setDisplayValue(formatToBrazilian(value))
    }, [value])

    // Valida a data - lógica SIMPLES: está na lista ou não
    const validateDate = (isoDate) => {
        if (!isoDate) {
            setValidationResult(null)
            onValidationChange?.(false, null)
            return
        }

        // Se tem mensagem de restrição geral, mostra ela
        if (mensagemRestricao && !datasLiberadas.length) {
            const result = { liberado: false, mensagem: mensagemRestricao }
            setValidationResult(result)
            onValidationChange?.(false, result.mensagem)
            return
        }

        // Verifica se está na lista de datas liberadas
        if (datasLiberadasSet.has(isoDate)) {
            const result = { liberado: true, mensagem: 'Data liberada para registro' }
            setValidationResult(result)
            onValidationChange?.(true, result.mensagem)
        } else {
            // Tenta dar uma mensagem mais específica
            let msg = 'Data não disponível para registro'

            // Verifica se é fim de semana
            const date = new Date(isoDate + 'T12:00:00')
            const diaSemana = date.getDay()
            if (diaSemana === 0) msg = 'Domingo - não há aula'
            else if (diaSemana === 6) msg = 'Sábado - não há aula'

            const result = { liberado: false, mensagem: msg }
            setValidationResult(result)
            onValidationChange?.(false, result.mensagem)
        }
    }

    // Revalida quando o valor ou datas permitidas mudam
    useEffect(() => {
        if (value) {
            validateDate(value)
        }
    }, [value, datasLiberadasSet]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleTextChange = (e) => {
        const masked = applyDateMask(e.target.value)
        setDisplayValue(masked)

        if (masked.length === 10 && isValidDate(masked)) {
            const isoDate = formatToISO(masked)
            onChange?.({ target: { value: isoDate } })
            validateDate(isoDate)
        } else if (masked.length === 0) {
            onChange?.({ target: { value: '' } })
            setValidationResult(null)
        }
    }

    const handlePickerChange = (e) => {
        const isoDate = e.target.value
        setDisplayValue(formatToBrazilian(isoDate))
        onChange?.({ target: { value: isoDate } })
        validateDate(isoDate)
    }

    const handleCalendarClick = () => {
        hiddenInputRef.current?.showPicker?.()
    }

    const handleBlur = () => {
        if (displayValue && !isValidDate(displayValue)) {
            setDisplayValue(formatToBrazilian(value))
        }
    }

    // Determina estilo baseado na validação
    const getValidationStyle = () => {
        if (!validationResult) return ''
        return validationResult.liberado
            ? 'ring-2 ring-success-500/50 border-success-500'
            : 'ring-2 ring-danger-500/50 border-danger-500'
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
                    placeholder="dd/mm/aaaa"
                    value={displayValue}
                    onChange={handleTextChange}
                    onBlur={handleBlur}
                    className={`input h-12 pr-12 ${error ? 'input-error' : ''} ${getValidationStyle()} ${className}`}
                    maxLength={10}
                    autoComplete="one-time-code"
                    data-lpignore="true"
                    data-form-type="other"
                    {...props}
                />
                <button
                    type="button"
                    onClick={handleCalendarClick}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition-colors"
                >
                    <HiCalendar className="h-5 w-5" />
                </button>

                {/* Input date escondido para usar o picker nativo */}
                <input
                    ref={hiddenInputRef}
                    type="date"
                    value={value}
                    onChange={handlePickerChange}
                    className="date-picker-hidden"
                    tabIndex={-1}
                    autoComplete="off"
                    min={minDate}
                    max={maxDate}
                />
            </div>

            {/* Feedback de validação */}
            {validationResult && (
                <div className={`mt-1 flex items-center gap-1.5 text-sm ${validationResult.liberado
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-danger-600 dark:text-danger-400'
                    }`}>
                    {validationResult.liberado ? (
                        <HiCheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                        <HiExclamationCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{validationResult.mensagem}</span>
                </div>
            )}

            {error && (
                <p className="mt-1 text-sm text-danger-500">{error}</p>
            )}
        </div>
    )
})

DateInputAnoLetivo.displayName = 'DateInputAnoLetivo'

export default DateInputAnoLetivo
