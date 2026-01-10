import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    Card, Table, TableHead, TableBody, TableRow,
    TableHeader, TableCell, TableEmpty, Loading, Badge
} from '../../components/ui'
import { HiUserGroup, HiTable, HiPhotograph } from 'react-icons/hi'
import { FaFilePdf } from 'react-icons/fa'
import { coreAPI, academicAPI } from '../../services/api'
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
            const response = await coreAPI.minhasTurmas.list()
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
    const TurmaCard = ({ turma }) => (
        <Card
            padding={false}
            className="p-3 overflow-hidden"
        >
            <div className="flex items-start gap-3">
                {/* Avatar da Turma - clicável */}
                <div
                    className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => navigate(`/minhas-turmas/${turma.id}`)}
                >
                    <span className="text-white font-bold text-sm">
                        {turma.numero}{turma.letra}
                    </span>
                </div>

                {/* Informações */}
                <div className="flex-1 min-w-0">
                    {/* Nome - clicável */}
                    <h3
                        className="font-semibold text-slate-800 dark:text-white text-sm cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                        onClick={() => navigate(`/minhas-turmas/${turma.id}`)}
                    >
                        {formatTurmaNome(turma)}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {turma.curso?.nome || 'Curso não definido'}
                    </p>

                    {/* Disciplinas e Ações */}
                    <div className="flex items-center flex-wrap gap-1 mt-2">
                        {turma.disciplinas_lecionadas?.map((disc, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0">
                                {disc.sigla}
                            </Badge>
                        ))}

                        {/* Contador de estudantes */}
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <HiUserGroup className="h-3 w-3" />
                            {turma.estudantes_count || 0}
                        </span>

                        {/* Ações */}
                        <Link
                            to={`/turmas/${turma.id}/carometro`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            title="Carômetro"
                        >
                            <HiPhotograph className="h-3.5 w-3.5" />
                        </Link>
                        <button
                            onClick={(e) => handleGerarLista(turma, e)}
                            disabled={generatingPDF === turma.id}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors disabled:opacity-50"
                            title="Lista de Estudantes (PDF)"
                        >
                            {generatingPDF === turma.id ? <Loading size="sm" /> : <FaFilePdf className="h-3.5 w-3.5" />}
                        </button>
                        <Link
                            to={`/grade-turma/${turma.ano_letivo}/${turma.numero}/${turma.letra}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            title="Grade Horária"
                        >
                            <HiTable className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </div>
        </Card>
    )

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
                    <Card hover={false} className="hidden md:block">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Turma</TableHeader>
                                    <TableHeader>Curso</TableHeader>
                                    <TableHeader>Disciplinas</TableHeader>
                                    <TableHeader className="th-center">Estudantes</TableHeader>
                                    <TableHeader className="th-center">Lista</TableHeader>
                                    <TableHeader className="th-center">Carômetro</TableHeader>
                                    <TableHeader className="th-center">Grade</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {turmas.map((turma) => (
                                    <TableRow key={turma.id}>
                                        <TableCell>
                                            <div
                                                className="flex items-center gap-3 cursor-pointer group"
                                                onClick={() => navigate(`/minhas-turmas/${turma.id}`)}
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                                    <span className="text-white font-bold text-sm">
                                                        {turma.numero}{turma.letra}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                        {formatTurmaNome(turma)}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                {turma.curso?.nome || 'Curso não definido'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                {turma.disciplinas_lecionadas?.map((disc, idx) => (
                                                    <Badge key={idx} variant="outline" className="text-xs">
                                                        {disc.sigla}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="td-center">
                                            <Link
                                                to={`/minhas-turmas/${turma.id}`}
                                                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                            >
                                                <HiUserGroup className="h-4 w-4" />
                                                <span>{turma.estudantes_count || 0}</span>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="td-center">
                                            <button
                                                onClick={(e) => handleGerarLista(turma, e)}
                                                disabled={generatingPDF === turma.id}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors disabled:opacity-50"
                                                title="Lista de Estudantes (PDF)"
                                            >
                                                {generatingPDF === turma.id ? <Loading size="sm" /> : <FaFilePdf className="h-4 w-4" />}
                                            </button>
                                        </TableCell>
                                        <TableCell className="td-center">
                                            <Link
                                                to={`/turmas/${turma.id}/carometro`}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                                title="Visualizar Carômetro"
                                            >
                                                <HiPhotograph className="h-5 w-5" />
                                            </Link>
                                        </TableCell>
                                        <TableCell className="td-center">
                                            <Link
                                                to={`/grade-turma/${turma.ano_letivo}/${turma.numero}/${turma.letra}`}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                                title="Ver Grade Horária"
                                            >
                                                <HiTable className="h-5 w-5" />
                                            </Link>
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
