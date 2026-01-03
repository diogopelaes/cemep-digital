import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
    Card, Table, TableHead, TableBody, TableRow,
    TableHeader, TableCell, TableEmpty, Loading, Button, Badge
} from '../../components/ui'
import { HiUser } from 'react-icons/hi'
import { coreAPI, academicAPI } from '../../services/api'
import toast from 'react-hot-toast'

/**
 * MinhaTurmaDetalhes - Detalhes de uma turma para o Professor
 * 
 * Exibe informações da turma e lista de estudantes.
 * Modo somente leitura - sem opções de editar.
 */
export default function MinhaTurmaDetalhes() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [turma, setTurma] = useState(null)
    const [estudantes, setEstudantes] = useState([])

    useEffect(() => {
        loadData()
    }, [id])

    const loadData = async () => {
        setLoading(true)
        try {
            const [turmaRes, estudantesRes] = await Promise.all([
                coreAPI.minhasTurmas.get(id),
                academicAPI.matriculasTurma.list({ turma_id: id })
            ])

            setTurma(turmaRes.data)
            setEstudantes(estudantesRes.data.results || estudantesRes.data || [])
        } catch (error) {
            if (error.response?.status === 403) {
                toast.error('Você não tem acesso a esta turma')
                navigate('/minhas-turmas')
            } else {
                toast.error('Erro ao carregar dados da turma')
            }
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loading size="lg" />
            </div>
        )
    }

    if (!turma) {
        return null
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">

                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                            {turma.nome}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            {turma.curso?.nome} • {turma.ano_letivo}
                        </p>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card hover={false} className="p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Estudantes</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                        {estudantes.length}
                    </p>
                </Card>
                <Card hover={false} className="p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Curso</p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-white">
                        {turma.curso?.sigla || '-'}
                    </p>
                </Card>
                <Card hover={false} className="p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ano Letivo</p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-white">
                        {turma.ano_letivo}
                    </p>
                </Card>
                <Card hover={false} className="p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Suas Disciplinas</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {turma.disciplinas_lecionadas?.length > 0 ? (
                            turma.disciplinas_lecionadas.map((disc, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                    {disc.sigla}
                                </Badge>
                            ))
                        ) : (
                            <span className="text-sm text-slate-400">-</span>
                        )}
                    </div>
                </Card>
            </div>

            {/* Lista de Estudantes */}
            <Card hover={false}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                        Estudantes da Turma
                    </h2>
                </div>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeader>Nome</TableHeader>
                            <TableHeader>Matrícula</TableHeader>
                            <TableHeader>Status</TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {estudantes.length > 0 ? (
                            estudantes.map((matricula) => {
                                const estudante = matricula.matricula_cemep?.estudante
                                const usuario = estudante?.usuario
                                return (
                                    <TableRow key={matricula.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3 group">
                                                <button
                                                    onClick={() => navigate(`/estudantes/${estudante?.id}`)}
                                                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center hover:scale-105 transition-all shadow-sm"
                                                >
                                                    {usuario?.foto ? (
                                                        <img
                                                            src={usuario.foto}
                                                            alt={usuario.first_name}
                                                            className="w-full h-full object-cover rounded-full"
                                                        />
                                                    ) : (
                                                        <HiUser className="text-white w-5 h-5" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/estudantes/${estudante?.id}`)}
                                                    className="text-left"
                                                >
                                                    <p className="font-medium text-slate-800 dark:text-white group-hover:text-primary-500 transition-colors">
                                                        {usuario?.first_name || 'Nome não disponível'}
                                                    </p>
                                                    {estudante?.nome_social && (
                                                        <p className="text-xs text-slate-500">
                                                            Nome Social
                                                        </p>
                                                    )}
                                                </button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                {matricula.matricula_cemep?.numero_matricula_formatado ||
                                                    matricula.matricula_cemep?.numero_matricula || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={matricula.status === '1' ? 'success' : 'default'}
                                            >
                                                {matricula.status_display || matricula.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableEmpty
                                colSpan={3}
                                message="Nenhum estudante matriculado nesta turma"
                            />
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
