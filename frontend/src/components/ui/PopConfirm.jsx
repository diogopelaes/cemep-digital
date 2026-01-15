import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { HiCheck, HiX } from 'react-icons/hi'

export default function PopConfirm({
    children,
    title = 'Confirma?',
    onConfirm,
    okVariant = 'danger',
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0 })
    const triggerRef = useRef(null)
    const popupRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            // Se o clique foi dentro do popup, ignora (deixa os botões processarem)
            if (popupRef.current && popupRef.current.contains(event.target)) {
                return
            }

            // Se o clique foi fora do trigger e fora do popup, fecha
            if (triggerRef.current && !triggerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }

        // Atualiza posição ao rolar ou redimensionar
        function updatePosition() {
            if (isOpen && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect()
                setCoords({
                    top: rect.bottom + window.scrollY,
                    left: rect.right + window.scrollX
                })
            }
        }

        if (isOpen) {
            updatePosition()
            document.addEventListener('mousedown', handleClickOutside)
            window.addEventListener('scroll', updatePosition, true)
            window.addEventListener('resize', updatePosition)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            window.removeEventListener('scroll', updatePosition, true)
            window.removeEventListener('resize', updatePosition)
        }
    }, [isOpen])

    const handleConfirm = (e) => {
        e.stopPropagation()
        onConfirm?.()
        setIsOpen(false)
    }

    const handleTriggerClick = (e) => {
        e.stopPropagation()
        e.preventDefault() // Importante para não disparar links
        if (!disabled) {
            if (!isOpen && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect()
                setCoords({
                    top: rect.bottom + window.scrollY,
                    left: rect.right + window.scrollX
                })
            }
            setIsOpen(!isOpen)
        }
    }

    const handleCancel = (e) => {
        e.stopPropagation()
        setIsOpen(false)
    }

    return (
        <>
            <div
                ref={triggerRef}
                onClick={handleTriggerClick}
                className="cursor-pointer inline-flex"
            >
                {children}
            </div>

            {isOpen && createPortal(
                <div
                    ref={popupRef}
                    className="absolute z-[9999] mt-1 rounded-lg bg-white dark:bg-slate-800 shadow-xl ring-1 ring-black/5 dark:ring-white/10 p-2 animate-fade-in flex items-center gap-3 whitespace-nowrap"
                    style={{
                        top: coords.top,
                        left: coords.left,
                        transform: 'translateX(-100%)' // Alinha a direita do popup com a direita do botão
                    }}
                    onClick={(e) => e.stopPropagation()} // Impede que clicks no popup fechem ele (pelo listener do document)
                    onMouseDown={(e) => e.stopPropagation()} // Impede que mousedown feche componentes pai (ex: ActionSelect)
                >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 pl-1">
                        {title}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleCancel}
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                            title="Cancelar"
                        >
                            <HiX className="h-4 w-4" />
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`p-1.5 rounded-md hover:bg-${okVariant === 'danger' ? 'red' : 'green'}-50 dark:hover:bg-${okVariant === 'danger' ? 'red' : 'green'}-900/20 text-${okVariant === 'danger' ? 'red' : 'green'}-600 transition-colors`}
                            title="Confirmar"
                        >
                            <HiCheck className="h-4 w-4" />
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
