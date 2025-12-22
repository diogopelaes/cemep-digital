import { useState, useRef, useEffect } from 'react'
import { HiX, HiCheck, HiChevronDown } from 'react-icons/hi'

export default function MultiCombobox({
    label,
    value = [], // Array of selected values (IDs)
    onChange,   // (newValue) => void
    options = [], // { value, label, subLabel }
    placeholder = 'Selecione...',
    error,
    loading = false
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

    const selectedOptions = options.filter(opt => value.includes(opt.value))

    const toggleOption = (optionValue) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue]
        onChange(newValue)
        setQuery('') // Clear input after selection
        inputRef.current?.focus()
    }

    const removeOption = (optionValue, e) => {
        e.stopPropagation()
        onChange(value.filter(v => v !== optionValue))
    }

    return (
        <div className="w-full relative" ref={wrapperRef}>
            {label && <label className="label">{label}</label>}

            <div
                className={`bg-white dark:bg-slate-800 border rounded-xl w-full min-h-[42px] relative transition-colors
          ${error ? 'border-danger-500' : 'border-slate-300 dark:border-slate-600 focus-within:border-brand-500'}
          ${isOpen ? 'ring-2 ring-brand-500/20 border-brand-500' : ''}
        `}
                onClick={() => {
                    setIsOpen(true)
                    inputRef.current?.focus()
                }}
            >
                <div className="flex flex-wrap gap-2 p-2 pr-8">
                    {selectedOptions.map(opt => (
                        <span
                            key={opt.value}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 animate-fade-in"
                        >
                            {opt.subLabel ? (
                                <span>
                                    <span className="font-bold">{opt.subLabel}</span> - {opt.label}
                                </span>
                            ) : (
                                opt.label
                            )}
                            <button
                                type="button"
                                onClick={(e) => removeOption(opt.value, e)}
                                className="hover:bg-brand-200 dark:hover:bg-brand-500/30 rounded-full p-0.5 transition-colors"
                            >
                                <HiX className="w-3 h-3" />
                            </button>
                        </span>
                    ))}

                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 min-w-[120px]"
                        placeholder={selectedOptions.length === 0 ? placeholder : ''}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setIsOpen(true)
                        }}
                        onFocus={() => setIsOpen(true)}
                    />
                </div>

                <div className="absolute right-3 top-3 text-slate-400">
                    <HiChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-auto animate-fade-in">
                    {loading ? (
                        <div className="p-3 text-center text-slate-500 text-sm">Carregando...</div>
                    ) : filteredOptions.length === 0 ? (
                        <div className="p-3 text-center text-slate-500 text-sm">
                            Nenhuma opção encontrada para "{query}"
                        </div>
                    ) : (
                        <ul className="py-1">
                            {filteredOptions.map((opt) => {
                                const isSelected = value.includes(opt.value)
                                return (
                                    <li
                                        key={opt.value}
                                        onClick={() => toggleOption(opt.value)}
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
