import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    Card, Table, TableHead, TableBody, TableRow,
    TableHeader, TableCell, TableEmpty, Loading, Badge, ActionSelect,
    TurmaBadge, DisciplinaBadge, TurmaPrimaryBadge,
    MobileActionRow, MobileActionButton
} from '../../components/ui'
import { HiUserGroup, HiTable, HiPhotograph } from 'react-icons/hi'
import { FaFilePdf } from 'react-icons/fa'
import { pedagogicalAPI, academicAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { generateListaTurmaPDF } from '../../utils/pdf'
import { formatDateBR } from '../../utils/date'

/**
 * MinhasTurmas - Página exclusiva para Professores
 * 
 * Exibe apenas as turmas onde o professor leciona no ano letivo selecionado.
 * Modo somente leitura - sem opções de criar ou editar turmas.
 * 
 * Layout responsivo:
 * - Mobile: Cards empilhados
 * - Desktop: Tabela tradicional
 */
export default function MinhasTurmas() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [turmas, setTurmas] = useState([])
    const [generatingPDF, setGeneratingPDF] = useState(null)

    useEffect(() => {
        loadTurmas()
    }, [])

    const loadTurmas = async () => {
        setLoading(true)
        try {
            const response = await pedagogicalAPI.minhasTurmas.list()
            setTurmas(response.data.results || [])
        } catch (error) {
            if (error.response?.status !== 403) {
                toast.error('Erro ao carregar turmas')
            }
        }
        setLoading(false)
    }

    const formatTurmaNome = (turma) => turma.nome

    // Verifica se a turma tem grade horária configurada
    const temGradeHoraria = (turma) => {
        return turma.validades_grade && turma.validades_grade.length > 0
    }

    const handleGerarLista = async (turma, e) => {
        e.preventDefault()
        e.stopPropagation()
        setGeneratingPDF(turma.id)
        try {
            const response = await academicAPI.matriculasTurma.list({ turma: turma.id, page_size: 1000 })
            const estudantes = response.data.results || response.data

            const listaEstudantes = estudantes.map(m => {
                const est = m.matricula_cemep?.estudante
                return {
                    nome: est.nome_exibicao || est.usuario?.first_name || est.nome_social,
                    matricula: m.matricula_cemep?.numero_matricula_formatado || m.matricula_cemep?.numero_matricula,
                    data_nascimento: formatDateBR(est.data_nascimento),
                    email: est.usuario?.email,
                    status: m.status_display || m.status
                }
            })

            await generateListaTurmaPDF(turma, listaEstudantes)
            toast.success('Lista gerada com sucesso!')
        } catch (error) {
            console.error(error)
            toast.error('Erro ao gerar lista')
        } finally {
            setGeneratingPDF(null)
        }
    }

    // Componente de Card para Mobile
    const TurmaCard = ({ turma }) => {
        const [showActions, setShowActions] = useState(false);

        return (
            <Card
                padding={false}
                className="overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm transition-all duration-300"
            >
                <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                            {/* Avatar da Turma - clicável */}
                            <TurmaBadge
                                numero={turma.numero}
                                letra={turma.letra}
                                onClick={() => navigate(`/minhas-turmas/${turma.id}`)}
                            />

                            {/* Informações */}
                            <div className="min-w-0">
                                <h3
                                    className="font-bold text-slate-800 dark:text-white text-sm cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                                    onClick={() => navigate(`/minhas-turmas/${turma.id}`)}
                                >
                                    {formatTurmaNome(turma)}
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium mt-1">
                                    {turma.curso?.nome || 'Curso não definido'}
                                </p>
                            </div>
                        </div>

                        {/* BOTÃO BADGE PARA EXPANDIR AÇÕES */}
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

                    {/* Rodapé do Card: Disciplinas e Alunos */}
                    <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                            {turma.disciplinas_lecionadas?.map((disc, idx) => (
                                <DisciplinaBadge key={idx} sigla={disc.sigla} />
                            ))}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 h-5 px-2 rounded-lg uppercase tracking-wider">
                            <HiUserGroup className="h-3.5 w-3.5 text-primary-500" />
                            <span>{turma.estudantes_count || 0}</span>
                        </div>
                    </div>
                </div>

                {/* BARRA DE AÇÕES EXPANSÍVEL PADRONIZADA */}
                <MobileActionRow isOpen={showActions}>
                    <MobileActionButton
                        icon={FaFilePdf}
                        label="PDF"
                        onClick={(e) => handleGerarLista(turma, e)}
                        disabled={generatingPDF === turma.id}
                    />
                    <MobileActionButton
                        icon={HiPhotograph}
                        label="Fotos"
                        onClick={() => navigate(`/turmas/${turma.id}/carometro`)}
                    />
                    <MobileActionButton
                        icon={HiTable}
                        label="Grade"
                        onClick={() => navigate(`/grade-turma/${turma.ano_letivo}/${turma.numero}/${turma.letra}`)}
                    />
                </MobileActionRow>
            </Card>
        )
    }

    // Estado vazio
    const EmptyState = () => (
        <Card className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <HiUserGroup className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
                Nenhuma turma encontrada
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
                Você não leciona em nenhuma turma no ano letivo selecionado
            </p>
        </Card>
    )

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        Minhas Turmas
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Turmas onde você leciona no ano letivo selecionado
                    </p>
                </div>
            </div>

            {/* Conteúdo */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loading size="lg" />
                </div>
            ) : turmas.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    {/* Mobile: Cards */}
                    <div className="md:hidden space-y-3">
                        {turmas.map((turma) => (
                            <TurmaCard key={turma.id} turma={turma} />
                        ))}
                    </div>

                    {/* Desktop: Tabela */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Turma</TableHeader>
                                    <TableHeader>Curso</TableHeader>
                                    <TableHeader>Disciplinas</TableHeader>
                                    <TableHeader className="th-center">Estudantes</TableHeader>
                                    <TableHeader className="th-center font-bold text-primary-600 dark:text-primary-400">Ações</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {turmas.map((turma) => (
                                    <TableRow key={turma.id}>
                                        <TableCell>
                                            <TurmaPrimaryBadge
                                                numero={turma.numero}
                                                letra={turma.letra}
                                                nome={formatTurmaNome(turma)}
                                                onClick={() => navigate(`/minhas-turmas/${turma.id}`)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                {turma.curso?.nome || 'Curso não definido'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                {turma.disciplinas_lecionadas?.map((disc, idx) => (
                                                    <DisciplinaBadge key={idx} sigla={disc.sigla} />
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="td-center">
                                            <Link
                                                to={`/minhas-turmas/${turma.id}`}
                                                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium"
                                            >
                                                <HiUserGroup className="h-4 w-4" />
                                                <span>{turma.estudantes_count || 0}</span>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="td-center">
                                            <ActionSelect
                                                size="sm"
                                                actions={[
                                                    {
                                                        label: 'Lista em PDF',
                                                        icon: FaFilePdf,
                                                        disabled: generatingPDF === turma.id,
                                                        onClick: (e) => handleGerarLista(turma, e)
                                                    },
                                                    {
                                                        label: 'Fotos',
                                                        icon: HiPhotograph,
                                                        onClick: () => navigate(`/turmas/${turma.id}/carometro`)
                                                    },
                                                    {
                                                        label: 'Grade da Turma',
                                                        icon: HiTable,
                                                        onClick: () => navigate(`/grade-turma/${turma.ano_letivo}/${turma.numero}/${turma.letra}`)
                                                    }
                                                ]}
                                            />
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
