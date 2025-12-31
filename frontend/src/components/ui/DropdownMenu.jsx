import { useState, useRef, useEffect } from 'react'

export function DropdownMenu({ trigger, children, align = 'right' }) {
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative inline-block text-left" ref={wrapperRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen && (
                <div
                    className={`absolute z-50 mt-2 w-56 rounded-xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none animate-fade-in origin-top-right ${align === 'right' ? 'right-0' : 'left-0'}`}
                >
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        <div onClick={() => setIsOpen(false)}>
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export function DropdownItem({ icon: Icon, children, onClick, className = '', disabled = false }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors
                ${disabled
                    ? 'opacity-50 cursor-not-allowed text-slate-400'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                } 
                ${className}`}
            role="menuitem"
        >
            {Icon && <Icon className={`h-4 w-4 ${disabled ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`} />}
            {children}
        </button>
    )
}
