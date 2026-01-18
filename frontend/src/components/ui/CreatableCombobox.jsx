import { useState, useRef } from 'react'
import { HiX, HiSelector } from 'react-icons/hi'

/**
 * Combobox com suporte a criação de novos valores.
 * Se o usuário digitar algo que não existe nas opções, permite usar como novo valor.
 */
export default function CreatableCombobox({
    label,
    value = '',
    onChange,
    options = [], // { value, label }
    placeholder = 'Digite para buscar...',
    error,
    loading = false,
    required = false,
    disabled = false,
    allowCreate = true,
    createLabel = 'Criar:',
    onKeyDown,
}) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef(null)
    const inputRef = useRef(null)

    // Fecha dropdown ao clicar fora
    const handleClickOutside = (e) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
            setIsOpen(false)
        }
    }

    // Adiciona/remove listener
    useState(() => {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Filtra opções (case insensitive)
    const normalizedQuery = query.toLowerCase().trim()
    const filteredOptions = normalizedQuery === ''
        ? options
        : options.filter(opt =>
            opt.label.toLowerCase().includes(normalizedQuery)
        )

    // Verifica se existe match exato (case insensitive)
    const exactMatch = options.some(
        opt => opt.label.toLowerCase() === normalizedQuery
    )

    // Opção selecionada atual
    const selectedOption = options.find(opt => opt.value === value || opt.label === value)
    const displayValue = selectedOption?.label || value || ''

    const selectOption = (optionValue) => {
        onChange(optionValue)
        setQuery('')
        setIsOpen(false)
    }

    const handleCreateNew = () => {
        onChange(query.trim())
        setQuery('')
        setIsOpen(false)
    }

    const clearSelection = (e) => {
        e.stopPropagation()
        onChange('')
        setQuery('')
        inputRef.current?.focus()
    }

    const handleInputChange = (e) => {
        const newQuery = e.target.value
        setQuery(newQuery)
        setIsOpen(true)
        // Se o usuário apagar tudo, limpa a seleção
        if (newQuery === '') {
            onChange('')
        }
    }

    const handleFocus = () => {
        if (!disabled) {
            setIsOpen(true)
            // Se tem valor selecionado, coloca no query para edição
            if (displayValue && !query) {
                setQuery(displayValue)
            }
        }
    }

    const handleBlur = () => {
        // Delay para permitir clique nas opções
        setTimeout(() => {
            if (!isOpen) return
            // Se tem query mas não selecionou, usa o query como valor (se allowCreate)
            if (query.trim() && allowCreate && !exactMatch) {
                onChange(query.trim())
            }
            setIsOpen(false)
        }, 200)
    }

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            // Se tem query, confirma o valor antes de propagar
            if (query.trim()) {
                if (allowCreate && !exactMatch) {
                    onChange(query.trim())
                } else if (filteredOptions.length > 0) {
                    // Seleciona a primeira opção filtrada
                    onChange(filteredOptions[0].label)
                }
                setQuery('')
                setIsOpen(false)
            }
            // Propaga para o pai poder executar ação (ex: inserir)
            onKeyDown?.(e)
        } else {
            // Para outras teclas, só propaga
            onKeyDown?.(e)
        }
    }

    return (
        <div className="w-full relative" ref={wrapperRef}>
            {label && (
                <label className="label">
                    {label}{required && ' *'}
                </label>
            )}

            <div
                className={`bg-white dark:bg-slate-800 border rounded-xl w-full min-h-[42px] relative transition-colors
                    ${error ? 'border-danger-500' : 'border-slate-300 dark:border-slate-600 focus-within:border-brand-500'}
                    ${isOpen ? 'ring-2 ring-brand-500/20 border-brand-500' : ''}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <div className="flex items-center p-2 pr-16">
                    <input
                        ref={inputRef}
                        type="text"
                        className={`flex-1 bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 ${disabled ? 'cursor-not-allowed' : ''}`}
                        placeholder={placeholder}
                        value={isOpen ? query : displayValue}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onKeyDown={handleInputKeyDown}
                        disabled={disabled}
                        autoComplete="off"
                    />
                </div>

                <div className="absolute right-3 top-3 flex items-center gap-1">
                    {displayValue && !disabled && (
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
                        >
                            <HiX className="w-4 h-4" />
                        </button>
                    )}
                    <HiSelector className={`w-5 h-5 text-slate-400`} />
                </div>
            </div>

            {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}

            {/* Dropdown */}
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-auto animate-fade-in">
                    {loading ? (
                        <div className="p-3 text-center text-slate-500 text-sm">Carregando...</div>
                    ) : (
                        <>
                            {filteredOptions.length > 0 && (
                                <ul className="py-1">
                                    {filteredOptions.map((opt) => {
                                        const isSelected = opt.value === value || opt.label === value
                                        return (
                                            <li
                                                key={opt.value}
                                                onMouseDown={() => selectOption(opt.label)}
                                                className={`
                                                    px-3 py-2 cursor-pointer text-sm transition-colors
                                                    ${isSelected
                                                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}
                                                `}
                                            >
                                                {opt.label}
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}

                            {/* Opção de criar novo */}
                            {allowCreate && query.trim() && !exactMatch && (
                                <div
                                    onMouseDown={handleCreateNew}
                                    className="px-3 py-2 cursor-pointer text-sm border-t border-slate-100 dark:border-slate-700 
                                               text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 
                                               flex items-center gap-2"
                                >
                                    <span className="text-slate-400">{createLabel}</span>
                                    <span className="font-medium">"{query.trim()}"</span>
                                </div>
                            )}

                            {filteredOptions.length === 0 && (!allowCreate || !query.trim()) && (
                                <div className="p-3 text-center text-slate-500 text-sm">
                                    Nenhuma opção encontrada
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
