import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    Card, Button, Badge, Loading, Modal, ModalFooter, Table, TableHead, TableBody, TableRow, TableHeader, TableCell
} from '../components/ui'
import {
    HiArrowLeft, HiPencil, HiPrinter, HiDownload, HiPhone, HiMail,
    HiLocationMarker, HiCalendar, HiUser, HiIdentification, HiBriefcase, HiRefresh
} from 'react-icons/hi'
import { coreAPI } from '../services/api'
import { formatDateBR } from '../utils/date'
import {
    createPDF, addHeader, addFooter, addSectionTitle, addField,
    addTable, checkNewPage, downloadPDF, openPDF, CONFIG
} from '../utils/pdf'
import toast from 'react-hot-toast'

// Configuração de cores por tipo de usuário
const TIPO_COLORS = {
    GESTAO: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    SECRETARIA: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    PROFESSOR: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    MONITOR: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

export default function FuncionarioDetalhes() {
    const navigate = useNavigate()
    const { id } = useParams()

    const [loading, setLoading] = useState(true)
    const [funcionario, setFuncionario] = useState(null)
    const [periodos, setPeriodos] = useState([])
    const [generatingPDF, setGeneratingPDF] = useState(false)

    // Modal de Reset de Senha
    const [modalReset, setModalReset] = useState({ open: false })
    const [loadingReset, setLoadingReset] = useState(false)

    useEffect(() => {
        loadData()
    }, [id])

    const loadData = async () => {
        try {
            const [respFunc, respPeriodos] = await Promise.all([
                coreAPI.funcionarios.get(id),
                coreAPI.periodosTrabalho.list({ funcionario: id })
            ])
            setFuncionario(respFunc.data)
            setPeriodos(respPeriodos.data.results || respPeriodos.data)
        } catch (error) {
            toast.error('Erro ao carregar dados do funcionário')
            navigate('/funcionarios')
        }
        setLoading(false)
    }

    const handleResetSenha = async () => {
        setLoadingReset(true)
        try {
            const response = await coreAPI.funcionarios.resetarSenha(id)
            toast.success(response.data.message)
            setModalReset({ open: false })
        } catch (error) {
            const msg = error.response?.data?.detail || 'Erro ao resetar senha'
            toast.error(msg)
        }
        setLoadingReset(false)
    }

    const gerarPDF = async (download = true) => {
        if (!funcionario) return

        setGeneratingPDF(true)
        try {
            const doc = createPDF()
            const pageWidth = doc.internal.pageSize.getWidth()

            // Cabeçalho
            let y = addHeader(doc, 'Ficha do Funcionário', funcionario.nome_completo || funcionario.usuario?.first_name)

            // === DADOS PESSOAIS ===
            y = addSectionTitle(doc, 'Dados Pessoais', y)

            const col1 = CONFIG.margin
            const col2 = CONFIG.margin + (pageWidth - CONFIG.margin * 2) / 2

            let yTemp = y
            addField(doc, 'Nome Completo', String(funcionario.nome_completo || funcionario.usuario?.first_name || ''), col1, y)
            y = addField(doc, 'Matrícula', String(funcionario.matricula || '-'), col2, yTemp)

            yTemp = y
            addField(doc, 'CPF', String(funcionario.cpf || '-'), col1, y)
            y = addField(doc, 'Tipo de Usuário', String(funcionario.usuario?.tipo_usuario || '-'), col2, yTemp)

            yTemp = y
            addField(doc, 'E-mail', String(funcionario.usuario?.email || '-'), col1, y)
            y = addField(doc, 'Telefone', String(funcionario.usuario?.telefone || funcionario.telefone || '-'), col2, yTemp)

            // === DADOS PROFISSIONAIS ===
            y = checkNewPage(doc, y, 40)
            y = addSectionTitle(doc, 'Dados Profissionais', y)

            yTemp = y
            addField(doc, 'Cargo/Função', String(funcionario.cargo || '-'), col1, y)
            y = addField(doc, 'Área de Atuação', String(funcionario.area_atuacao || '-'), col2, yTemp)

            yTemp = y
            addField(doc, 'Data de Admissão', formatDateBR(funcionario.data_admissao), col1, y)
            y = addField(doc, 'Status', funcionario.usuario?.is_active ? 'Ativo' : 'Inativo', col2, yTemp)


            // === PERÍODOS DE TRABALHO ===
            if (periodos && periodos.length > 0) {
                y = checkNewPage(doc, y, 40)
                y = addSectionTitle(doc, 'Períodos de Trabalho', y)

                const headers = ['Data Entrada', 'Data Saída', 'Situação']
                const data = periodos.map(p => [
                    formatDateBR(p.data_entrada),
                    p.data_saida ? formatDateBR(p.data_saida) : '-',
                    p.data_saida ? 'Concluído' : 'Atual'
                ])

                y = addTable(doc, headers, data, y)
            }

            // Rodapé
            addFooter(doc)

            // Gera o PDF
            const nomeArquivo = `ficha_funcionario_${funcionario.matricula}.pdf`

            if (download) {
                downloadPDF(doc, nomeArquivo)
                toast.success('PDF gerado com sucesso!')
            } else {
                openPDF(doc)
            }
        } catch (error) {
            console.error('Erro ao gerar PDF:', error)
            toast.error('Erro ao gerar PDF')
        }
        setGeneratingPDF(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loading size="lg" />
            </div>
        )
    }

    if (!funcionario) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">Funcionário não encontrado.</p>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/funcionarios')}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <HiArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                            Detalhes do Funcionário
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Visualize as informações completas
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        icon={HiPrinter}
                        onClick={() => gerarPDF(false)}
                        loading={generatingPDF}
                    >
                        Visualizar PDF
                    </Button>
                    <Button
                        variant="outline"
                        icon={HiDownload}
                        onClick={() => gerarPDF(true)}
                        loading={generatingPDF}
                    >
                        Baixar PDF
                    </Button>
                    <Button
                        icon={HiPencil}
                        onClick={() => navigate(`/funcionarios/${id}/editar`)}
                    >
                        Editar
                    </Button>
                </div>
            </div>

            {/* Card Principal */}
            <Card hover={false}>
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <div className="w-[150px] h-[150px] rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-800">
                            {funcionario.usuario?.first_name ? (
                                <span className="text-white font-bold text-5xl">
                                    {funcionario.usuario.first_name[0]}
                                </span>
                            ) : (
                                <HiUser className="text-white w-20 h-20" />
                            )}
                        </div>
                    </div>

                    {/* Informações Principais */}
                    <div className="flex-1 space-y-6">
                        <div>
                            <div className="flex items-center flex-wrap gap-3">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                                    {funcionario.nome_completo || funcionario.usuario?.first_name}
                                </h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIPO_COLORS[funcionario.usuario?.tipo_usuario] || 'bg-slate-100 text-slate-600'}`}>
                                    {funcionario.usuario?.tipo_usuario}
                                </span>
                                <Badge variant={funcionario.usuario?.is_active ? 'success' : 'default'}>
                                    {funcionario.usuario?.is_active ? 'Ativo' : 'Inativo'}
                                </Badge>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                Matrícula: {funcionario.matricula}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <InfoItem
                                icon={HiIdentification}
                                label="CPF"
                                value={funcionario.cpf || '-'}
                            />
                            <InfoItem
                                icon={HiBriefcase}
                                label="Cargo / Função"
                                value={funcionario.cargo || '-'}
                            />
                            <InfoItem
                                icon={HiBriefcase}
                                label="Área de Atuação"
                                value={funcionario.area_atuacao || '-'}
                            />
                            <InfoItem
                                icon={HiCalendar}
                                label="Data de Admissão"
                                value={formatDateBR(funcionario.data_admissao)}
                            />
                            <InfoItem
                                icon={HiMail}
                                label="E-mail"
                                value={funcionario.usuario?.email || '-'}
                            />
                            <InfoItem
                                icon={HiPhone}
                                label="Telefone"
                                value={funcionario.usuario?.telefone || funcionario.telefone || '-'}
                            />
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <Button
                                size="sm"
                                variant="outline"
                                icon={HiRefresh}
                                onClick={() => setModalReset({ open: true })}
                            >
                                Resetar Senha
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Períodos de Trabalho */}
            <Card hover={false}>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <HiCalendar className="text-primary-500" />
                    Histórico de Períodos
                </h3>

                {periodos.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Data Entrada</TableHeader>
                                    <TableHeader>Data Saída</TableHeader>
                                    <TableHeader>Situação</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {periodos.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>{formatDateBR(p.data_entrada)}</TableCell>
                                        <TableCell>{p.data_saida ? formatDateBR(p.data_saida) : '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={p.data_saida ? 'default' : 'success'}>
                                                {p.data_saida ? 'Concluído' : 'Atual'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <p className="text-slate-500 text-center py-4">Nenhum histórico de período encontrado.</p>
                )}
            </Card>

            {/* Modal Reset Senha - Reutilizado */}
            <Modal
                isOpen={modalReset.open}
                onClose={() => setModalReset({ open: false })}
                title="Resetar Senha"
                size="md"
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <HiRefresh className="h-8 w-8 text-amber-500" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-slate-600 dark:text-slate-300">
                            Confirmar reset de senha para este funcionário?
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            Uma nova senha será enviada para o e-mail cadastrado.
                        </p>
                    </div>
                </div>
                <ModalFooter>
                    <Button variant="secondary" onClick={() => setModalReset({ open: false })}>Cancelar</Button>
                    <Button
                        variant="primary"
                        onClick={handleResetSenha}
                        disabled={loadingReset}
                        className="bg-amber-500 hover:bg-amber-600 focus:ring-amber-500"
                    >
                        {loadingReset ? <Loading size="sm" /> : 'Confirmar'}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    )
}

function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <p className="font-medium text-slate-800 dark:text-white break-all">{value}</p>
            </div>
        </div>
    )
}
