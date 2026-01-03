import { useState, useRef, useEffect, useCallback } from 'react'
import { HiX, HiCheck, HiChevronDown } from 'react-icons/hi'
import Loading from './Loading' // Fix: Default export

// Hook de Debounce simples
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export default function MultiCombobox({
    label,
    value = [], // Array of selected values (IDs)
    onChange,   // (newValue) => void
    onEnter,    // () => void
    options = [], // { value, label, subLabel } (opções iniciais ou pré-carregadas)
    onSearch,   // (query) => Promise<options[]> (Função Opcional para busca async)
    placeholder = 'Selecione...',
    error,
    loading: externalLoading = false,
    disabled = false
}) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [internalOptions, setInternalOptions] = useState(options)
    const [isSearching, setIsSearching] = useState(false)

    const wrapperRef = useRef(null)
    const inputRef = useRef(null)

    // Sincroniza options externas para o modo async (reset quando query vazia)
    useEffect(() => {
        if (onSearch && query === '' && options.length > 0) {
            setInternalOptions(options)
        }
    }, [options, onSearch, query])

    // Debounced Search
    const debouncedQuery = useDebounce(query, 500)

    useEffect(() => {
        if (!onSearch) return

        let isActive = true

        const doSearch = async () => {
            // Se query vazia, não busca (ou busca default se quiser)
            if (!debouncedQuery) {
                setInternalOptions(options) // Volta para iniciais
                return
            }

            setIsSearching(true)
            try {
                const results = await onSearch(debouncedQuery)
                if (isActive) {
                    setInternalOptions(results || [])
                }
            } catch (err) {
                console.error("Erro no autocomplete:", err)
            } finally {
                if (isActive) setIsSearching(false)
            }
        }

        doSearch()

        return () => { isActive = false }
    }, [debouncedQuery, onSearch, options])


    // Fecha ao clicar fora
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Filtragem Local (apenas se NÃO tiver onSearch)
    // Se tiver onSearch, usamos internalOptions (resultados do servidor)
    // Se NÃO tiver, usamos options (props) diretamente filtrados
    const filteredOptions = onSearch
        ? internalOptions // Se é async, o servidor já filtrou
        : (query === ''
            ? options
            : options.filter((opt) => {
                const normalize = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                const search = normalize(query)
                const labelNorm = normalize(opt.label)
                const subLabelNorm = normalize(opt.subLabel)
                return labelNorm.includes(search) || subLabelNorm.includes(search)
            })
        )

    const selectedOptionsLabels = (onSearch ?
        // No modo async, tentamos achar user nas options atuais OU nas props options (cache inicial)
        [...internalOptions, ...options].filter(o => value.includes(o.value))
            // Remove duplicatas de display
            .filter((v, i, a) => a.findIndex(t => (t.value === v.value)) === i)
        : options.filter(opt => value.includes(opt.value))
    )

    // Fallback: Se o valor está selecionado mas não temos o label (pq não veio na busca), 
    // idealmente o pai deveria passar em 'options' os itens selecionados inicialmente.
    // Aqui tentamos mostrar o ID ou algo genérico se faltar, mas o ideal é o pai gerenciar.

    const toggleOption = (optionValue) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue]
        onChange(newValue)

        // Limpa a query sempre para evitar que o texto persista
        setQuery('')
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
                    {/* Renderiza os itens selecionados que conseguimos identificar */}
                    {selectedOptionsLabels.map(opt => (
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
                        className="flex-1 bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 min-w-[120px] disabled:cursor-not-allowed"
                        placeholder={selectedOptionsLabels.length === 0 ? placeholder : ''}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setIsOpen(true)
                        }}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                // Se está buscando/filtrando e tem opções -> Seleciona a primeira
                                if (query && filteredOptions.length > 0) {
                                    e.preventDefault()
                                    toggleOption(filteredOptions[0].value)
                                }
                                // Se não está buscando (ou não achou nada), tenta executar a ação do pai (ex: Enturmar)
                                else if (onEnter) {
                                    e.preventDefault()
                                    onEnter()
                                }
                            }
                        }}
                        disabled={disabled}
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
                    {externalLoading || isSearching ? (
                        <div className="p-3 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                            Buscando...
                        </div>
                    ) : filteredOptions.length === 0 ? (
                        <div className="p-3 text-center text-slate-500 text-sm">
                            {query ? `Nenhuma opção encontrada para "${query}"` : 'Digite para buscar...'}
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
