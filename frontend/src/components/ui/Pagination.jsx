import { HiChevronLeft, HiChevronRight, HiChevronDoubleLeft, HiChevronDoubleRight } from 'react-icons/hi'

/**
 * Componente de paginação reutilizável
 * @param {number} currentPage - Página atual (1-indexed)
 * @param {number} totalPages - Total de páginas
 * @param {number} totalItems - Total de itens
 * @param {number} pageSize - Itens por página
 * @param {function} onPageChange - Callback quando a página muda
 */
export default function Pagination({ currentPage, totalPages, totalItems, pageSize = 20, onPageChange }) {
    if (totalPages <= 1) return null

    // Calcula o range de itens sendo exibidos
    const startItem = (currentPage - 1) * pageSize + 1
    const endItem = Math.min(currentPage * pageSize, totalItems)

    // Gera array de páginas a exibir (máximo 5 páginas visíveis)
    const getVisiblePages = () => {
        const pages = []
        const maxVisible = 5

        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
        let end = Math.min(totalPages, start + maxVisible - 1)

        // Ajusta se estiver perto do final
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1)
        }

        for (let i = start; i <= end; i++) {
            pages.push(i)
        }

        return pages
    }

    const visiblePages = getVisiblePages()

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            {/* Info de itens */}
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Exibindo <span className="font-medium text-slate-700 dark:text-slate-200">{startItem}</span> a{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">{endItem}</span> de{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">{totalItems}</span> itens
            </p>

            {/* Controles de navegação */}
            <div className="flex items-center gap-1">
                {/* Primeira página */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Primeira página"
                >
                    <HiChevronDoubleLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </button>

                {/* Página anterior */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Página anterior"
                >
                    <HiChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </button>

                {/* Páginas numeradas */}
                {visiblePages[0] > 1 && (
                    <span className="px-2 text-slate-400">...</span>
                )}

                {visiblePages.map(page => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${page === currentPage
                                ? 'bg-primary-500 text-white shadow-sm'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                    >
                        {page}
                    </button>
                ))}

                {visiblePages[visiblePages.length - 1] < totalPages && (
                    <span className="px-2 text-slate-400">...</span>
                )}

                {/* Próxima página */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Próxima página"
                >
                    <HiChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </button>

                {/* Última página */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Última página"
                >
                    <HiChevronDoubleRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </button>
            </div>
        </div>
    )
}
