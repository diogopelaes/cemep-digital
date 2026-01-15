import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Card, Button, Loading, Badge, Table, TableHead, TableBody, TableRow,
    TableHeader, TableCell, PopConfirm, ActionSelect,
    TurmaBadge, BimestreBadge, DateDisplay, DisciplinaBadge,
    MobileActionRow, MobileActionButton
} from '../../components/ui'
import { HiPlus, HiPencil, HiTrash, HiCalendar, HiBookOpen, HiArrowNarrowRight } from 'react-icons/hi'
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

    const planosFiltrados = planos
        .filter(p =>
            bimestreSelecionado === '' || p.bimestre === parseInt(bimestreSelecionado)
        )
        .sort((a, b) => {
            // 1. Período (decrescente) - data_inicio
            if (a.data_inicio > b.data_inicio) return -1;
            if (a.data_inicio < b.data_inicio) return 1;

            // 2. Bimestre (decrescente)
            if (a.bimestre > b.bimestre) return -1;
            if (a.bimestre < b.bimestre) return 1;

            // 3. Disciplina (crescente)
            const discA = a.disciplina_detalhes?.nome || '';
            const discB = b.disciplina_detalhes?.nome || '';
            const discComp = discA.localeCompare(discB);
            if (discComp !== 0) return discComp;

            // 4. Turmas (crescente)
            // Cria uma string ordenada das turmas para comparação (ex: "1A,1B")
            const turmasA = (a.turmas_detalhes || []).map(t => `${t.numero}${t.letra} `).sort().join(',');
            const turmasB = (b.turmas_detalhes || []).map(t => `${t.numero}${t.letra} `).sort().join(',');
            const turmasComp = turmasA.localeCompare(turmasB);
            if (turmasComp !== 0) return turmasComp;

            // 5. Título (crescente)
            return (a.titulo || '').localeCompare(b.titulo || '');
        })

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
                            {/* Ícone contextual - link para edição */}
                            <div
                                className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => navigate(`/plano-aula/${plano.id}/editar`)}
                            >
                                <HiCalendar className="text-white h-6 w-6" />
                            </div>

                            {/* Informações */}
                            <div className="min-w-0 flex-1">
                                <h3
                                    className="font-bold text-slate-800 dark:text-white text-sm cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                                    onClick={() => navigate(`/plano-aula/${plano.id}/editar`)}
                                >
                                    {plano.titulo || 'Plano sem título'}
                                </h3>
                                <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 flex-wrap">
                                    <DisciplinaBadge sigla={plano.disciplina_detalhes?.sigla} />
                                    {bimestreSelecionado === '' && (
                                        <BimestreBadge bimestre={plano.bimestre} />
                                    )}
                                    <div className="flex items-center gap-1">
                                        <DateDisplay date={plano.data_inicio} />
                                        {plano.data_inicio !== plano.data_fim && (
                                            <>
                                                <HiArrowNarrowRight className="text-slate-400 dark:text-slate-500 w-3 h-3" />
                                                <DateDisplay date={plano.data_fim} />
                                            </>
                                        )}
                                    </div>
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

                    {/* Conteúdo */}
                    <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/50 flex flex-col gap-2.5">
                        {/* Turmas */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {plano.turmas_detalhes?.map(t => (
                                <TurmaBadge key={t.id} numero={t.numero} letra={t.letra} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* BARRA DE AÇÕES EXPANSÍVEL PADRONIZADA */}
                {plano.is_owner && (
                    <MobileActionRow isOpen={showActions}>
                        <MobileActionButton
                            icon={HiPencil}
                            label="Editar"
                            onClick={() => navigate(`/plano-aula/${plano.id}/editar`)}
                        />
                        <PopConfirm
                            title="Excluir este plano?"
                            onConfirm={() => handleDelete(plano.id)}
                            wrapperClassName="flex-1"
                        >
                            <MobileActionButton
                                icon={HiTrash}
                                label="Excluir"
                                variant="danger"
                                className="w-full"
                            />
                        </PopConfirm>
                    </MobileActionRow>
                )}
            </Card>
        )
    }

    // Estado vazio
    const EmptyState = () => (
        <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <HiBookOpen className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
                Nenhum plano encontrado
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
                Utilize o botão "Novo Plano" para começar.
            </p>
        </Card>
    )

    if (loading) return <Loading />

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        Planos de Aula
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie o planejamento pedagógico</p>
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
                <div className="flex flex-wrap gap-4">
                    <div className="w-full sm:w-48">
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
                    <div className="md:hidden space-y-4">
                        {planosFiltrados.map(plano => (
                            <PlanoAulaCard key={plano.id} plano={plano} />
                        ))}
                    </div>

                    {/* Desktop: Tabela */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Período</TableHeader>
                                    <TableHeader>Título</TableHeader>
                                    {showDisciplinaColumn && <TableHeader>Disciplina</TableHeader>}
                                    {bimestreSelecionado === '' && <TableHeader>Bimestre</TableHeader>}
                                    <TableHeader>Turmas</TableHeader>
                                    <TableHeader className="th-center font-bold text-primary-600 dark:text-primary-400">Ações</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {planosFiltrados.map((plano) => (
                                    <TableRow key={plano.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <DateDisplay date={plano.data_inicio} />
                                                <span className="text-slate-300">→</span>
                                                <DateDisplay date={plano.data_fim} />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div
                                                className="cursor-pointer group inline-block"
                                                onClick={() => navigate(`/plano-aula/${plano.id}/editar`)}
                                            >
                                                <p className="font-medium text-slate-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                    {plano.titulo}
                                                </p>
                                            </div>
                                        </TableCell>
                                        {showDisciplinaColumn && (
                                            <TableCell>
                                                <DisciplinaBadge sigla={plano.disciplina_detalhes?.sigla} />
                                            </TableCell>
                                        )}
                                        {bimestreSelecionado === '' && (
                                            <TableCell>
                                                <BimestreBadge bimestre={plano.bimestre} />
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                {plano.turmas_detalhes?.map(t => (
                                                    <TurmaBadge key={t.id} numero={t.numero} letra={t.letra} />
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="td-center">
                                            <PopConfirm
                                                title="Excluir Plano de Aula?"
                                                message="Esta ação não poderá ser desfeita."
                                                onConfirm={() => handleDelete(plano.id)}
                                            >
                                                <button
                                                    className="p-2 text-slate-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20"
                                                    title="Excluir Plano"
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
