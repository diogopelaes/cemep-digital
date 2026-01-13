import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
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
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const professorId = searchParams.get('professor_id')

    const [loading, setLoading] = useState(true)
    const [dados, setDados] = useState(null)
    const [error, setError] = useState(null)
    const [selectedDay, setSelectedDay] = useState(getTodayIndex)
    const [generatingPDF, setGeneratingPDF] = useState(false)
    const [weekDates, setWeekDates] = useState([])
    const [weekDateObjects, setWeekDateObjects] = useState([])

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
        const dateObjs = []
        for (let i = 0; i < 5; i++) {
            const d = new Date(monday)
            d.setDate(monday.getDate() + i)
            dates.push(formatDateShortBR(d))
            dateObjs.push(d)
        }
        setWeekDates(dates)
        setWeekDateObjects(dateObjs)
    }

    const carregarGrade = async () => {
        setLoading(true)
        setError(null)
        try {
            const url = professorId
                ? `/pedagogical/grade-professor/?professor_id=${professorId}`
                : '/pedagogical/grade-professor/'
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

    const handleAulaClick = (celula, numeroAula, diaIndex, horario) => {
        if (!celula) return

        // Calcula a data dessa aula baseada no dia da semana
        const dataAula = weekDateObjects[diaIndex]
        // Formata para YYYY-MM-DD para o input type="date"
        const dataFormatada = dataAula.toISOString().split('T')[0]

        navigate(`/aula-faltas/nova/${celula.professor_disciplina_turma_id}`, {
            state: {
                data: dataFormatada,
                numeroAulas: 2,
                turmaId: celula.turma_id || celula.id, // Fallback
                turmaNome: celula.turma_nome_completo || celula.turma_label, // Prefer full name
                disciplinaId: celula.disciplina_id,
                disciplinaNome: celula.disciplina_nome || celula.disciplina_label, // Prefer full name
                disciplinaSigla: celula.disciplina_sigla,
                horario: horario
            }
        })
    }

    // Helper para determinar status de registro (Simulado por enquanto)
    const getRegistrationStatus = (diaIndex, horario) => {
        // Como não temos a info real do backend se foi registrada,
        // vamos assumir false.
        // Se data < agora e !registrada => PENDENTE (Problema)
        // Se data > agora e !registrada => NÃO REGISTRADA (Normal)

        const now = new Date()
        const aulaDate = new Date(weekDateObjects[diaIndex])

        // Ajusta hora da aula para comparação precisa
        const [horaFimH, horaFimM] = horario.hora_fim.split(':').map(Number)
        aulaDate.setHours(horaFimH, horaFimM, 0)

        const isPast = aulaDate < now
        // TODO: Obter status real do backend
        const isRegistered = false

        return {
            isRegistered,
            isPending: isPast && !isRegistered,
            isFuture: !isPast && !isRegistered
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
            <div className="flex gap-1 p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl mb-4">
                {DAYS.map((day, idx) => {
                    const isSelected = selectedDay === idx
                    const isToday = idx === todayIdx && isWeekday

                    return (
                        <button
                            key={day.value}
                            onClick={() => setSelectedDay(idx)}
                            className={`
                                flex-1 py-2 px-1 rounded-lg transition-all duration-200
                                ${isSelected
                                    ? 'bg-white dark:bg-slate-700 shadow-sm'
                                    : 'hover:bg-white/30'
                                }
                            `}
                        >
                            <span className={`block text-sm font-black leading-tight ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                {weekDates[idx]}
                            </span>
                            <span className={`block text-[9px] uppercase font-bold tracking-tighter ${isSelected ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500/40'}`}>
                                {day.short}
                            </span>
                        </button>
                    )
                })}
            </div>
        )
    }

    const MobileAulaCard = ({ numeroAula, celula, horario, isCurrent, isNext }) => {
        const isEmpty = !celula
        const { isPending, isFuture } = !isEmpty ? getRegistrationStatus(selectedDay, horario) : {}

        return (
            <div
                onClick={() => !isEmpty && handleAulaClick(celula, numeroAula, selectedDay, horario)}
                className={`
                    relative rounded-2xl p-4 transition-all duration-300 overflow-hidden
                    ${isEmpty
                        ? 'bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700'
                        : isCurrent
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-xl shadow-emerald-500/20 cursor-pointer active:scale-[0.98]'
                            : isNext
                                ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-[0.98]'
                                : 'bg-white dark:bg-slate-800 shadow-md border border-slate-100 dark:border-slate-700/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 active:scale-[0.98]'
                    }
                `}
            >
                {/* Status Badge (Ping) para Mobile */}
                {isCurrent && (
                    <div className="absolute top-3 right-3">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                    </div>
                )}

                {/* Status de Registro (Pendente/Futuro) */}
                {!isEmpty && !isCurrent && !isNext && (
                    <div className="absolute top-3 right-3">
                        <span className={`
                            text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded
                            ${isPending
                                ? 'bg-danger-100 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                            }
                        `}>
                            {isPending ? 'Pendente' : 'Não registrada'}
                        </span>
                    </div>
                )}

                <div className="flex items-start gap-4">
                    {/* Número da Aula */}
                    <div className={`
                        w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border-2
                        ${isEmpty
                            ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            : isCurrent || isNext
                                ? 'bg-white/20 border-white/30'
                                : 'bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800/50'
                        }
                    `}>
                        <span className={`text-xl font-black ${isEmpty ? 'text-slate-300' : isCurrent || isNext ? 'text-white' : 'text-primary-600'}`}>
                            {numeroAula}
                        </span>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 relative z-10">
                        {isEmpty ? (
                            <div className="flex items-center h-12">
                                <span className="text-sm text-slate-400 dark:text-slate-500 italic font-medium">
                                    Horário livre
                                </span>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col">
                                    {(isCurrent || isNext) && (
                                        <span className="text-[10px] font-black uppercase tracking-widest mb-0.5 text-white/70">
                                            {isCurrent ? 'Agora' : 'Próxima'}
                                        </span>
                                    )}
                                    <h3 className={`font-black text-lg leading-tight truncate ${isCurrent || isNext ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                                        {celula.turma_label}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                    {mostrar_disciplina && celula.disciplina_sigla && (
                                        <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${isCurrent || isNext ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                            {celula.disciplina_sigla}
                                        </div>
                                    )}
                                    <div className={`flex items-center gap-1 ${isCurrent || isNext ? 'text-white/80' : 'text-slate-400'}`}>
                                        <HiClock className="w-3.5 h-3.5" />
                                        <span className="text-[11px] font-bold tabular-nums">
                                            {horario?.hora_inicio}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Decoration para consistência */}
                {!isEmpty && (
                    <div className="absolute top-1/2 -right-4 -translate-y-1/2 opacity-[0.07] pointer-events-none rotate-12">
                        <HiAcademicCap className={`w-24 h-24 ${isCurrent || isNext ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                )}
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
        <div className="space-y-4 md:space-y-6 animate-fade-in p-3 md:p-6 lg:p-8 pb-12 overflow-x-hidden">
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
                                            const { isPending, isFuture } = celula ? getRegistrationStatus(idx, horario) : {}

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
                                                    onClick={() => handleAulaClick(celula, num, idx, horario)}
                                                    className={`
                                                        relative rounded-2xl p-4 transition-all duration-300 group/card cursor-pointer
                                                        ${isCurrent
                                                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-xl shadow-emerald-500/20 scale-[1.02] z-10'
                                                            : isNext
                                                                ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20'
                                                                : 'bg-white dark:bg-slate-800 shadow-premium border border-slate-100 dark:border-slate-700/50 hover:shadow-2xl hover:-translate-y-1'
                                                        }
                                                    `}
                                                >
                                                    {/* Status Badges */}
                                                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                                        {isCurrent && (
                                                            <span className="flex h-2 w-2 relative">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                                            </span>
                                                        )}
                                                        {!isCurrent && !isNext && (
                                                            <span className={`
                                                                text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded
                                                                ${isPending
                                                                    ? 'bg-danger-100 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400'
                                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                                                }
                                                            `}>
                                                                {isPending ? 'Pendente' : 'Não registrada'}
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
