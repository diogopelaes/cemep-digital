import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Button, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, PageLoading } from '../../components/ui'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { HiAcademicCap, HiClock } from 'react-icons/hi'
import { FaFilePdf } from 'react-icons/fa'
import { generateGradeProfessorPDF } from '../../utils/pdf'

const DAYS = [
    { value: 0, label: 'Segunda', short: 'Seg' },
    { value: 1, label: 'Terça', short: 'Ter' },
    { value: 2, label: 'Quarta', short: 'Qua' },
    { value: 3, label: 'Quinta', short: 'Qui' },
    { value: 4, label: 'Sexta', short: 'Sex' },
]

// Retorna o índice do dia atual (0-4 para Seg-Sex) ou 0 se for fim de semana
const getTodayIndex = () => {
    const today = new Date().getDay() // 0=Dom, 1=Seg, ..., 6=Sab
    return today >= 1 && today <= 5 ? today - 1 : 0
}

export default function GradeProfessor() {
    const [searchParams] = useSearchParams()
    const professorId = searchParams.get('professor_id')

    const [loading, setLoading] = useState(true)
    const [dados, setDados] = useState(null)
    const [error, setError] = useState(null)
    const [selectedDay, setSelectedDay] = useState(getTodayIndex)
    const [generatingPDF, setGeneratingPDF] = useState(false)

    useEffect(() => {
        carregarGrade()
    }, [professorId])

    const carregarGrade = async () => {
        setLoading(true)
        setError(null)
        try {
            const url = professorId
                ? `/core/grade-professor/?professor_id=${professorId}`
                : '/core/grade-professor/'
            const response = await api.get(url)
            setDados(response.data)
        } catch (err) {
            if (err.response?.status === 403) {
                setError('Sem permissão para visualizar esta grade.')
            } else if (err.response?.status === 404) {
                setError('Professor não encontrado.')
            } else {
                setError('Erro ao carregar grade horária.')
                toast.error('Erro ao carregar grade horária.')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleGerarPDF = async () => {
        setGeneratingPDF(true)
        try {
            await generateGradeProfessorPDF(dados)
        } finally {
            setGeneratingPDF(false)
        }
    }

    if (loading) {
        return <PageLoading />
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center">
                    <HiAcademicCap className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 text-lg">{error}</p>
                </div>
            </div>
        )
    }

    if (!dados) return null

    const { professor_nome, matriz, horarios, mensagem, ano_letivo, mostrar_disciplina } = dados

    // Ordena os números de aula
    const numerosAula = Object.keys(matriz || {}).map(Number).sort((a, b) => a - b)

    // Componente: Seletor de Dias para Mobile
    const MobileDaySelector = () => {
        const todayIdx = getTodayIndex()
        const today = new Date().getDay()
        const isWeekday = today >= 1 && today <= 5

        return (
            <div className="flex gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl mb-4">
                {DAYS.map((day, idx) => {
                    const isSelected = selectedDay === idx
                    const isToday = idx === todayIdx && isWeekday

                    return (
                        <button
                            key={day.value}
                            onClick={() => setSelectedDay(idx)}
                            className={`
                                flex-1 py-2.5 px-1 rounded-lg text-sm font-semibold transition-all duration-200
                                ${isSelected
                                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-md'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }
                            `}
                        >
                            <span className="block">{day.short}</span>
                            {isToday && (
                                <span className={`block text-[9px] mt-0.5 ${isSelected ? 'text-primary-500' : 'text-slate-400'}`}>
                                    Hoje
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
        )
    }

    // Componente: Card de Aula para Mobile
    const MobileAulaCard = ({ numeroAula, celula, horario, isCurrent, isNext }) => {
        const isEmpty = !celula

        // Classes de destaque para aula atual ou próxima
        const highlightClasses = isCurrent
            ? 'ring-2 ring-emerald-500 dark:ring-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20'
            : isNext
                ? 'ring-2 ring-amber-500 dark:ring-amber-400 bg-amber-50/50 dark:bg-amber-900/20'
                : ''

        return (
            <div className={`
                rounded-xl p-4 transition-all duration-200
                ${isEmpty
                    ? 'bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700'
                    : `bg-white dark:bg-slate-800 shadow-md border border-slate-100 dark:border-slate-700/50 ${highlightClasses}`
                }
            `}>
                <div className="flex items-start gap-3">
                    {/* Número da Aula */}
                    <div className={`
                        w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0
                        ${isEmpty
                            ? 'bg-slate-100 dark:bg-slate-700/50'
                            : isCurrent
                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                                : isNext
                                    ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                                    : 'bg-gradient-to-br from-primary-500 to-primary-600'
                        }
                    `}>
                        <span className={`text-lg font-bold ${isEmpty ? 'text-slate-400' : 'text-white'}`}>
                            {numeroAula}
                        </span>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                        {isEmpty ? (
                            <div className="flex items-center h-12">
                                <span className="text-sm text-slate-400 dark:text-slate-500 italic">
                                    Sem aula
                                </span>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800 dark:text-white text-base">
                                        {celula.turma_label}
                                    </h3>
                                    {isCurrent && (
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold animate-pulse">
                                            Agora
                                        </span>
                                    )}
                                    {isNext && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold">
                                            Próxima
                                        </span>
                                    )}
                                </div>
                                {mostrar_disciplina && celula.disciplina_sigla && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                        {celula.disciplina_sigla}
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Horário */}
                    <div className="text-right shrink-0">
                        <div className={`flex items-center gap-1 ${isCurrent ? 'text-emerald-500' : isNext ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
                            <HiClock className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">
                                {horario?.hora_inicio}
                            </span>
                        </div>
                        <span className="text-[10px] text-slate-300 dark:text-slate-600">
                            {horario?.hora_fim}
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    // Função para obter status de aula (atual, próxima, etc)
    const getAulaStatus = (dia) => {
        const today = new Date()
        const currentDay = today.getDay() - 1 // 0=Seg, 4=Sex

        if (dia !== currentDay) return { currentAula: null, nextAula: null }

        const now = today.getHours() * 60 + today.getMinutes()

        let currentAula = null
        let nextAula = null

        for (const numStr of Object.keys(horarios)) {
            const horario = horarios[numStr]
            const [startH, startM] = horario.hora_inicio.split(':').map(Number)
            const [endH, endM] = horario.hora_fim.split(':').map(Number)
            const start = startH * 60 + startM
            const end = endH * 60 + endM

            if (now >= start && now < end) {
                currentAula = parseInt(numStr)
            } else if (now < start && !nextAula) {
                nextAula = parseInt(numStr)
            }
        }

        return { currentAula, nextAula }
    }

    return (
        <div className="space-y-4 md:space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
                        Grade Horária
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic text-sm md:text-base">
                        {professor_nome} - {ano_letivo}
                    </p>
                </div>
                <div className="flex shrink-0">
                    <Button
                        variant="secondary"
                        icon={FaFilePdf}
                        onClick={handleGerarPDF}
                        loading={generatingPDF}
                        className="w-auto"
                    >
                        <span className="hidden md:inline">Visualizar PDF</span>
                    </Button>
                </div>
            </div>

            {/* Mensagem se não houver grade */}
            {mensagem && (
                <Card className="!p-8 text-center">
                    <HiAcademicCap className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">{mensagem}</p>
                </Card>
            )}

            {/* Grade */}
            {!mensagem && numerosAula.length > 0 && (
                <>
                    {/* Mobile View */}
                    <div className="md:hidden">
                        <MobileDaySelector />
                        <div className="space-y-2">
                            {numerosAula.map(num => {
                                const numStr = String(num)
                                const diaKey = String(selectedDay)
                                const celula = matriz[numStr]?.[diaKey]
                                const horario = horarios[numStr]
                                const { currentAula, nextAula } = getAulaStatus(selectedDay)

                                return (
                                    <MobileAulaCard
                                        key={num}
                                        numeroAula={num}
                                        celula={celula}
                                        horario={horario}
                                        isCurrent={num === currentAula}
                                        isNext={num === nextAula}
                                    />
                                )
                            })}
                        </div>
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:block max-w-6xl">
                        <Card padding={false} hover={false} className="overflow-hidden shadow-premium">
                            <div className="overflow-x-auto">
                                <Table className="border-separate border-spacing-0 [&_tr:hover_td]:!bg-transparent">
                                    <TableHead>
                                        <TableRow>
                                            <TableHeader className="w-32 text-center bg-slate-50/50 dark:bg-slate-800/50 border-b border-r border-slate-100 dark:border-slate-700/50 text-[11px] uppercase tracking-wider font-bold">
                                                Aula
                                            </TableHeader>
                                            {DAYS.map((day, idx) => (
                                                <TableHeader
                                                    key={day.value}
                                                    className={`text-center border-b border-slate-100 dark:border-slate-700/50 text-[11px] uppercase tracking-wider font-bold ${idx % 2 === 0
                                                        ? 'bg-slate-50/30 dark:bg-slate-800/30'
                                                        : 'bg-primary-500/5 dark:bg-primary-400/5'
                                                        }`}
                                                >
                                                    {day.label}
                                                </TableHeader>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {numerosAula.map(num => {
                                            const numStr = String(num)
                                            const horario = horarios[numStr]
                                            const linhaMatriz = matriz[numStr] || {}

                                            return (
                                                <TableRow
                                                    key={num}
                                                    className="group/row transition-colors [&:has(.col-aula:hover)_td]:!bg-slate-100/80 dark:[&:has(.col-aula:hover)_td]:!bg-slate-800/60"
                                                >
                                                    <TableCell className="col-aula text-center bg-slate-50/30 dark:bg-slate-800/30 border-r border-b border-slate-100 dark:border-slate-700/50 cursor-default transition-colors">
                                                        <div className="font-bold text-slate-700 dark:text-slate-200">
                                                            {num}ª
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                            {horario?.hora_inicio} - {horario?.hora_fim}
                                                        </div>
                                                    </TableCell>
                                                    {DAYS.map((day, idx) => {
                                                        const celula = linhaMatriz[String(day.value)]
                                                        const colBg = idx % 2 === 0
                                                            ? ''
                                                            : 'bg-primary-500/[0.02] dark:bg-primary-400/[0.02]'

                                                        return (
                                                            <TableCell
                                                                key={day.value}
                                                                className={`
                                                                    text-center border-b border-slate-100 dark:border-slate-700/50 transition-all duration-200
                                                                    ${colBg}
                                                                    ${celula
                                                                        ? 'hover:!bg-white dark:hover:!bg-slate-700 hover:shadow-xl hover:scale-[1.05] relative z-20 cursor-default'
                                                                        : 'hover:!bg-slate-50 dark:hover:!bg-slate-800/50 cursor-default'
                                                                    }
                                                                `}
                                                            >
                                                                {!celula ? (
                                                                    <span className="opacity-20">—</span>
                                                                ) : (
                                                                    <div className="space-y-1 py-2">
                                                                        <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                                                            {celula.turma_label}
                                                                        </div>
                                                                        {mostrar_disciplina && celula.disciplina_sigla && (
                                                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                                                {celula.disciplina_sigla}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        )
                                                    })}
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}
