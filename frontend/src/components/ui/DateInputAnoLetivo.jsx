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
 * DateInput com validação de registro de aula baseado no ano letivo.
 * Valida localmente usando as restrições passadas via props.
 * 
 * Props:
 * - restricoesData: objeto retornado pelo backend com { ano, bimestres, hoje_liberados, data_atual }
 * - onValidationChange: callback (isValid, message, bimestre) => void
 */
const DateInputAnoLetivo = forwardRef(({
    label,
    error,
    className = '',
    value = '',
    onChange,
    restricoesData = null, // { ano, bimestres, hoje_liberados, data_atual }
    onValidationChange,
    ...props
}, ref) => {
    const [displayValue, setDisplayValue] = useState(() => formatToBrazilian(value))
    const [validationResult, setValidationResult] = useState(null)
    const hiddenInputRef = useRef(null)
    const containerRef = useRef(null)

    // Sincroniza valor externo com display
    useEffect(() => {
        setDisplayValue(formatToBrazilian(value))
    }, [value])

    // Calcula min/max baseado nos bimestres liberados
    const { minDate, maxDate } = useMemo(() => {
        if (!restricoesData?.bimestres?.length) {
            // Fallback: ano inteiro
            const ano = restricoesData?.ano || new Date().getFullYear()
            return { minDate: `${ano}-01-01`, maxDate: `${ano}-12-31` }
        }

        // Encontra o menor início e maior fim entre bimestres liberados
        const bimestresLiberados = restricoesData.bimestres.filter(b => b.liberado_hoje)

        if (bimestresLiberados.length === 0) {
            // Nenhum bimestre liberado, usa ano inteiro mas vai mostrar erro
            const ano = restricoesData.ano
            return { minDate: `${ano}-01-01`, maxDate: `${ano}-12-31` }
        }

        let min = null
        let max = null

        bimestresLiberados.forEach(bim => {
            if (bim.aula_inicio && (!min || bim.aula_inicio < min)) {
                min = bim.aula_inicio
            }
            if (bim.aula_fim && (!max || bim.aula_fim > max)) {
                max = bim.aula_fim
            }
        })

        return { minDate: min, maxDate: max }
    }, [restricoesData])

    // Valida a data localmente
    const validateDate = (isoDate) => {
        if (!isoDate || !restricoesData) {
            setValidationResult(null)
            onValidationChange?.(false, null, null)
            return
        }

        const dataRegistro = new Date(isoDate)
        const ano = dataRegistro.getFullYear()

        // Verifica se é do ano letivo
        if (ano !== restricoesData.ano) {
            const result = {
                liberado: false,
                bimestre: null,
                mensagem: `A data deve ser do ano letivo ${restricoesData.ano}.`
            }
            setValidationResult(result)
            onValidationChange?.(false, result.mensagem, null)
            return
        }

        // Encontra o bimestre da data
        const bimestreInfo = restricoesData.bimestres.find(bim => {
            if (!bim.aula_inicio || !bim.aula_fim) return false
            return isoDate >= bim.aula_inicio && isoDate <= bim.aula_fim
        })

        if (!bimestreInfo) {
            const result = {
                liberado: false,
                bimestre: null,
                mensagem: 'A data está fora do período letivo.'
            }
            setValidationResult(result)
            onValidationChange?.(false, result.mensagem, null)
            return
        }

        // Verifica se o bimestre está liberado para registro hoje
        if (!bimestreInfo.liberado_hoje) {
            let msg = `O período de registro do ${bimestreInfo.bimestre}º bimestre`
            if (bimestreInfo.status === 'Aguardando início') {
                msg += ' ainda não iniciou.'
                if (bimestreInfo.registro_inicio) {
                    const dataInicio = new Date(bimestreInfo.registro_inicio)
                    msg += ` Início: ${dataInicio.toLocaleDateString('pt-BR')}.`
                }
            } else if (bimestreInfo.status === 'Encerrado') {
                msg += ' já encerrou.'
                if (bimestreInfo.registro_fim) {
                    const dataFim = new Date(bimestreInfo.registro_fim)
                    msg += ` Encerrou em: ${dataFim.toLocaleDateString('pt-BR')}.`
                }
            } else {
                msg += ' está bloqueado.'
            }

            const result = {
                liberado: false,
                bimestre: bimestreInfo.bimestre,
                mensagem: msg
            }
            setValidationResult(result)
            onValidationChange?.(false, result.mensagem, bimestreInfo.bimestre)
            return
        }

        // Verifica digitacao_futura
        const hoje = restricoesData.data_atual ? new Date(restricoesData.data_atual) : new Date()
        const hojeStr = hoje.toISOString().split('T')[0]

        if (isoDate > hojeStr && !bimestreInfo.digitacao_futura) {
            const result = {
                liberado: false,
                bimestre: bimestreInfo.bimestre,
                mensagem: 'Não é permitido registrar aulas para datas futuras neste bimestre.'
            }
            setValidationResult(result)
            onValidationChange?.(false, result.mensagem, bimestreInfo.bimestre)
            return
        }

        // Liberado!
        const result = {
            liberado: true,
            bimestre: bimestreInfo.bimestre,
            mensagem: `Registro liberado para o ${bimestreInfo.bimestre}º bimestre.`
        }
        setValidationResult(result)
        onValidationChange?.(true, result.mensagem, bimestreInfo.bimestre)
    }

    // Revalida quando o valor ou restrições mudam
    useEffect(() => {
        if (value) {
            validateDate(value)
        }
    }, [value, restricoesData]) // eslint-disable-line react-hooks/exhaustive-deps

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
                    className={`input pr-12 ${error ? 'input-error' : ''} ${getValidationStyle()} ${className}`}
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
