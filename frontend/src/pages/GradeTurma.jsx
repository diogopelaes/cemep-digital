import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, Badge, PageLoading } from '../components/ui'
import api from '../services/api'
import toast from 'react-hot-toast'
import { HiAcademicCap } from 'react-icons/hi'

const DAYS = [
    { value: 0, label: 'Segunda' },
    { value: 1, label: 'Terça' },
    { value: 2, label: 'Quarta' },
    { value: 3, label: 'Quinta' },
    { value: 4, label: 'Sexta' },
]

export default function GradeTurma() {
    const { ano, numero, letra } = useParams()
    const [loading, setLoading] = useState(true)
    const [dados, setDados] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        carregarGrade()
    }, [ano, numero, letra])

    const carregarGrade = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await api.get(`/core/grade-turma/${ano}/${numero}/${letra.toUpperCase()}/`)
            setDados(response.data)
        } catch (err) {
            if (err.response?.status === 404) {
                setError('Turma não encontrada.')
            } else {
                setError('Erro ao carregar grade horária.')
                toast.error('Erro ao carregar grade horária.')
            }
        } finally {
            setLoading(false)
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

    const { turma_nome, cursos, matriz, horarios, mensagem, ano_letivo } = dados

    // Ordena os números de aula
    const numerosAula = Object.keys(matriz || {}).map(Number).sort((a, b) => a - b)

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        Grade Horária
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                        {turma_nome} - {ano_letivo}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {cursos?.map(curso => (
                        <Badge key={curso} variant="primary">{curso}</Badge>
                    ))}
                </div>
            </div>

            <div className="max-w-6xl">
                {/* Mensagem se não houver grade */}
                {mensagem && (
                    <div className="glass rounded-2xl p-6 text-center mb-8 border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10">
                        <p className="text-amber-700 dark:text-amber-300 font-medium">{mensagem}</p>
                    </div>
                )}

                {/* Tabela da Grade */}
                {numerosAula.length > 0 && (
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
                                    {numerosAula.map(numero => {
                                        const horario = horarios?.[String(numero)]
                                        const linhaMatriz = matriz?.[String(numero)] || {}

                                        return (
                                            <TableRow
                                                key={numero}
                                                className="group/row transition-colors [&:has(.col-aula:hover)_td]:!bg-slate-100/80 dark:[&:has(.col-aula:hover)_td]:!bg-slate-800/60"
                                            >
                                                <TableCell className="col-aula text-center bg-slate-50/30 dark:bg-slate-800/30 border-r border-b border-slate-100 dark:border-slate-700/50 cursor-default transition-colors">
                                                    <div className="font-bold text-slate-700 dark:text-slate-200">
                                                        {numero}ª
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-medium">
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
                                                                        {celula.disciplina_sigla}
                                                                    </div>
                                                                    {celula.professor_apelido && (
                                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                                            {celula.professor_apelido}
                                                                        </div>
                                                                    )}
                                                                    {celula.curso_sigla && cursos?.length > 1 && (
                                                                        <div className="pt-1">
                                                                            <span className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                                                                                {celula.curso_sigla}
                                                                            </span>
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
                )}
            </div>
        </div>
    )
}
