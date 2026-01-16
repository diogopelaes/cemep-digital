import { useState, useEffect, forwardRef } from 'react'

/**
 * InputValor - Componente especializado para entrada de valores decimais (Peso/Valor).
 * Similar ao InputNota, mas com estilo padrão de formulário (alinhamento à esquerda).
 */
const InputValor = forwardRef(({
    label,
    value = '',
    onChange,
    maxValor = 10,
    casasDecimais = 1,
    error,
    disabled = false,
    className = '',
    placeholder = '—',
    ...props
}, ref) => {
    const [displayValue, setDisplayValue] = useState('')

    useEffect(() => {
        if (value === null || value === undefined || value === '') {
            if (displayValue !== '') setDisplayValue('')
        } else {
            const externalFormatted = String(value).replace('.', ',')
            if (externalFormatted !== displayValue) {
                const valFloatExternal = parseFloat(externalFormatted.replace(',', '.'))
                const valFloatInternal = parseFloat(displayValue.replace(',', '.'))

                if (isNaN(valFloatInternal) || valFloatExternal !== valFloatInternal) {
                    if (!isNaN(valFloatExternal)) {
                        // Se for peso (geralmente 1 casa) ou valor (2 casas)
                        setDisplayValue(valFloatExternal.toFixed(casasDecimais).replace('.', ','))
                    } else {
                        setDisplayValue(externalFormatted)
                    }
                }
            }
        }
    }, [value, casasDecimais])

    const handleChange = (e) => {
        let val = e.target.value.replace('.', ',')
        if (/[^0-9,]/.test(val)) return
        if ((val.match(/,/g) || []).length > 1) return

        if (val.includes(',')) {
            const parts = val.split(',')
            if (parts[1].length > casasDecimais) return
        }

        if (val !== '' && val !== ',') {
            const numVal = parseFloat(val.replace(',', '.'))
            if (!isNaN(numVal) && numVal > maxValor) return
        }

        setDisplayValue(val)
        if (onChange) onChange(val)
    }

    const handleBlur = () => {
        if (!displayValue || displayValue === '' || displayValue === ',') {
            if (onChange) onChange('')
            setDisplayValue('')
            return
        }

        let valFloat = parseFloat(displayValue.replace(',', '.'))
        if (isNaN(valFloat)) {
            if (onChange) onChange('')
            setDisplayValue('')
            return
        }

        const finalValue = valFloat.toFixed(casasDecimais).replace('.', ',')
        setDisplayValue(finalValue)
        if (onChange) onChange(finalValue)
    }

    return (
        <div className="w-full">
            {label && (
                <label className="label">{label}</label>
            )}
            <input
                ref={ref}
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={disabled}
                placeholder={placeholder}
                className={`input h-12 ${error ? 'input-error' : ''} ${className}`}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-danger-500">{error}</p>
            )}
        </div>
    )
})

InputValor.displayName = 'InputValor'

export default InputValor
