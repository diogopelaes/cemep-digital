import { useState, useEffect, forwardRef } from 'react'

/**
 * InputNota - Componente especializado para entrada de notas decimais.
 * Segue rigorosamente o padrão de design do sistema utilizando a classe '.input'
 * definida no index.css, garantindo consistência visual com os demais inputs.
 * 
 * Features:
 * - Máscara decimal (conversão automática de . para ,)
 * - Validação de valor máximo
 * - Limitação de casas decimais
 * - Estilo consistente com o design system (glassmorphism/premium)
 */
const InputNota = forwardRef(({
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
    // Estado interno para gerenciar a string digitada (permite "," intermediária)
    const [displayValue, setDisplayValue] = useState('')

    // Sincroniza valor externo com interno ao carregar ou mudar externamente
    useEffect(() => {
        if (value === null || value === undefined || value === '') {
            if (displayValue !== '') setDisplayValue('')
        } else {
            const externalFormatted = String(value).replace('.', ',')

            // Se o valor externo mudou e é diferente do que estamos exibindo
            if (externalFormatted !== displayValue) {
                const valFloatExternal = parseFloat(externalFormatted.replace(',', '.'))
                const valFloatInternal = parseFloat(displayValue.replace(',', '.'))

                // Só atualiza forçadamente se o valor numérico mudou (mudança externa/API)
                // ou se o campo ainda não tinha um número válido (carregamento inicial)
                if (isNaN(valFloatInternal) || valFloatExternal !== valFloatInternal) {
                    if (!isNaN(valFloatExternal)) {
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

        // Bloqueia caracteres não numéricos exceto vírgula
        if (/[^0-9,]/.test(val)) return

        // Só permite uma vírgula
        if ((val.match(/,/g) || []).length > 1) return

        // Limita casas decimais
        if (val.includes(',')) {
            const parts = val.split(',')
            if (parts[1].length > casasDecimais) return
        }

        // Valida valor máximo em tempo real (apenas se for um número válido)
        if (val !== '' && val !== ',') {
            const numVal = parseFloat(val.replace(',', '.'))
            if (!isNaN(numVal) && numVal > maxValor) return
        }

        setDisplayValue(val)

        // Notifica o pai se for um valor passível de ser salvo
        if (onChange) {
            onChange(val)
        }
    }

    const handleBlur = () => {
        if (!displayValue || displayValue === '' || displayValue === ',') {
            if (onChange) onChange(null)
            setDisplayValue('')
            return
        }

        let valFloat = parseFloat(displayValue.replace(',', '.'))
        if (isNaN(valFloat)) {
            if (onChange) onChange(null)
            setDisplayValue('')
            return
        }

        // Formata com o número exato de casas decimais
        const finalValue = valFloat.toFixed(casasDecimais).replace('.', ',')
        setDisplayValue(finalValue)
        if (onChange) onChange(finalValue)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            const form = e.target.form
            if (!form) return

            const index = Array.prototype.indexOf.call(form, e.target)
            if (index > -1 && index < form.elements.length - 1) {
                // Tenta encontrar o próximo elemento que não seja hidden e não esteja desabilitado
                for (let i = index + 1; i < form.elements.length; i++) {
                    const next = form.elements[i]
                    if (next.tagName === 'INPUT' && next.type !== 'hidden' && !next.disabled) {
                        next.focus()
                        next.select?.()
                        break
                    }
                }
            }
        }
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
                onKeyDown={handleKeyDown}
                onClick={(e) => e.target.select()}
                disabled={disabled}
                placeholder={placeholder}
                className={`
                    input text-center font-bold text-lg
                    ${error ? 'input-error' : ''}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${className}
                `}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-danger-500 text-center font-medium">{error}</p>
            )}
        </div>
    )
})

InputNota.displayName = 'InputNota'

export default InputNota
