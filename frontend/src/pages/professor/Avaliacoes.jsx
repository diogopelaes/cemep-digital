import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Card, Button, Loading, Badge, Table, TableHead, TableBody, TableRow,
    TableHeader, TableCell, PopConfirm, ActionSelect
} from '../../components/ui'
import { HiPlus, HiPencil, HiTrash, HiCalendar, HiClipboardList, HiCalculator } from 'react-icons/hi'
import { evaluationAPI, coreAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateShortBR } from '../../utils/date'

const BIMESTRES = [
    { value: 1, label: '1º Bimestre' },
    { value: 2, label: '2º Bimestre' },
    { value: 3, label: '3º Bimestre' },
    { value: 4, label: '4º Bimestre' },
]

const TIPOS = [
    { value: 'AVALIACAO_REGULAR', label: 'Regular' },
    { value: 'AVALIACAO_RECUPERACAO', label: 'Recuperação' },
    { value: 'AVALIACAO_EXTRA', label: 'Extra' },
]

export default function Avaliacoes() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [avaliacoes, setAvaliacoes] = useState([])
    const [anoLetivo, setAnoLetivo] = useState(null)
    const [bimestreSelecionado, setBimestreSelecionado] = useState('')
    const [tipoSelecionado, setTipoSelecionado] = useState('')

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
            const [avaliacoesRes, selecRes] = await Promise.all([
                evaluationAPI.avaliacoes.list({ page_size: 1000 }),
                coreAPI.anoLetivoSelecionado.get()
            ])

            setAvaliacoes(avaliacoesRes.data.results || [])

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
            await evaluationAPI.avaliacoes.delete(id)
            setAvaliacoes(avaliacoes.filter(a => a.id !== id))
            toast.success('Avaliação excluída')
        } catch (error) {
            if (error.response?.status === 403) {
                toast.error('Você não tem permissão para excluir esta avaliação.')
            } else {
                toast.error('Erro ao excluir')
            }
        }
    }

    // Filtrar avaliações
    const avaliacoesFiltradas = avaliacoes.filter(a => {
        if (bimestreSelecionado !== '' && a.bimestre !== parseInt(bimestreSelecionado)) return false
        if (tipoSelecionado && a.tipo !== tipoSelecionado) return false
        return true
    })

    // Ordenar por data desc
    const avaliacoesOrdenadas = [...avaliacoesFiltradas].sort((a, b) => {
        return new Date(b.data_inicio) - new Date(a.data_inicio)
    })

    // Badge de tipo
    const TipoBadge = ({ tipo }) => {
        const variants = {
            'AVALIACAO_REGULAR': 'primary',
            'AVALIACAO_RECUPERACAO': 'warning',
            'AVALIACAO_EXTRA': 'outline',
        }
        const labels = {
            'AVALIACAO_REGULAR': 'Regular',
            'AVALIACAO_RECUPERACAO': 'Recuperação',
            'AVALIACAO_EXTRA': 'Extra',
        }
        return <Badge variant={variants[tipo] || 'outline'}>{labels[tipo] || tipo}</Badge>
    }

    // Componente Card para Mobile
    const AvaliacaoCard = ({ avaliacao }) => {
        const [showActions, setShowActions] = useState(false)

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
                                className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-primary-500 flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => navigate(`/avaliacoes/${avaliacao.id}/editar`)}
                            >
                                <HiClipboardList className="text-white h-5 w-5" />
                            </div>

                            {/* Informações */}
                            <div className="min-w-0">
                                <h3
                                    className="font-bold text-slate-800 dark:text-white text-sm cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                                    onClick={() => navigate(`/avaliacoes/${avaliacao.id}/editar`)}
                                >
                                    {avaliacao.titulo}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                        <HiCalendar className="w-3 h-3" />
                                        {formatDateShortBR(avaliacao.data_inicio)}
                                    </span>
                                    <TipoBadge tipo={avaliacao.tipo} />
                                </div>
                            </div>
                        </div>

                        {/* BOTÃO PARA EXPANDIR AÇÕES */}
                        {avaliacao.is_owner && (
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
                        )}
                    </div>

                    {/* Resumo */}
                    <div className="mt-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="primary" className="text-[10px] px-1.5 py-0">
                                Valor: {parseFloat(avaliacao.valor).toFixed(1)}
                            </Badge>
                            {avaliacao.turmas_resumo?.slice(0, 2).map((t, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] px-1 py-0 uppercase font-bold">
                                    {t}
                                </Badge>
                            ))}
                            {avaliacao.turmas_resumo?.length > 2 && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0">
                                    +{avaliacao.turmas_resumo.length - 2}
                                </Badge>
                            )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                            Bimestre: {avaliacao.bimestre}º
                        </span>
                    </div>
                </div>

                {/* BARRA DE AÇÕES EXPANSÍVEL */}
                {avaliacao.is_owner && (
                    <div className={`
                        grid transition-all duration-300 ease-in-out border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30
                        ${showActions ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}
                    `}>
                        <div className="overflow-hidden grid grid-cols-3">
                            <button
                                onClick={() => navigate(`/avaliacoes/${avaliacao.id}/notas`)}
                                className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-success-600 dark:hover:text-success-400 transition-all border-r border-slate-100 dark:border-slate-800 active:scale-95"
                            >
                                <HiCalculator className="h-6 w-6" />
                                <span>Notas</span>
                            </button>

                            <button
                                onClick={() => navigate(`/avaliacoes/${avaliacao.id}/editar`)}
                                className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400 transition-all border-r border-slate-100 dark:border-slate-800 active:scale-95"
                            >
                                <HiPencil className="h-6 w-6" />
                                <span>Editar</span>
                            </button>

                            <div className="flex-1">
                                <PopConfirm
                                    title="Excluir esta avaliação?"
                                    onConfirm={() => handleDelete(avaliacao.id)}
                                >
                                    <button
                                        className="w-full py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-danger-600 dark:hover:text-danger-400 transition-all active:scale-95"
                                    >
                                        <HiTrash className="h-6 w-6" />
                                        <span>Excluir</span>
                                    </button>
                                </PopConfirm>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        )
    }

    // Estado vazio
    const EmptyState = () => (
        <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <HiClipboardList className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
                Nenhuma avaliação encontrada
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
                Nenhuma avaliação registrada neste período ou para os filtros selecionados.
            </p>
        </Card>
    )

    if (loading) return <Loading />

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        Avaliações
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie suas avaliações e provas</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={() => navigate('/avaliacoes/nova')} variant="primary">
                        <HiPlus className="sm:mr-1" />
                        <span className="hidden sm:inline">Nova Avaliação</span>
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
                        <label className="label">Tipo</label>
                        <select
                            className="input"
                            value={tipoSelecionado}
                            onChange={(e) => setTipoSelecionado(e.target.value)}
                        >
                            <option value="">Todos</option>
                            {TIPOS.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Conteúdo */}
            {avaliacoesOrdenadas.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    {/* Mobile: Cards */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                        {avaliacoesOrdenadas.map(avaliacao => (
                            <AvaliacaoCard key={avaliacao.id} avaliacao={avaliacao} />
                        ))}
                    </div>

                    {/* Desktop: Tabela */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Título</TableHeader>
                                    <TableHeader>Tipo</TableHeader>
                                    <TableHeader>Turma(s)</TableHeader>
                                    <TableHeader className="th-center">Valor</TableHeader>
                                    <TableHeader>Data</TableHeader>
                                    {bimestreSelecionado === '' && <TableHeader>Bimestre</TableHeader>}
                                    <TableHeader className="th-center font-bold text-primary-600 dark:text-primary-400">Ações</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {avaliacoesOrdenadas.map((avaliacao) => (
                                    <TableRow key={avaliacao.id}>
                                        <TableCell>
                                            <div
                                                className="cursor-pointer group inline-block"
                                                onClick={() => navigate(`/avaliacoes/${avaliacao.id}/editar`)}
                                            >
                                                <p className="font-medium text-slate-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                    {avaliacao.titulo}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <TipoBadge tipo={avaliacao.tipo} />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {avaliacao.turmas_resumo?.slice(0, 2).map((t, i) => (
                                                    <Badge key={i} variant="outline" className="text-xs font-bold">
                                                        {t}
                                                    </Badge>
                                                ))}
                                                {avaliacao.turmas_resumo?.length > 2 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{avaliacao.turmas_resumo.length - 2}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="td-center">
                                            <span className="font-semibold text-primary-600 dark:text-primary-400">
                                                {parseFloat(avaliacao.valor).toFixed(1)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-slate-500 whitespace-nowrap font-medium">
                                                {formatDateShortBR(avaliacao.data_inicio)}
                                                {avaliacao.data_fim !== avaliacao.data_inicio && (
                                                    <> - {formatDateShortBR(avaliacao.data_fim)}</>
                                                )}
                                            </span>
                                        </TableCell>
                                        {bimestreSelecionado === '' && (
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-semibold">
                                                    {avaliacao.bimestre ? `${avaliacao.bimestre}º Bim` : '-'}
                                                </Badge>
                                            </TableCell>
                                        )}
                                        <TableCell className="td-center">
                                            {avaliacao.is_owner ? (
                                                <ActionSelect
                                                    size="sm"
                                                    actions={[
                                                        {
                                                            label: 'Digitar Notas',
                                                            icon: HiCalculator,
                                                            onClick: () => navigate(`/avaliacoes/${avaliacao.id}/notas`),
                                                            variant: 'success' // Opcional, se o componente suportar, senão fica padrão
                                                        },
                                                        {
                                                            label: 'Editar Avaliação',
                                                            icon: HiPencil,
                                                            onClick: () => navigate(`/avaliacoes/${avaliacao.id}/editar`)
                                                        },
                                                        {
                                                            label: 'Excluir',
                                                            icon: HiTrash,
                                                            danger: true,
                                                            popConfirm: {
                                                                title: "Excluir Avaliação?",
                                                                message: "Esta ação não poderá ser desfeita.",
                                                                onConfirm: () => handleDelete(avaliacao.id)
                                                            }
                                                        }
                                                    ]}
                                                />
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
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
