import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Card, Button, Loading, Badge, Table, TableHead, TableBody, TableRow,
    TableHeader, TableCell, PopConfirm, Select
} from '../../components/ui'
import { HiPlus, HiPencil, HiTrash, HiCalendar, HiClipboardCheck } from 'react-icons/hi'
import { pedagogicalAPI, coreAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateBR } from '../../utils/date'

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
    const AulaCard = ({ aula }) => (
        <Card
            className="group relative flex flex-col h-full hover:border-primary-200 dark:hover:border-primary-800 transition-colors cursor-pointer"
            onClick={() => navigate(`/aula-faltas/${aula.id}/editar`)}
        >
            <div className="absolute top-4 right-4 flex gap-1 z-10">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/aula-faltas/${aula.id}/editar`)
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-primary-600 dark:bg-slate-700 dark:text-slate-400 transition-colors"
                >
                    <HiPencil className="w-4 h-4" />
                </button>
                <PopConfirm
                    title="Excluir esta aula?"
                    onConfirm={() => handleDelete(aula.id)}
                >
                    <button
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-danger-600 dark:bg-slate-700 dark:text-slate-400 transition-colors"
                    >
                        <HiTrash className="w-4 h-4" />
                    </button>
                </PopConfirm>
            </div>

            <div className="mb-4 pr-16">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                        <HiCalendar className="w-3 h-3" />
                        {formatDateBR(aula.data)}
                    </span>
                    {showDisciplinaColumn && (
                        <Badge variant="outline" className="text-xs font-bold">
                            {aula.disciplina_sigla || 'DISC'}
                        </Badge>
                    )}
                    <Badge variant="primary" className="text-xs">
                        {aula.numero_aulas} aula{aula.numero_aulas > 1 ? 's' : ''}
                    </Badge>
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-white">
                    {aula.turma_nome}
                </h3>
            </div>

            <div className="mt-auto space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {aula.conteudo ? aula.conteudo.replace(/<[^>]*>/g, '').substring(0, 100) : 'Sem conteúdo'}
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-slate-500">
                        {aula.total_faltas} falta{aula.total_faltas !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>
        </Card>
    )

    // Estado vazio
    const EmptyState = () => (
        <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <HiClipboardCheck className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p>Nenhuma aula registrada neste período.</p>
        </div>
    )

    if (loading) return <Loading />

    return (
        <div className="space-y-6 animate-fade-in p-4 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Aula e Faltas
                    </h1>
                    <p className="text-slate-500 text-sm">Registre aulas e controle a frequência</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={() => navigate('/aula-faltas/nova')} variant="primary">
                        <HiPlus className="mr-1" /> Nova Aula
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
                    <Card hover={false} className="hidden md:block overflow-hidden p-0">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Data</TableHeader>
                                    <TableHeader>Turma</TableHeader>
                                    {showDisciplinaColumn && <TableHeader>Disciplina</TableHeader>}
                                    <TableHeader>Conteúdo</TableHeader>
                                    <TableHeader className="th-center">Faltas</TableHeader>
                                    <TableHeader className="th-center">Nº Aulas</TableHeader>
                                    <TableHeader className="th-center">Ações</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {aulasOrdenadas.map((aula) => (
                                    <TableRow key={aula.id} className="group">
                                        <TableCell>
                                            <span className="text-sm text-slate-500 whitespace-nowrap">
                                                {formatDateBR(aula.data)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-slate-800 dark:text-white">
                                                {aula.turma_nome}
                                            </span>
                                        </TableCell>
                                        {showDisciplinaColumn && (
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-bold">
                                                    {aula.disciplina_sigla || 'DISC'}
                                                </Badge>
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div
                                                className="max-w-xs truncate text-slate-600 dark:text-slate-400 cursor-pointer hover:text-primary-600 transition-colors"
                                                onClick={() => navigate(`/aula-faltas/${aula.id}/editar`)}
                                                title={aula.conteudo?.replace(/<[^>]*>/g, '')}
                                            >
                                                {aula.conteudo ? aula.conteudo.replace(/<[^>]*>/g, '').substring(0, 60) + '...' : 'Sem conteúdo'}
                                            </div>
                                        </TableCell>
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
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => navigate(`/aula-faltas/${aula.id}/editar`)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                                    title="Editar Aula"
                                                >
                                                    <HiPencil className="w-4 h-4" />
                                                </button>
                                                <PopConfirm
                                                    title="Excluir aula?"
                                                    onConfirm={() => handleDelete(aula.id)}
                                                >
                                                    <button
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
                                                        title="Excluir Aula"
                                                    >
                                                        <HiTrash className="w-4 h-4" />
                                                    </button>
                                                </PopConfirm>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </>
            )}
        </div>
    )
}
