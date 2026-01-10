import { useState, useRef, useEffect } from 'react'
import { HiChevronDown, HiX } from 'react-icons/hi'

/**
 * MiniCombobox - Versão compacta do Combobox para uso em células de tabela
 * 
 * Features:
 * - Autocomplete com filtro local
 * - Tamanho reduzido para caber em células de grade
 * - Dropdown com posicionamento automático
 */
export default function MiniCombobox({
    value = '',
    onChange,
    options = [], // { value, label, subLabel? }
    placeholder = 'Selecione',
    disabled = false,
    className = '',
}) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef(null)
    const inputRef = useRef(null)
    const dropdownRef = useRef(null)

    // Fecha ao clicar fora
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
                setQuery('')
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Posicionamento do dropdown (evita sair da tela)
    useEffect(() => {
        if (isOpen && dropdownRef.current && wrapperRef.current) {
            const wrapper = wrapperRef.current.getBoundingClientRect()
            const dropdown = dropdownRef.current
            const viewportHeight = window.innerHeight

            // Se não couber embaixo, abre para cima
            if (wrapper.bottom + 200 > viewportHeight) {
                dropdown.style.bottom = '100%'
                dropdown.style.top = 'auto'
                dropdown.style.marginBottom = '4px'
            } else {
                dropdown.style.top = '100%'
                dropdown.style.bottom = 'auto'
                dropdown.style.marginTop = '4px'
            }
        }
    }, [isOpen])

    // Filtra opções
    const filteredOptions = query === ''
        ? options
        : options.filter((opt) => {
            const search = query.toLowerCase()
            const label = (opt.label || '').toLowerCase()
            const subLabel = (opt.subLabel || '').toLowerCase()
            return label.includes(search) || subLabel.includes(search)
        })

    const selectedOption = options.find(opt => String(opt.value) === String(value))

    const selectOption = (optionValue) => {
        onChange(optionValue)
        setQuery('')
        setIsOpen(false)
    }

    const clearSelection = (e) => {
        e.stopPropagation()
        onChange('')
        setQuery('')
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && filteredOptions.length > 0) {
            e.preventDefault()
            selectOption(filteredOptions[0].value)
        } else if (e.key === 'Escape') {
            setIsOpen(false)
            setQuery('')
        }
    }

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div
                className={`
                    flex items-center gap-1 px-2 h-8 text-sm rounded-lg border 
                    bg-white dark:bg-slate-800 
                    border-slate-200 dark:border-slate-600
                    ${isOpen ? 'ring-2 ring-primary-500/30 border-primary-500' : ''}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-500'}
                    transition-colors
                `}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(true)
                        setTimeout(() => inputRef.current?.focus(), 0)
                    }
                }}
            >
                {/* Input ou valor selecionado */}
                {isOpen ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={selectedOption?.label || placeholder}
                        className="flex-1 w-0 h-full bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 text-sm leading-none"
                        disabled={disabled}
                    />
                ) : (
                    <span className={`flex-1 truncate text-sm leading-none ${selectedOption ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>
                        {selectedOption ? (
                            selectedOption.subLabel
                                ? <><span className="font-semibold">{selectedOption.subLabel}</span> {selectedOption.label}</>
                                : selectedOption.label
                        ) : placeholder}
                    </span>
                )}

                {/* Botões */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                    {selectedOption && !disabled && (
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
                        >
                            <HiX className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <HiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && !disabled && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-auto animate-fade-in"
                    style={{ minWidth: '160px' }}
                >
                    {filteredOptions.length === 0 ? (
                        <div className="p-2 text-center text-slate-400 text-xs">
                            {query ? 'Não encontrado' : 'Sem opções'}
                        </div>
                    ) : (
                        <ul className="py-1">
                            {filteredOptions.map((opt) => {
                                const isSelected = String(opt.value) === String(value)
                                return (
                                    <li
                                        key={opt.value}
                                        onClick={() => selectOption(opt.value)}
                                        className={`
                                            px-2 py-1.5 cursor-pointer text-sm transition-colors
                                            ${isSelected
                                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }
                                        `}
                                    >
                                        {opt.subLabel ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                                    {opt.subLabel}
                                                </span>
                                                <span className="truncate">{opt.label}</span>
                                            </div>
                                        ) : (
                                            <span className="truncate">{opt.label}</span>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}
