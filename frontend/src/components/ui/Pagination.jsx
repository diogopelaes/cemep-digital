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

    // Gera array de páginas a exibir (máximo 5 em desktop, 3 em mobile)
    const getVisiblePages = (maxVisible) => {
        const pages = []

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

    const visiblePages = getVisiblePages(5)

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            {/* Info de itens - compacto em mobile */}
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-200">{startItem}</span>-
                <span className="font-medium text-slate-700 dark:text-slate-200">{endItem}</span>
                <span className="hidden sm:inline"> de </span>
                <span className="sm:hidden">/</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{totalItems}</span>
            </p>

            {/* Controles de navegação */}
            <div className="flex items-center gap-0.5 sm:gap-1">
                {/* Primeira página - só em desktop */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="hidden sm:block p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Primeira página"
                >
                    <HiChevronDoubleLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </button>

                {/* Página anterior */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Página anterior"
                >
                    <HiChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </button>

                {/* Páginas numeradas - Mobile: só página atual */}
                <div className="flex items-center gap-1 sm:hidden">
                    <span className="px-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                        {currentPage}/{totalPages}
                    </span>
                </div>

                {/* Páginas numeradas - Desktop (5 páginas) */}
                <div className="hidden sm:flex items-center gap-1">
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
                </div>

                {/* Próxima página */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Próxima página"
                >
                    <HiChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </button>

                {/* Última página - só em desktop */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="hidden sm:block p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Última página"
                >
                    <HiChevronDoubleRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </button>
            </div>
        </div>
    )
}
