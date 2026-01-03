import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    Card, Button, Badge, Loading, Modal, ModalFooter,
    Table, TableHead, TableBody, TableRow, TableHeader, TableCell
} from '../components/ui'
import { InfoItem } from '../components/common'
import {
    HiPencil, HiPrinter, HiDownload, HiPhone, HiMail,
    HiLocationMarker, HiCalendar, HiUser, HiIdentification, HiBriefcase
} from 'react-icons/hi'
import { coreAPI } from '../services/api'
import { formatDateBR } from '../utils/date'
import { displayCPF, displayTelefone, displayCEP } from '../utils/formatters'
import { TIPOS_USUARIO_COLORS } from '../data'
import {
    createPDF, addHeader, addFooter, addSectionTitle, addField,
    addTable, checkNewPage, downloadPDF, openPDF, CONFIG
} from '../utils/pdf'
import toast from 'react-hot-toast'

/**
 * Página de detalhes do funcionário
 */
export default function FuncionarioDetalhes() {
    const navigate = useNavigate()
    const { id } = useParams()

    const [loading, setLoading] = useState(true)
    const [funcionario, setFuncionario] = useState(null)
    const [periodos, setPeriodos] = useState([])
    const [generatingPDF, setGeneratingPDF] = useState(false)

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

    const gerarPDF = async (download = true) => {
        if (!funcionario) return

        setGeneratingPDF(true)
        try {
            const doc = createPDF()
            const pageWidth = doc.internal.pageSize.getWidth()

            let y = addHeader(doc, 'Ficha do Funcionário', funcionario.nome_completo || funcionario.usuario?.first_name)

            // === DADOS PESSOAIS ===
            y = addSectionTitle(doc, 'Dados Pessoais', y)

            const col1 = CONFIG.margin
            const col2 = CONFIG.margin + (pageWidth - CONFIG.margin * 2) / 2
            const maxW = 80

            let yTemp = y
            let y1 = addField(doc, 'Nome Completo', String(funcionario.nome_completo || funcionario.usuario?.first_name || ''), col1, y, maxW)
            let y2 = addField(doc, 'Matrícula', String(funcionario.matricula || '-'), col2, yTemp, maxW)
            y = Math.max(y1, y2)

            yTemp = y
            y1 = addField(doc, 'CPF', displayCPF(funcionario.cpf), col1, y, maxW)
            y2 = addField(doc, 'Data Nascimento', funcionario.data_nascimento ? formatDateBR(funcionario.data_nascimento) : '-', col2, yTemp, maxW)
            y = Math.max(y1, y2)

            yTemp = y
            y1 = addField(doc, 'CIN', String(funcionario.cin || '-'), col1, y, maxW)
            y2 = addField(doc, 'Nome Social', String(funcionario.nome_social || '-'), col2, yTemp, maxW)
            y = Math.max(y1, y2)

            yTemp = y
            y1 = addField(doc, 'Tipo de Usuário', String(funcionario.usuario?.tipo_usuario || '-'), col1, y, maxW)
            y2 = addField(doc, 'E-mail', String(funcionario.usuario?.email || '-'), col2, yTemp, maxW)
            y = Math.max(y1, y2)

            yTemp = y
            y1 = addField(doc, 'Telefone', displayTelefone(funcionario.usuario?.telefone || funcionario.telefone), col1, y, maxW)
            y = Math.max(y1, yTemp)

            // === ENDEREÇO ===
            y = checkNewPage(doc, y, 40)
            y = addSectionTitle(doc, 'Endereço', y)

            yTemp = y
            const endereco = `${funcionario.logradouro || ''}, ${funcionario.numero || ''} ${funcionario.complemento ? ' - ' + funcionario.complemento : ''}`
            y1 = addField(doc, 'Logradouro', endereco, col1, y, maxW)
            y2 = addField(doc, 'Bairro', String(funcionario.bairro || '-'), col2, yTemp, maxW)
            y = Math.max(y1, y2)

            yTemp = y
            y1 = addField(doc, 'Cidade/UF', `${funcionario.cidade || ''}/${funcionario.estado || ''}`, col1, y, maxW)
            y2 = addField(doc, 'CEP', displayCEP(funcionario.cep), col2, yTemp, maxW)
            y = Math.max(y1, y2)

            // === DADOS PROFISSIONAIS ===
            y = checkNewPage(doc, y, 40)
            y = addSectionTitle(doc, 'Dados Profissionais', y)

            yTemp = y
            y1 = addField(doc, 'Área de Atuação', String(funcionario.area_atuacao || '-'), col1, y, maxW)
            y2 = addField(doc, 'Apelido', String(funcionario.apelido || '-'), col2, yTemp, maxW)
            y = Math.max(y1, y2)

            yTemp = y
            y1 = addField(doc, 'Data de Admissão', funcionario.data_admissao ? formatDateBR(funcionario.data_admissao) : '-', col1, y, maxW)
            y2 = addField(doc, 'Status', funcionario.usuario?.is_active ? 'Ativo' : 'Inativo', col2, yTemp, maxW)
            y = Math.max(y1, y2)

            // === PERÍODOS DE TRABALHO ===
            if (periodos && periodos.length > 0) {
                y = checkNewPage(doc, y, 40)
                y = addSectionTitle(doc, 'Períodos de Trabalho', y)

                const headers = ['Data Entrada', 'Data Saída', 'Situação']
                const data = periodos.map(p => [
                    p.data_entrada ? formatDateBR(p.data_entrada) : '-',
                    p.data_saida ? formatDateBR(p.data_saida) : '-',
                    p.data_saida ? 'Concluído' : 'Atual'
                ])

                y = addTable(doc, headers, data, y)
            }

            addFooter(doc)

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

    const tipoUsuario = funcionario.usuario?.tipo_usuario
    const tipoColor = TIPOS_USUARIO_COLORS[tipoUsuario] || 'bg-slate-100 text-slate-600'

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">

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
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${tipoColor}`}>
                                    {tipoUsuario}
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
                                value={displayCPF(funcionario.cpf)}
                            />
                            <InfoItem
                                icon={HiBriefcase}
                                label="CIN"
                                value={funcionario.cin || '-'}
                            />
                            <InfoItem
                                icon={HiUser}
                                label="Nome Social"
                                value={funcionario.nome_social || '-'}
                            />
                            <InfoItem
                                icon={HiCalendar}
                                label="Data Nascimento"
                                value={funcionario.data_nascimento ? formatDateBR(funcionario.data_nascimento) : '-'}
                            />
                            <InfoItem
                                icon={HiBriefcase}
                                label="Área de Atuação"
                                value={funcionario.area_atuacao || '-'}
                            />
                            <InfoItem
                                icon={HiUser}
                                label="Apelido"
                                value={funcionario.apelido || '-'}
                            />
                            <InfoItem
                                icon={HiCalendar}
                                label="Data de Admissão"
                                value={funcionario.data_admissao ? formatDateBR(funcionario.data_admissao) : '-'}
                            />
                            <InfoItem
                                icon={HiMail}
                                label="E-mail"
                                value={funcionario.usuario?.email || '-'}
                            />
                            <InfoItem
                                icon={HiPhone}
                                label="Telefone"
                                value={displayTelefone(funcionario.usuario?.telefone || funcionario.telefone)}
                            />
                        </div>

                        {/* Seção de Endereço */}
                        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                                Endereço
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <InfoItem
                                    icon={HiLocationMarker}
                                    label="Logradouro"
                                    value={`${funcionario.logradouro || ''}, ${funcionario.numero || ''}`}
                                />
                                <InfoItem
                                    icon={HiLocationMarker}
                                    label="Complemento"
                                    value={funcionario.complemento || '-'}
                                />
                                <InfoItem
                                    icon={HiLocationMarker}
                                    label="Bairro"
                                    value={funcionario.bairro || '-'}
                                />
                                <InfoItem
                                    icon={HiLocationMarker}
                                    label="Cidade/UF"
                                    value={`${funcionario.cidade || ''}/${funcionario.estado || ''}`}
                                />
                                <InfoItem
                                    icon={HiLocationMarker}
                                    label="CEP"
                                    value={displayCEP(funcionario.cep)}
                                />
                            </div>
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
        </div>
    )
}
