import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    Card, Table, TableHead, TableBody, TableRow,
    TableHeader, TableCell, TableEmpty, Loading, Pagination, Badge
} from '../../components/ui'
import { HiUserGroup, HiTable, HiPhotograph } from 'react-icons/hi'
import { coreAPI } from '../../services/api'
import toast from 'react-hot-toast'

/**
 * MinhasTurmas - Página exclusiva para Professores
 * 
 * Exibe apenas as turmas onde o professor leciona no ano letivo selecionado.
 * Modo somente leitura - sem opções de criar ou editar turmas.
 */
export default function MinhasTurmas() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [turmas, setTurmas] = useState([])

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

            {/* Tabela de Turmas */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loading size="lg" />
                </div>
            ) : (
                <Card hover={false}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Turma</TableHeader>
                                <TableHeader>Curso</TableHeader>
                                <TableHeader>Disciplinas</TableHeader>
                                <TableHeader>Estudantes</TableHeader>
                                <TableHeader>Carômetro</TableHeader>
                                <TableHeader>Grade Horária</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {turmas.length > 0 ? (
                                turmas.map((turma) => (
                                    <TableRow key={turma.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => navigate(`/minhas-turmas/${turma.id}`)}
                                                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all"
                                                >
                                                    <span className="text-white font-bold text-sm">
                                                        {turma.numero}{turma.letra}
                                                    </span>
                                                </button>
                                                <div>
                                                    <button
                                                        onClick={() => navigate(`/minhas-turmas/${turma.id}`)}
                                                        className="font-medium text-left text-link-subtle"
                                                    >
                                                        {formatTurmaNome(turma)}
                                                    </button>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                {turma.curso?.nome || 'Curso não definido'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {turma.disciplinas_lecionadas?.map((disc, idx) => (
                                                    <Badge key={idx} variant="outline" className="text-xs">
                                                        {disc.sigla}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                to={`/minhas-turmas/${turma.id}`}
                                                className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                            >
                                                <HiUserGroup className="h-4 w-4" />
                                                <span>{turma.estudantes_count || 0}</span>
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center">
                                                <Link
                                                    to={`/turmas/${turma.id}/carometro`}
                                                    className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-primary-400 transition-colors"
                                                    title="Visualizar Carômetro"
                                                >
                                                    <HiPhotograph className="h-5 w-5" />
                                                </Link>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {temGradeHoraria(turma) ? (
                                                <Link
                                                    to={`/minhas-turmas/${turma.id}`}
                                                    state={{ tab: 'gradeHoraria' }}
                                                    className="flex items-center justify-center w-8 h-8 rounded-lg text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 transition-colors"
                                                    title="Ver Grade Horária"
                                                >
                                                    <HiTable className="h-5 w-5" />
                                                </Link>
                                            ) : (
                                                <span className="text-sm text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableEmpty
                                    colSpan={4}
                                    message="Você não leciona em nenhuma turma no ano letivo selecionado"
                                />
                            )}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    )
}
