import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Card, Button, Loading, Badge, Table, TableHead, TableBody, TableRow,
    TableHeader, TableCell, PopConfirm
} from '../../components/ui'
import { HiPlus, HiPencil, HiTrash, HiCalendar, HiBookOpen } from 'react-icons/hi'
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

export default function PlanoAula() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [planos, setPlanos] = useState([])
    const [anoLetivo, setAnoLetivo] = useState(null)
    const [bimestreSelecionado, setBimestreSelecionado] = useState(1)
    const [disciplinasCount, setDisciplinasCount] = useState(1)

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
            const [planosRes, selecRes] = await Promise.all([
                pedagogicalAPI.planosAula.list({ page_size: 1000 }),
                coreAPI.anoLetivoSelecionado.get()
            ])

            setPlanos(planosRes.data.results || [])
            setDisciplinasCount(planosRes.data.disciplinas_count || 1)

            if (selecRes.data.ano_letivo_details) {
                setAnoLetivo(selecRes.data.ano_letivo_details)
            }

        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar dados.')
        }
        setLoading(false)
    }

    const handleDelete = async (id) => {
        try {
            await pedagogicalAPI.planosAula.delete(id)
            setPlanos(planos.filter(p => p.id !== id))
            toast.success('Plano excluído')
        } catch (error) {
            toast.error('Erro ao excluir')
        }
    }

    const planosFiltrados = planos.filter(p =>
        bimestreSelecionado === '' || p.bimestre === parseInt(bimestreSelecionado)
    )

    // Componente Card para Mobile
    const PlanoAulaCard = ({ plano }) => (
        <Card
            className="group relative flex flex-col h-full hover:border-primary-200 dark:hover:border-primary-800 transition-colors cursor-pointer"
            onClick={() => navigate(`/plano-aula/${plano.id}/editar`)}
        >
            <div className="absolute top-4 right-4 flex gap-3 z-10">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/plano-aula/${plano.id}/editar`)
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-primary-600 dark:bg-slate-700 dark:text-slate-400 transition-colors"
                >
                    <HiPencil className="w-4 h-4" />
                </button>
                <PopConfirm
                    title="Excluir este plano?"
                    onConfirm={() => handleDelete(plano.id)}
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
                        {formatDateBR(plano.data_inicio)}
                    </span>
                    {showDisciplinaColumn && (
                        <Badge variant="outline" className="text-xs font-bold">
                            {plano.disciplina_detalhes?.sigla || 'DISC'}
                        </Badge>
                    )}
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-white line-clamp-2">
                    {plano.titulo}
                </h3>
            </div>

            <div className="mt-auto space-y-3">
                <div className="flex flex-wrap gap-1">
                    {plano.turmas_detalhes?.map(t => (
                        <Badge key={t.id} className="bg-slate-100 text-slate-600 border-none">
                            {t.numero}{t.letra}
                        </Badge>
                    ))}
                </div>
                {plano.habilidades_detalhes?.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">Habilidades:</p>
                        <div className="flex flex-wrap gap-1">
                            {plano.habilidades_detalhes.slice(0, 3).map(h => (
                                <span key={h.id} className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                    {h.codigo}
                                </span>
                            ))}
                            {plano.habilidades_detalhes.length > 3 && (
                                <span className="text-[10px] text-slate-400">+{plano.habilidades_detalhes.length - 3}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )

    // Estado vazio
    const EmptyState = () => (
        <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <HiBookOpen className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p>Nenhum plano cadastrado neste bimestre.</p>
        </div>
    )

    if (loading) return <Loading />

    return (
        <div className="space-y-6 animate-fade-in p-4 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Planos de Aula
                    </h1>
                    <p className="text-slate-500 text-sm">Gerencie o planejamento pedagógico</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={() => navigate('/plano-aula/novo')} variant="primary">
                        <HiPlus className="mr-1" /> Novo Plano
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <Card hover={false}>
                <div className="w-full sm:w-48">
                    <div className="w-full">
                        <label className="label">Bimestre</label>
                        <select
                            className="input"
                            value={bimestreSelecionado}
                            onChange={(e) => setBimestreSelecionado(e.target.value ? parseInt(e.target.value) : '')}
                        >
                            <option value="">Todos os Bimestres</option>
                            {BIMESTRES.map(b => (
                                <option key={b.value} value={b.value}>{b.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Conteúdo */}
            {planosFiltrados.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    {/* Mobile: Cards */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                        {planosFiltrados.map(plano => (
                            <PlanoAulaCard key={plano.id} plano={plano} />
                        ))}
                    </div>

                    {/* Desktop: Tabela */}
                    {/* Ordem: Período, Disciplina (condicional), Turmas, Título, Bimestre, Ações */}
                    <Card hover={false} className="hidden md:block overflow-hidden p-0">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Período</TableHeader>
                                    {showDisciplinaColumn && <TableHeader>Disciplina</TableHeader>}
                                    <TableHeader>Turmas</TableHeader>
                                    <TableHeader>Título</TableHeader>
                                    <TableHeader className="th-center">Bimestre</TableHeader>
                                    <TableHeader className="th-center">Ações</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {planosFiltrados.map((plano) => (
                                    <TableRow key={plano.id} className="group">
                                        <TableCell>
                                            <span className="text-sm text-slate-500 whitespace-nowrap">
                                                {formatDateBR(plano.data_inicio)}
                                            </span>
                                        </TableCell>
                                        {showDisciplinaColumn && (
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-bold">
                                                    {plano.disciplina_detalhes?.nome || 'DISC'}
                                                </Badge>
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                {plano.turmas_detalhes?.map(t => (
                                                    <Badge key={t.id} className="bg-slate-100 text-slate-600 border-none">
                                                        {t.numero}{t.letra}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div
                                                className="font-medium text-slate-800 dark:text-white cursor-pointer hover:text-primary-600 transition-colors"
                                                onClick={() => navigate(`/plano-aula/${plano.id}/editar`)}
                                            >
                                                {plano.titulo}
                                            </div>
                                        </TableCell>
                                        <TableCell className="td-center">
                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                {plano.bimestre}º Bim
                                            </span>
                                        </TableCell>
                                        <TableCell className="td-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => navigate(`/plano-aula/${plano.id}/editar`)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                                    title="Editar Plano"
                                                >
                                                    <HiPencil className="w-4 h-4" />
                                                </button>
                                                <PopConfirm
                                                    title="Excluir plano?"
                                                    onConfirm={() => handleDelete(plano.id)}
                                                >
                                                    <button
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
                                                        title="Excluir Plano"
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
