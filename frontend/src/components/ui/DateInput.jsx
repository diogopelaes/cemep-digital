import { forwardRef, useState, useRef, useEffect } from 'react'
import { HiCalendar } from 'react-icons/hi'

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
  // Remove tudo que não é número
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

const DateInput = forwardRef(({
  label,
  error,
  className = '',
  value = '', // Valor em formato ISO (yyyy-mm-dd)
  onChange,
  ...props
}, ref) => {
  const [displayValue, setDisplayValue] = useState(() => formatToBrazilian(value))
  const [showPicker, setShowPicker] = useState(false)
  const hiddenInputRef = useRef(null)
  const containerRef = useRef(null)

  // Sincroniza valor externo com display
  useEffect(() => {
    setDisplayValue(formatToBrazilian(value))
  }, [value])

  const handleTextChange = (e) => {
    const masked = applyDateMask(e.target.value)
    setDisplayValue(masked)

    // Se a data estiver completa e válida, atualiza o valor ISO
    if (masked.length === 10 && isValidDate(masked)) {
      const isoDate = formatToISO(masked)
      onChange?.({ target: { value: isoDate } })
    } else if (masked.length === 0) {
      onChange?.({ target: { value: '' } })
    }
  }

  const handlePickerChange = (e) => {
    const isoDate = e.target.value
    setDisplayValue(formatToBrazilian(isoDate))
    onChange?.({ target: { value: isoDate } })
    setShowPicker(false)
  }

  const handleCalendarClick = () => {
    hiddenInputRef.current?.showPicker?.()
  }

  const handleBlur = () => {
    // Se a data não for válida, limpa o campo
    if (displayValue && !isValidDate(displayValue)) {
      setDisplayValue(formatToBrazilian(value))
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
          placeholder="dd/mm/aaaa"
          value={displayValue}
          onChange={handleTextChange}
          onBlur={handleBlur}
          className={`input pr-12 ${error ? 'input-error' : ''} ${className}`}
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
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-danger-500">{error}</p>
      )}
    </div>
  )
})

DateInput.displayName = 'DateInput'

export default DateInput

