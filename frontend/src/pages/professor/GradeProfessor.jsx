import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Button, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, PageLoading } from '../../components/ui'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { HiAcademicCap, HiClock } from 'react-icons/hi'
import { FaFilePdf } from 'react-icons/fa'
import { generateGradeProfessorPDF } from '../../utils/pdf'
import { formatDateShortBR } from '../../utils/date'

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
    const [weekDates, setWeekDates] = useState([])

    useEffect(() => {
        carregarGrade()
        calculateWeekDates()
    }, [professorId])

    const calculateWeekDates = () => {
        const today = new Date()
        const currentDay = today.getDay()
        const monday = new Date(today)
        monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1))

        const dates = []
        for (let i = 0; i < 5; i++) {
            const d = new Date(monday)
            d.setDate(monday.getDate() + i)
            dates.push(formatDateShortBR(d))
        }
        setWeekDates(dates)
    }

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
                                flex-1 py-1.5 px-0.5 rounded-lg text-[13px] font-semibold transition-all duration-200
                                ${isSelected
                                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-md'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }
                            `}
                        >
                            <span className={`block text-[15px] font-black leading-tight ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`}>{weekDates[idx]}</span>
                            <span className="block text-[11px] uppercase tracking-tighter opacity-70 font-bold">{day.short}</span>
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
        <div className="space-y-4 md:space-y-6 animate-fade-in p-4 lg:p-8 pb-12">
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
                    <div className="hidden md:block">
                        <div className="grid grid-cols-[100px_repeat(5,1fr)] gap-4">
                            {/* Header do Grid */}
                            <div className="flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-3 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                                Aulas
                            </div>
                            {DAYS.map((day, idx) => {
                                const isToday = idx === (new Date().getDay() - 1)
                                return (
                                    <div
                                        key={day.value}
                                        className={`
                                            flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300
                                            ${isToday
                                                ? 'bg-primary-500/5 border-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm'
                                                : 'bg-white/50 dark:bg-slate-800/50 border-transparent text-slate-500 dark:text-slate-400'
                                            }
                                        `}
                                    >
                                        <div className={`text-base font-black leading-none ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`}>{weekDates[idx]}</div>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isToday ? 'opacity-100' : 'opacity-50'}`}>{day.label}</span>
                                    </div>
                                )
                            })}

                            {/* Corpo do Grid */}
                            {numerosAula.map(num => {
                                const numStr = String(num)
                                const horario = horarios[numStr]
                                const linhaMatriz = matriz[numStr] || {}

                                return (
                                    <div key={num} className="contents">
                                        {/* Coluna de Horário */}
                                        <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-premium border border-slate-100 dark:border-slate-700/50 group/time transition-all">
                                            <div className="text-lg font-black text-slate-700 dark:text-slate-200 group-hover/time:scale-110 transition-transform">
                                                {num}ª
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold mt-1">
                                                {horario?.hora_inicio}
                                            </div>
                                            <div className="w-4 h-px bg-slate-100 dark:bg-slate-700 my-1" />
                                            <div className="text-[10px] text-slate-400 font-bold">
                                                {horario?.hora_fim}
                                            </div>
                                        </div>

                                        {/* Cards de Aula para cada dia */}
                                        {DAYS.map((day, idx) => {
                                            const celula = linhaMatriz[String(day.value)]
                                            const isToday = idx === (new Date().getDay() - 1)
                                            const { currentAula, nextAula } = getAulaStatus(idx)
                                            const isCurrent = num === currentAula
                                            const isNext = num === nextAula

                                            if (!celula) {
                                                return (
                                                    <div
                                                        key={day.value}
                                                        className="group relative rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800/50 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all duration-300"
                                                    >
                                                        <span className="text-slate-200 dark:text-slate-700 font-black text-2xl group-hover:opacity-100 opacity-0 transition-opacity">
                                                            —
                                                        </span>
                                                    </div>
                                                )
                                            }

                                            return (
                                                <div
                                                    key={day.value}
                                                    className={`
                                                        relative rounded-2xl p-4 transition-all duration-300 group/card cursor-default
                                                        ${isCurrent
                                                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-xl shadow-emerald-500/20 scale-[1.02] z-10'
                                                            : isNext
                                                                ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20'
                                                                : 'bg-white dark:bg-slate-800 shadow-premium border border-slate-100 dark:border-slate-700/50 hover:shadow-2xl hover:-translate-y-1'
                                                        }
                                                    `}
                                                >
                                                    {/* Status Badges */}
                                                    <div className="absolute top-2 right-2">
                                                        {isCurrent && (
                                                            <span className="flex h-2 w-2 relative">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex flex-col">
                                                            {(isCurrent || isNext) && (
                                                                <span className="text-[10px] font-black uppercase tracking-widest mb-1 text-white/60">
                                                                    {isCurrent ? 'Agora' : 'Próxima'}
                                                                </span>
                                                            )}
                                                            <h3 className={`
                                                                text-lg font-black leading-tight
                                                                ${isCurrent || isNext ? 'text-white' : 'text-slate-800 dark:text-white'}
                                                            `}>
                                                                {celula.turma_label}
                                                            </h3>
                                                        </div>

                                                        {mostrar_disciplina && celula.disciplina_sigla && (
                                                            <div className={`
                                                                inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider
                                                                ${isCurrent || isNext
                                                                    ? 'bg-white/20 text-white'
                                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                                }
                                                            `}>
                                                                {celula.disciplina_sigla}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Background Decoration */}
                                                    <div className="absolute bottom-0 right-0 p-1 opacity-10 pointer-events-none">
                                                        <HiAcademicCap className={`w-12 h-12 ${isCurrent || isNext ? 'text-white' : 'text-slate-400'}`} />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
