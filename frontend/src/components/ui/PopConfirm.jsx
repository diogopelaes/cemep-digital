import { useState, useRef, useEffect } from 'react'
import { HiCheck, HiX } from 'react-icons/hi'

export default function PopConfirm({
    children,
    title = 'Confirma?',
    onConfirm,
    okVariant = 'danger',
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    const handleConfirm = (e) => {
        e.stopPropagation()
        onConfirm?.()
        setIsOpen(false)
    }

    const handleTriggerClick = (e) => {
        e.stopPropagation()
        if (!disabled) {
            setIsOpen(!isOpen)
        }
    }

    const handleCancel = (e) => {
        e.stopPropagation()
        setIsOpen(false)
    }

    return (
        <div className="relative inline-block text-left" ref={wrapperRef}>
            <div onClick={handleTriggerClick} className="cursor-pointer inline-flex">
                {children}
            </div>

            {isOpen && (
                <div
                    className="absolute z-50 mt-1 rounded-lg bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-2 right-0 animate-fade-in origin-top-right flex items-center gap-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 pl-1">
                        {title}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleCancel}
                            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                            title="Cancelar"
                        >
                            <HiX className="h-4 w-4" />
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`p-1 rounded-md hover:bg-${okVariant === 'danger' ? 'red' : 'green'}-50 dark:hover:bg-${okVariant === 'danger' ? 'red' : 'green'}-900/20 text-${okVariant === 'danger' ? 'red' : 'green'}-600 transition-colors`}
                            title="Confirmar"
                        >
                            <HiCheck className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
