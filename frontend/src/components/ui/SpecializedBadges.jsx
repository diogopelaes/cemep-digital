import React from 'react'
import { formatDateShortBR } from '../../utils/date'

/**
 * Badge para Disciplina (Sigla)
 */
export const DisciplinaBadge = ({ sigla, className = '' }) => {
    if (!sigla) return null
    return (
        <span className={`badge-disciplina ${className}`}>
            {sigla}
        </span>
    )
}

/**
 * Badge para Turma (Número + Letra)
 * Quadrado com gradiente, versão compacta para listagens secundárias.
 */
export const TurmaBadge = ({ numero, letra, onClick, className = '' }) => {
    return (
        <div
            className={`badge-turma ${onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={onClick}
        >
            <span>{numero}{letra}</span>
        </div>
    )
}

/**
 * Badge para Turma quando é o identificador principal da linha na tabela. 
 * Reverte para o estilo original: Quadrado 40px com gradiente primary/accent.
 */
export const TurmaPrimaryBadge = ({ numero, letra, nome, onClick, className = '' }) => {
    if (!numero) return null
    return (
        <div
            className={`flex items-center gap-3 ${onClick ? 'cursor-pointer group' : ''} ${className}`}
            onClick={onClick}
        >
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">
                    {numero}{letra}
                </span>
            </div>
            {nome && (
                <div>
                    <p className="font-medium text-slate-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {nome}
                    </p>
                </div>
            )}
        </div>
    )
}

/**
 * Badge para Bimestre (Ex.: 2º Bim)
 */
export const BimestreBadge = ({ bimestre, className = '' }) => {
    if (bimestre === undefined || bimestre === null) return null
    const label = bimestre === 0 ? 'Anual' : `${bimestre}º Bim`
    return (
        <span className={`badge-bimestre ${className}`}>
            {label}
        </span>
    )
}

/**
 * Componente que combina Turma e Disciplina
 */
export const TurmaDisciplinaBadge = ({ numero, letra, disciplinaSigla, className = '' }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <TurmaBadge numero={numero} letra={letra} className="!w-10 !h-10" />
            <DisciplinaBadge sigla={disciplinaSigla} />
        </div>
    )
}

/**
 * Exibição de data tipo "calendário" DD/MM altamente visível
 */
export const DateDisplay = ({ date, className = '' }) => {
    if (!date) return null
    const formatted = formatDateShortBR(date)
    return (
        <span className={`badge-date ${className}`}>
            {formatted}
        </span>
    )
}
