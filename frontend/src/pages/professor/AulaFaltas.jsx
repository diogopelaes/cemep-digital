import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Card, Button, Loading, Badge, Table, TableHead, TableBody, TableRow,
    TableHeader, TableCell, PopConfirm, Select, ActionSelect
} from '../../components/ui'
import { HiPlus, HiPencil, HiTrash, HiCalendar, HiClipboardCheck } from 'react-icons/hi'
import { pedagogicalAPI, coreAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateBR, formatDateShortBR } from '../../utils/date'

const BIMESTRES = [
    { value: 1, label: '1º Bimestre' },
    { value: 2, label: '2º Bimestre' },
    { value: 3, label: '3º Bimestre' },
    { value: 4, label: '4º Bimestre' },
    { value: 0, label: 'Anual/Outros' },
]

export default function AulaFaltas() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [aulas, setAulas] = useState([])
    const [anoLetivo, setAnoLetivo] = useState(null)
    const [bimestreSelecionado, setBimestreSelecionado] = useState('')
    const [turmaSelecionada, setTurmaSelecionada] = useState('')
    const [disciplinaSelecionada, setDisciplinaSelecionada] = useState('')
    const [disciplinasCount, setDisciplinasCount] = useState(1)
    const [turmas, setTurmas] = useState([])
    const [disciplinas, setDisciplinas] = useState([])

    // Se professor tem mais de uma disciplina, mostra a coluna
    const showDisciplinaColumn = disciplinasCount > 1

    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        if (anoLetivo) {
            setBimestreSelecionado(anoLetivo.bimestre_atual || 1)
        }
    }, [anoLetivo])

    const loadInitialData = async () => {
        setLoading(true)
        try {
            const [aulasRes, selecRes, contextoRes] = await Promise.all([
                pedagogicalAPI.aulasFaltas.list({ page_size: 1000 }),
                coreAPI.anoLetivoSelecionado.get(),
                pedagogicalAPI.aulasFaltas.opcoesNovaAula({ scope: 'simple' })
            ])

            setAulas(aulasRes.data.results || [])
            setDisciplinasCount(aulasRes.data.disciplinas_count || 1)

            if (selecRes.data.ano_letivo_details) {
                setAnoLetivo(selecRes.data.ano_letivo_details)
            }

            // Extrair turmas únicas para filtro
            const turmasUnicas = contextoRes.data.turmas || []
            setTurmas(turmasUnicas)

            // Extrair disciplinas únicas para filtro
            const todasDisciplinas = []
            const disciplinasMap = contextoRes.data.disciplinas_por_turma || {}
            Object.values(disciplinasMap).forEach(discs => {
                discs.forEach(d => {
                    if (!todasDisciplinas.find(x => x.disciplina_id === d.disciplina_id)) {
                        todasDisciplinas.push(d)
                    }
                })
            })
            setDisciplinas(todasDisciplinas)

        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar dados.')
        }
        setLoading(false)
    }

    const handleDelete = async (id) => {
        try {
            await pedagogicalAPI.aulasFaltas.delete(id)
            setAulas(aulas.filter(a => a.id !== id))
            toast.success('Aula excluída')
        } catch (error) {
            toast.error('Erro ao excluir')
        }
    }

    // Filtrar aulas
    const aulasFiltradas = aulas.filter(a => {
        if (bimestreSelecionado !== '' && a.bimestre !== parseInt(bimestreSelecionado)) return false
        if (turmaSelecionada && a.turma_nome !== turmas.find(t => t.id === turmaSelecionada)?.nome) return false
        if (disciplinaSelecionada && a.disciplina_sigla !== disciplinas.find(d => d.disciplina_id === disciplinaSelecionada)?.disciplina_sigla) return false
        return true
    })

    // Ordenar por data desc, depois por numero_aulas desc
    const aulasOrdenadas = [...aulasFiltradas].sort((a, b) => {
        const dateCompare = new Date(b.data) - new Date(a.data)
        if (dateCompare !== 0) return dateCompare
        return b.numero_aulas - a.numero_aulas
    })

    // Componente Card para Mobile
    const AulaCard = ({ aula }) => {
        const [showActions, setShowActions] = useState(false);

        return (
            <Card
                padding={false}
                className="overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm transition-all duration-300"
            >
                <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3 min-w-0">
                            {/* Ícone contextual */}
                            <div
                                className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-primary-500 flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => navigate(`/aula-faltas/${aula.id}/editar`)}
                            >
                                <HiClipboardCheck className="text-white h-5 w-5" />
                            </div>

                            {/* Informações */}
                            <div className="min-w-0">
                                <h3
                                    className="font-bold text-slate-800 dark:text-white text-sm cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                                    onClick={() => navigate(`/aula-faltas/${aula.id}/editar`)}
                                >
                                    {aula.turma_nome}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                        <HiCalendar className="w-3 h-3" />
                                        {formatDateShortBR(aula.data)}
                                    </span>
                                    {showDisciplinaColumn && (
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase font-bold border-slate-200 dark:border-slate-700">
                                            {aula.disciplina_sigla || 'DISC'}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* BOTÃO PARA EXPANDIR AÇÕES */}
                        <button
                            onClick={() => setShowActions(!showActions)}
                            className={`
                                text-[10px] font-bold px-3 py-1 rounded-full transition-all duration-200 shrink-0
                                ${showActions
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 ring-2 ring-primary-500/20'
                                    : 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 border border-primary-100 dark:border-primary-800/50'
                                }
                            `}
                        >
                            {showActions ? 'Fechar' : 'Ações'}
                        </button>
                    </div>

                    {/* Resumo da Aula */}
                    <div className="mt-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Badge variant="primary" className="text-[10px] px-1.5 py-0">
                                {aula.numero_aulas} aula{aula.numero_aulas > 1 ? 's' : ''}
                            </Badge>
                            <Badge variant={aula.total_faltas > 0 ? 'warning' : 'success'} className="text-[10px] px-1.5 py-0">
                                {aula.total_faltas} {aula.total_faltas === 1 ? 'estudante' : 'estudantes'}
                            </Badge>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Bimestre: {aula.bimestre}º</span>
                    </div>
                </div>

                {/* BARRA DE AÇÕES EXPANSÍVEL */}
                <div className={`
                    grid transition-all duration-300 ease-in-out border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30
                    ${showActions ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}
                `}>
                    <div className="overflow-hidden grid grid-cols-2">
                        <button
                            onClick={() => navigate(`/aula-faltas/${aula.id}/editar`)}
                            className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400 transition-all border-r border-slate-100 dark:border-slate-800"
                        >
                            <HiPencil className="h-5 w-5" />
                            <span>Editar</span>
                        </button>

                        <div className="flex-1">
                            <PopConfirm
                                title="Excluir esta aula?"
                                onConfirm={() => handleDelete(aula.id)}
                            >
                                <button
                                    className="w-full py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-danger-600 dark:hover:text-danger-400 transition-all"
                                >
                                    <HiTrash className="h-5 w-5" />
                                    <span>Excluir</span>
                                </button>
                            </PopConfirm>
                        </div>
                    </div>
                </div>
            </Card>
        )
    }

    // Estado vazio
    const EmptyState = () => (
        <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <HiClipboardCheck className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
                Nenhuma aula encontrada
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
                Nenhuma aula registrada neste período ou para os filtros selecionados.
            </p>
        </Card>
    )

    if (loading) return <Loading />

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        Aula e Faltas
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Registre aulas e controle a frequência</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={() => navigate('/aula-faltas/nova')} variant="primary">
                        <HiPlus className="sm:mr-1" />
                        <span className="hidden sm:inline">Nova Aula</span>
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <Card hover={false}>
                <div className="flex flex-wrap gap-4">
                    <div className="w-full sm:w-40">
                        <label className="label">Bimestre</label>
                        <select
                            className="input"
                            value={bimestreSelecionado}
                            onChange={(e) => setBimestreSelecionado(e.target.value ? parseInt(e.target.value) : '')}
                        >
                            <option value="">Todos</option>
                            {BIMESTRES.map(b => (
                                <option key={b.value} value={b.value}>{b.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full sm:w-48">
                        <label className="label">Turma</label>
                        <select
                            className="input"
                            value={turmaSelecionada}
                            onChange={(e) => setTurmaSelecionada(e.target.value)}
                        >
                            <option value="">Todas</option>
                            {turmas.map(t => (
                                <option key={t.id} value={t.id}>{t.nome}</option>
                            ))}
                        </select>
                    </div>

                    {showDisciplinaColumn && (
                        <div className="w-full sm:w-48">
                            <label className="label">Disciplina</label>
                            <select
                                className="input"
                                value={disciplinaSelecionada}
                                onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                            >
                                <option value="">Todas</option>
                                {disciplinas.map(d => (
                                    <option key={d.disciplina_id} value={d.disciplina_id}>
                                        {d.disciplina_nome}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </Card>

            {/* Conteúdo */}
            {aulasOrdenadas.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    {/* Mobile: Cards */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                        {aulasOrdenadas.map(aula => (
                            <AulaCard key={aula.id} aula={aula} />
                        ))}
                    </div>

                    {/* Desktop: Tabela */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Turma</TableHeader>
                                    <TableHeader>Data</TableHeader>
                                    {showDisciplinaColumn && <TableHeader>Disciplina</TableHeader>}
                                    {bimestreSelecionado === '' && <TableHeader>Bimestre</TableHeader>}
                                    <TableHeader className="th-center">Faltas</TableHeader>
                                    <TableHeader className="th-center">Nº Aulas</TableHeader>
                                    <TableHeader className="th-center font-bold text-primary-600 dark:text-primary-400">Ações</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {aulasOrdenadas.map((aula) => (
                                    <TableRow key={aula.id}>
                                        <TableCell>
                                            <div
                                                className="cursor-pointer group inline-block"
                                                onClick={() => navigate(`/aula-faltas/${aula.id}/editar`)}
                                            >
                                                <p className="font-medium text-slate-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                    {aula.turma_nome}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div
                                                className="cursor-pointer group inline-block"
                                                onClick={() => navigate(`/aula-faltas/${aula.id}/editar`)}
                                            >
                                                <span className="text-sm text-slate-500 whitespace-nowrap font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                    {formatDateShortBR(aula.data)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        {showDisciplinaColumn && (
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-bold">
                                                    {aula.disciplina_sigla || 'DISC'}
                                                </Badge>
                                            </TableCell>
                                        )}
                                        {bimestreSelecionado === '' && (
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-semibold">
                                                    {aula.bimestre ? `${aula.bimestre}º Bim` : '-'}
                                                </Badge>
                                            </TableCell>
                                        )}
                                        <TableCell className="td-center">
                                            <Badge variant={aula.total_faltas > 0 ? 'warning' : 'success'}>
                                                {aula.total_faltas}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="td-center">
                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                {aula.numero_aulas}
                                            </span>
                                        </TableCell>
                                        <TableCell className="td-center">
                                            <PopConfirm
                                                title="Excluir Registro de Aula?"
                                                message="Esta ação não poderá ser desfeita."
                                                onConfirm={() => handleDelete(aula.id)}
                                            >
                                                <button
                                                    className="p-2 text-slate-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20"
                                                    title="Excluir Aula"
                                                >
                                                    <HiTrash className="h-5 w-5" />
                                                </button>
                                            </PopConfirm>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
        </div>
    )
}
