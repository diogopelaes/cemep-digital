import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Card, Button, Loading, Badge, Table, TableHead, TableBody, TableRow,
    TableHeader, TableCell, PopConfirm, Select, ActionSelect,
    TurmaBadge, BimestreBadge, DateDisplay, DisciplinaBadge, TurmaPrimaryBadge,
    MobileActionRow, MobileActionButton
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
    const [atribuicaoSelecionada, setAtribuicaoSelecionada] = useState('')
    const [disciplinasCount, setDisciplinasCount] = useState(1)
    const [atribuicoes, setAtribuicoes] = useState([])

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

            // Salvar atribuições para filtro
            const atts = contextoRes.data.atribuicoes || []
            setAtribuicoes(atts)

            // Se só tem uma atribuição, seleciona automaticamente para o filtro
            if (atts.length === 1) {
                setAtribuicaoSelecionada(atts[0].id)
            }

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
        if (atribuicaoSelecionada && a.professor_disciplina_turma_id !== atribuicaoSelecionada) return false
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
                            {/* Ícone contextual - link para edição */}
                            <div
                                className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => navigate(`/aula-faltas/${aula.id}/editar`)}
                            >
                                <HiClipboardCheck className="text-white h-5 w-5" />
                            </div>

                            {/* Informações */}
                            <div className="min-w-0 flex-1">
                                <h3
                                    className="font-bold text-slate-800 dark:text-white text-sm cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                                    onClick={() => navigate(`/aula-faltas/${aula.id}/editar`)}
                                >
                                    {aula.turma_nome || `${aula.turma_numero}${aula.turma_letra}`}
                                </h3>
                                <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 flex-wrap">
                                    <DisciplinaBadge sigla={aula.disciplina_sigla} />
                                    {bimestreSelecionado === '' && (
                                        <BimestreBadge bimestre={aula.bimestre} />
                                    )}
                                    <DateDisplay date={aula.data} />
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
                    <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">
                                {aula.numero_aulas} {aula.numero_aulas > 1 ? 'AULAS' : 'AULA'}
                            </Badge>
                            <Badge variant={aula.total_faltas > 0 ? 'warning' : 'success'}>
                                FALTAS: {aula.total_faltas}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* BARRA DE AÇÕES EXPANSÍVEL PADRONIZADA */}
                <MobileActionRow isOpen={showActions}>
                    <MobileActionButton
                        icon={HiPencil}
                        label="Editar"
                        onClick={() => navigate(`/aula-faltas/${aula.id}/editar`)}
                    />
                    <PopConfirm
                        title="Excluir esta aula?"
                        onConfirm={() => handleDelete(aula.id)}
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
                    <Button
                        onClick={() => navigate('/aula-faltas/nova')}
                        variant="primary"
                        icon={HiPlus}
                        responsive
                    >
                        Nova Aula
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

                    {atribuicoes.length > 1 ? (
                        <div className="w-full sm:w-64">
                            <label className="label">Turma / Disciplina</label>
                            <select
                                className="input"
                                value={atribuicaoSelecionada}
                                onChange={(e) => setAtribuicaoSelecionada(e.target.value)}
                            >
                                <option value="">Todas</option>
                                {atribuicoes.map(atrib => (
                                    <option key={atrib.id} value={atrib.id}>
                                        {atrib.turma_numero}{atrib.turma_letra} - {atrib.disciplina_sigla}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        atribuicoes.length === 1 && (
                            <div className="flex flex-col justify-end pb-1">
                                <label className="label">Turma / Disciplina</label>
                                <div className="flex items-center gap-2 h-[42px]">
                                    <TurmaBadge numero={atribuicoes[0].turma_numero} letra={atribuicoes[0].turma_letra} />
                                    <span className="mx-1 text-slate-300">-</span>
                                    <DisciplinaBadge sigla={atribuicoes[0].disciplina_sigla} />
                                    <span className="text-[10px] text-slate-500 font-medium truncate max-w-[150px] hidden sm:block">
                                        {atribuicoes[0].turma_nome}
                                    </span>
                                </div>
                            </div>
                        )
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
                                    <TableHeader className="th-center">Estudantes com Faltas</TableHeader>
                                    <TableHeader className="th-center">Nº Aulas</TableHeader>
                                    <TableHeader className="th-center font-bold text-primary-600 dark:text-primary-400">Ações</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {aulasOrdenadas.map((aula) => (
                                    <TableRow key={aula.id}>
                                        <TableCell>
                                            <TurmaPrimaryBadge
                                                numero={aula.turma_numero}
                                                letra={aula.turma_letra}
                                                nome={aula.turma_nome}
                                                onClick={() => navigate(`/aula-faltas/${aula.id}/editar`)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <DateDisplay date={aula.data} />
                                        </TableCell>
                                        {showDisciplinaColumn && (
                                            <TableCell>
                                                <DisciplinaBadge sigla={aula.disciplina_sigla} />
                                            </TableCell>
                                        )}
                                        {bimestreSelecionado === '' && (
                                            <TableCell>
                                                <BimestreBadge bimestre={aula.bimestre} />
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
