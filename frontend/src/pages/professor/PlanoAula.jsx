import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Card, Button, Loading, Badge, Table, TableHead, TableBody, TableRow,
    TableHeader, TableCell, PopConfirm, ActionSelect
} from '../../components/ui'
import { HiPlus, HiPencil, HiTrash, HiCalendar, HiBookOpen } from 'react-icons/hi'
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
    const PlanoAulaCard = ({ plano }) => {
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
                                className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => navigate(`/plano-aula/${plano.id}/editar`)}
                            >
                                <HiBookOpen className="text-white h-5 w-5" />
                            </div>

                            {/* Informações */}
                            <div className="min-w-0">
                                <h3
                                    className="font-bold text-slate-800 dark:text-white text-sm cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                                    onClick={() => navigate(`/plano-aula/${plano.id}/editar`)}
                                >
                                    {plano.titulo}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                        <HiCalendar className="w-3 h-3" />
                                        {formatDateShortBR(plano.data_inicio)} — {formatDateShortBR(plano.data_fim)}
                                    </span>
                                    {showDisciplinaColumn && (
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase font-bold border-slate-200 dark:border-slate-700">
                                            {plano.disciplina_detalhes?.sigla || 'DISC'}
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

                    {/* Turmas Vinculadas */}
                    <div className="mt-4 flex flex-wrap gap-1">
                        {plano.turmas_detalhes?.map(t => (
                            <Badge key={t.id} variant="outline" className="text-[10px] px-1.5 py-0 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                {t.numero}{t.letra}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* BARRA DE AÇÕES EXPANSÍVEL */}
                <div className={`
                    grid transition-all duration-300 ease-in-out border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30
                    ${showActions ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}
                `}>
                    <div className="overflow-hidden grid grid-cols-2">
                        <button
                            onClick={() => navigate(`/plano-aula/${plano.id}/editar`)}
                            className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400 transition-all border-r border-slate-100 dark:border-slate-800"
                        >
                            <HiPencil className="h-5 w-5" />
                            <span>Editar</span>
                        </button>

                        <div className="flex-1">
                            <PopConfirm
                                title="Excluir este plano?"
                                onConfirm={() => handleDelete(plano.id)}
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

                <div className="flex items-center gap-2">
                    <Button onClick={() => navigate('/plano-aula/novo')} variant="primary">
                        <HiPlus className="sm:mr-1" />
                        <span className="hidden sm:inline">Novo Plano</span>
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
                                                {formatDateShortBR(plano.data_inicio)} a {formatDateShortBR(plano.data_fim)}
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
                                            <ActionSelect
                                                size="sm"
                                                actions={[
                                                    {
                                                        label: 'Editar Plano',
                                                        icon: HiPencil,
                                                        onClick: () => navigate(`/plano-aula/${plano.id}/editar`)
                                                    },
                                                    {
                                                        label: 'Excluir Plano',
                                                        icon: HiTrash,
                                                        variant: 'danger',
                                                        confirm: {
                                                            title: 'Excluir Plano de Aula?',
                                                            message: 'Esta ação não poderá ser desfeita.'
                                                        },
                                                        onClick: () => handleDelete(plano.id)
                                                    }
                                                ]}
                                            />
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
