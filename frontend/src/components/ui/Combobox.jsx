import { useState, useRef, useEffect } from 'react'
import { HiX, HiCheck, HiChevronDown } from 'react-icons/hi'

export default function Combobox({
    label,
    value = '', // Single selected value (ID)
    onChange,   // (newValue) => void
    options = [], // { value, label, subLabel }
    placeholder = 'Selecione...',
    error,
    loading = false,
    required = false,
    disabled = false
}) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredOptions = query === ''
        ? options
        : options.filter((opt) => {
            const search = query.toLowerCase()
            return (
                opt.label.toLowerCase().includes(search) ||
                (opt.subLabel && opt.subLabel.toLowerCase().includes(search))
            )
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
        inputRef.current?.focus()
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
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(true)
                        inputRef.current?.focus()
                    }
                }}
            >
                <div className="flex items-center p-2 pr-16">
                    {selectedOption && !isOpen ? (
                        <span className="text-slate-700 dark:text-slate-200 flex-1 truncate">
                            {selectedOption.subLabel ? (
                                <span>
                                    <span className="font-bold">{selectedOption.subLabel}</span> - {selectedOption.label}
                                </span>
                            ) : (
                                selectedOption.label
                            )}
                        </span>
                    ) : (
                        <input
                            ref={inputRef}
                            type="text"
                            className={`flex-1 bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 ${disabled ? 'cursor-not-allowed' : ''}`}
                            placeholder={placeholder}
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value)
                                setIsOpen(true)
                            }}
                            onFocus={() => !disabled && setIsOpen(true)}
                            disabled={disabled}
                        />
                    )}
                </div>

                <div className="absolute right-3 top-3 flex items-center gap-1">
                    {selectedOption && !disabled && (
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
                        >
                            <HiX className="w-4 h-4" />
                        </button>
                    )}
                    <HiChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}

            {/* Dropdown */}
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-auto animate-fade-in">
                    {loading ? (
                        <div className="p-3 text-center text-slate-500 text-sm">Carregando...</div>
                    ) : filteredOptions.length === 0 ? (
                        <div className="p-3 text-center text-slate-500 text-sm">
                            {query ? `Nenhuma opção encontrada para "${query}"` : 'Nenhuma opção disponível'}
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
                      px-3 py-2 cursor-pointer flex items-center justify-between text-sm transition-colors
                      ${isSelected
                                                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}
                    `}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900 dark:text-white">
                                                {opt.subLabel || opt.label}
                                            </span>
                                            {opt.subLabel && (
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {opt.label}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && <HiCheck className="w-4 h-4 text-brand-600" />}
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
