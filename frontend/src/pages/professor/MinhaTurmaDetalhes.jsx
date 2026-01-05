import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Card, Table, TableHead, TableBody, TableRow,
    TableHeader, TableCell, TableEmpty, Loading, Button, Badge, Avatar
} from '../../components/ui'
import { HiPhotograph, HiUserGroup, HiDuplicate } from 'react-icons/hi'
import { FaFilePdf } from 'react-icons/fa'
import { coreAPI, academicAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { formatDateBR } from '../../utils/date'
import { generateListaTurmaPDF } from '../../utils/pdf'

/**
 * MinhaTurmaDetalhes - Detalhes de uma turma para o Professor
 * 
 * Exibe informações da turma e lista de estudantes.
 * Modo somente leitura - sem opções de editar.
 * 
 * Layout responsivo:
 * - Mobile: Cards compactos + lista de estudantes em cards
 * - Desktop: Cards em grid + tabela de estudantes
 */
export default function MinhaTurmaDetalhes() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [turma, setTurma] = useState(null)
    const [estudantes, setEstudantes] = useState([])
    const [generatingPDF, setGeneratingPDF] = useState(false)

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

    // Copiar email
    const handleCopyEmail = (email, e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(email)
        toast.success('Email copiado!')
    }

    const handleGerarLista = async () => {
        if (!turma || estudantes.length === 0) return
        setGeneratingPDF(true)
        try {
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
            setGeneratingPDF(false)
        }
    }

    // Card de estudante para mobile
    const EstudanteCard = ({ matricula }) => {
        const estudante = matricula.matricula_cemep?.estudante
        const usuario = estudante?.usuario
        const email = usuario?.email

        return (
            <Card padding={false} className="p-3 overflow-hidden">
                <div className="flex items-center gap-3">
                    {/* Avatar clicável */}
                    <Avatar
                        name={usuario?.first_name}
                        size="md"
                        className="shrink-0 cursor-pointer"
                        onClick={() => navigate(`/estudantes/${estudante?.id}`)}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        {/* Nome clicável */}
                        <div className="flex items-center gap-2">
                            <h3
                                className="font-semibold text-slate-800 dark:text-white text-sm cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                                onClick={() => navigate(`/estudantes/${estudante?.id}`)}
                            >
                                {usuario?.first_name || 'Nome não disponível'}
                            </h3>
                            {estudante?.nome_social && (
                                <span className="text-[10px] text-primary-500 font-medium bg-primary-50 dark:bg-primary-900/20 px-1 py-0.5 rounded shrink-0">
                                    Social
                                </span>
                            )}
                        </div>

                        {/* Email com copiar */}
                        {email && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {email.length > 24 ? email.substring(0, 24) + '...' : email}
                                </p>
                                <button
                                    onClick={(e) => handleCopyEmail(email, e)}
                                    className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-600 transition-colors"
                                    title="Copiar email"
                                >
                                    <HiDuplicate className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Status */}
                        <div className="flex items-center gap-2 mt-1">
                            <Badge
                                variant={matricula.status === 'CURSANDO' ? 'success' : 'default'}
                                className="text-[10px] px-1.5 py-0"
                            >
                                {matricula.status_display || matricula.status}
                            </Badge>
                            <span className="text-[10px] text-slate-400">
                                {matricula.matricula_cemep?.numero_matricula_formatado ||
                                    matricula.matricula_cemep?.numero_matricula}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>
        )
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
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header - com disciplinas inline */}
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-3xl font-bold text-slate-800 dark:text-white truncate">
                        {turma.nome}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {turma.curso?.nome}
                    </p>

                    {/* Disciplinas que leciona */}
                    {turma.disciplinas_lecionadas?.length > 0 && (
                        <div className="flex items-center flex-wrap gap-1.5 mt-2">
                            {turma.disciplinas_lecionadas.map((disc, idx) => (
                                <Badge key={idx} variant="primary" className="text-xs">
                                    <span className="sm:hidden">{disc.sigla}</span>
                                    <span className="hidden sm:inline">{disc.nome}</span>
                                </Badge>
                            ))}
                        </div>
                    )}

                </div>
                <div className="flex gap-2 shrink-0">
                    <Button
                        variant="secondary"
                        icon={FaFilePdf}
                        onClick={handleGerarLista}
                        disabled={generatingPDF || estudantes.length === 0}
                        loading={generatingPDF}
                        className="shrink-0"
                        title="Lista de Estudantes (PDF)"
                    >
                        <span className="hidden sm:inline">Lista PDF</span>
                    </Button>
                    <Button
                        variant="primary"
                        icon={HiPhotograph}
                        onClick={() => navigate(`/turmas/${id}/carometro`)}
                        className="shrink-0"
                    >
                        <span className="hidden sm:inline">Carômetro</span>
                    </Button>
                </div>
            </div>

            {/* Lista de Estudantes */}
            {estudantes.length === 0 ? (
                <Card className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <HiUserGroup className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
                        Nenhum estudante matriculado
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                        Esta turma ainda não possui estudantes matriculados
                    </p>
                </Card>
            ) : (
                <>
                    {/* Mobile: Cards */}
                    <div className="md:hidden space-y-2">
                        <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 px-1">
                            {estudantes.length} estudante{estudantes.length !== 1 ? 's' : ''}
                        </h2>
                        {estudantes.map((matricula) => (
                            <EstudanteCard key={matricula.id} matricula={matricula} />
                        ))}
                    </div>

                    {/* Desktop: Tabela */}
                    <Card hover={false} className="hidden md:block">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                                Estudantes da Turma ({estudantes.length})
                            </h2>
                        </div>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Nome</TableHeader>
                                    <TableHeader>Email</TableHeader>
                                    <TableHeader>Data Nasc.</TableHeader>
                                    <TableHeader>Status</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {estudantes.map((matricula) => {
                                    const estudante = matricula.matricula_cemep?.estudante
                                    const usuario = estudante?.usuario
                                    return (
                                        <TableRow key={matricula.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3 group">
                                                    <Avatar
                                                        name={usuario?.first_name}
                                                        size="md"
                                                        onClick={() => navigate(`/estudantes/${estudante?.id}`)}
                                                    />
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
                                                <div className="flex items-center gap-2 max-w-[200px]">
                                                    <span className="truncate" title={usuario?.email}>
                                                        {usuario?.email || '-'}
                                                    </span>
                                                    {usuario?.email && (
                                                        <button
                                                            onClick={(e) => handleCopyEmail(usuario.email, e)}
                                                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-600 transition-colors shrink-0"
                                                            title="Copiar email"
                                                        >
                                                            <HiDuplicate className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                                    {formatDateBR(estudante?.data_nascimento)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={matricula.status === 'CURSANDO' ? 'success' : 'default'}
                                                >
                                                    {matricula.status_display || matricula.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                </>
            )}
        </div>
    )
}
