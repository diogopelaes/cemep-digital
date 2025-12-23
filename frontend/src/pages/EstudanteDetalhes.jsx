import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    Card, Button, Badge, Loading, Modal, ModalFooter
} from '../components/ui'
import {
    HiArrowLeft, HiPencil, HiPrinter, HiDownload, HiPhone, HiMail,
    HiLocationMarker, HiCalendar, HiAcademicCap, HiUser, HiUsers,
    HiCheckCircle, HiXCircle, HiDocumentText
} from 'react-icons/hi'
import { academicAPI } from '../services/api'
import { formatDateBR, calcularIdade } from '../utils/date'
import {
    createPDF, addHeader, addFooter, addSectionTitle, addField,
    addPhoto, addTable, checkNewPage, imageToBase64, downloadPDF, openPDF,
    CONFIG
} from '../utils/pdf'
import toast from 'react-hot-toast'

export default function EstudanteDetalhes() {
    const navigate = useNavigate()
    const { cpf } = useParams()

    const [loading, setLoading] = useState(true)
    const [estudante, setEstudante] = useState(null)
    const [prontuario, setProntuario] = useState(null)
    const [generatingPDF, setGeneratingPDF] = useState(false)

    useEffect(() => {
        loadEstudante()
    }, [cpf])

    const loadEstudante = async () => {
        try {
            // Carrega dados básicos e prontuário
            const [respEstudante, respProntuario] = await Promise.all([
                academicAPI.estudantes.get(cpf),
                academicAPI.estudantes.prontuario(cpf)
            ])
            setEstudante(respEstudante.data)
            setProntuario(respProntuario.data)
        } catch (error) {
            toast.error('Erro ao carregar dados do estudante')
            navigate('/estudantes')
        }
        setLoading(false)
    }

    const gerarPDF = async (download = true) => {
        if (!estudante || !prontuario) return

        setGeneratingPDF(true)
        try {
            const doc = createPDF()
            const pageWidth = doc.internal.pageSize.getWidth()

            // Cabeçalho
            let y = addHeader(doc, 'Ficha do Estudante', estudante.nome_exibicao || estudante.usuario?.first_name)

            // Layout: Foto à direita, dados à esquerda
            const fotoX = pageWidth - CONFIG.margin - 35
            const fotoY = y
            const dadosWidth = fotoX - CONFIG.margin - 10

            // Adiciona foto
            let fotoBase64 = null
            if (estudante.usuario?.foto) {
                try {
                    fotoBase64 = await imageToBase64(estudante.usuario.foto)
                } catch (e) {
                    console.log('Erro ao carregar foto para PDF')
                }
            }
            addPhoto(doc, fotoBase64, fotoX, fotoY, 35, 46.67)

            // === DADOS PESSOAIS ===
            y = addSectionTitle(doc, 'Dados Pessoais', y)

            // Primeira linha
            const col1 = CONFIG.margin
            const col2 = CONFIG.margin + dadosWidth / 2

            y = addField(doc, 'Nome Completo', estudante.usuario?.first_name, col1, y, dadosWidth)

            if (estudante.nome_social) {
                y = addField(doc, 'Nome Social', estudante.nome_social, col1, y)
            }

            // CPF e CIN
            let yTemp = y
            addField(doc, 'CPF', estudante.cpf_formatado || estudante.cpf, col1, y)
            y = addField(doc, 'CIN', estudante.cin || '-', col2, yTemp)

            // Data de nascimento e Idade
            yTemp = y
            const idade = estudante.data_nascimento ? calcularIdade(estudante.data_nascimento) : null
            addField(doc, 'Data de Nascimento', formatDateBR(estudante.data_nascimento), col1, y)
            y = addField(doc, 'Idade', idade ? `${idade} anos` : '-', col2, yTemp)

            // Telefone e Email
            yTemp = y
            addField(doc, 'Telefone', estudante.telefone_formatado || estudante.telefone || '-', col1, y)
            y = addField(doc, 'E-mail', estudante.usuario?.email || '-', col2, yTemp)

            // === ENDEREÇO ===
            y = checkNewPage(doc, y, 40)
            y = addSectionTitle(doc, 'Endereço', y)
            y = addField(doc, 'Endereço Completo', estudante.endereco_completo, col1, y, pageWidth - CONFIG.margin * 2)

            // === BENEFÍCIOS E TRANSPORTE ===
            y = checkNewPage(doc, y, 30)
            y = addSectionTitle(doc, 'Benefícios e Transporte', y)

            const beneficios = [
                `Bolsa Família: ${estudante.bolsa_familia ? 'Sim' : 'Não'}`,
                `Pé de Meia: ${estudante.pe_de_meia ? 'Sim' : 'Não'}`,
                `Usa Ônibus Escolar: ${estudante.usa_onibus ? 'Sim' : 'Não'}`,
                estudante.usa_onibus && estudante.linha_onibus ? `Linha: ${estudante.linha_onibus}` : null,
                `Permissão para Sair Sozinho: ${estudante.permissao_sair_sozinho ? 'Sim' : 'Não'}`
            ].filter(Boolean).join('  |  ')

            doc.setFontSize(10)
            doc.setTextColor(30, 41, 59)
            doc.text(beneficios, col1, y)
            y += 12

            // === MATRÍCULAS ===
            if (prontuario.matriculas_cemep && prontuario.matriculas_cemep.length > 0) {
                y = checkNewPage(doc, y, 40)
                y = addSectionTitle(doc, 'Matrículas', y)

                const headers = ['Nº Matrícula', 'Curso', 'Data Entrada', 'Status']
                const data = prontuario.matriculas_cemep.map(m => [
                    m.numero_matricula,
                    m.curso?.nome || m.curso?.sigla || '-',
                    formatDateBR(m.data_entrada),
                    m.status_display || m.status
                ])

                y = addTable(doc, headers, data, y)
                y += 10
            }

            // === TURMAS ===
            if (prontuario.matriculas_turma && prontuario.matriculas_turma.length > 0) {
                y = checkNewPage(doc, y, 40)
                y = addSectionTitle(doc, 'Turmas', y)

                const headers = ['Turma', 'Período', 'Data Entrada', 'Status']
                const data = prontuario.matriculas_turma.map(m => [
                    m.turma?.nome || '-',
                    m.turma?.periodo || '-',
                    formatDateBR(m.data_entrada),
                    m.status_display || m.status
                ])

                y = addTable(doc, headers, data, y)
                y += 10
            }

            // === RESPONSÁVEIS ===
            if (prontuario.responsaveis && prontuario.responsaveis.length > 0) {
                y = checkNewPage(doc, y, 40)
                y = addSectionTitle(doc, 'Responsáveis', y)

                const headers = ['Nome', 'Parentesco', 'Telefone']
                const data = prontuario.responsaveis.map(r => [
                    r.responsavel?.usuario?.first_name || '-',
                    r.parentesco_display || r.parentesco || '-',
                    r.responsavel?.telefone_formatado || r.responsavel?.telefone || '-'
                ])

                y = addTable(doc, headers, data, y)
            }

            // Rodapé
            addFooter(doc)

            // Gera o PDF
            const cpfLimpo = (estudante.cpf || '').replace(/\D/g, '')
            const nomeArquivo = `ficha_estudante_${cpfLimpo}.pdf`

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

    if (!estudante) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">Estudante não encontrado.</p>
            </div>
        )
    }

    const idade = estudante.data_nascimento ? calcularIdade(estudante.data_nascimento) : null
    const isMenor = idade !== null && idade < 18

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/estudantes')}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <HiArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                            Detalhes do Estudante
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Visualize todas as informações do estudante
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
                        onClick={() => navigate(`/estudantes/${cpf}/editar`)}
                    >
                        Editar
                    </Button>
                </div>
            </div>

            {/* Card Principal - Dados do Estudante */}
            <Card hover={false}>
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Foto */}
                    <div className="flex-shrink-0">
                        <div className="w-[150px] h-[200px] rounded-2xl overflow-hidden shadow-lg border-2 border-slate-200 dark:border-slate-700">
                            {estudante.usuario?.foto ? (
                                <img
                                    src={estudante.usuario.foto}
                                    alt={estudante.nome_exibicao}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
                                    <svg viewBox="0 0 24 24" className="w-16 h-16 fill-current opacity-50">
                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                    </svg>
                                    <span className="text-xs mt-2">Sem foto</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Informações Principais */}
                    <div className="flex-1 space-y-6">
                        {/* Nome e Status */}
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                                {estudante.nome_exibicao || estudante.usuario?.first_name}
                            </h2>
                            {estudante.nome_social && (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Nome social
                                </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                                <Badge variant={isMenor ? 'warning' : 'success'}>
                                    {isMenor ? 'Menor de idade' : 'Maior de idade'}
                                </Badge>
                                {idade && (
                                    <span className="text-sm text-slate-500">
                                        {idade} anos
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Grid de Informações */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <InfoItem
                                icon={HiDocumentText}
                                label="CPF"
                                value={estudante.cpf_formatado || estudante.cpf}
                            />
                            <InfoItem
                                icon={HiDocumentText}
                                label="CIN"
                                value={estudante.cin || '-'}
                            />
                            <InfoItem
                                icon={HiCalendar}
                                label="Data de Nascimento"
                                value={formatDateBR(estudante.data_nascimento)}
                            />
                            <InfoItem
                                icon={HiPhone}
                                label="Telefone"
                                value={estudante.telefone_formatado || estudante.telefone || '-'}
                            />
                            <InfoItem
                                icon={HiMail}
                                label="E-mail"
                                value={estudante.usuario?.email || '-'}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Endereço */}
            <Card hover={false}>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <HiLocationMarker className="text-primary-500" />
                    Endereço
                </h3>
                <p className="text-slate-700 dark:text-slate-300">
                    {estudante.endereco_completo}
                </p>
            </Card>

            {/* Benefícios e Transporte */}
            <Card hover={false}>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                    Benefícios e Transporte
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <BooleanItem label="Bolsa Família" value={estudante.bolsa_familia} />
                    <BooleanItem label="Pé de Meia" value={estudante.pe_de_meia} />
                    <BooleanItem label="Usa Ônibus" value={estudante.usa_onibus} />
                    <BooleanItem label="Pode Sair Sozinho" value={estudante.permissao_sair_sozinho} />
                </div>
                {estudante.usa_onibus && estudante.linha_onibus && (
                    <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                        <strong>Linha do Ônibus:</strong> {estudante.linha_onibus}
                    </p>
                )}
            </Card>

            {/* Matrículas */}
            {prontuario?.matriculas_cemep && prontuario.matriculas_cemep.length > 0 && (
                <Card hover={false}>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <HiAcademicCap className="text-primary-500" />
                        Matrículas
                    </h3>
                    <div className="space-y-3">
                        {prontuario.matriculas_cemep.map((mat) => (
                            <div
                                key={mat.numero_matricula}
                                className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                            >
                                <div>
                                    <p className="font-medium text-slate-800 dark:text-white">
                                        {mat.numero_matricula}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {mat.curso?.nome || mat.curso?.sigla} • Entrada: {formatDateBR(mat.data_entrada)}
                                    </p>
                                </div>
                                <Badge variant={mat.status === 'MATRICULADO' ? 'success' : 'default'}>
                                    {mat.status_display || mat.status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Responsáveis */}
            {prontuario?.responsaveis && prontuario.responsaveis.length > 0 && (
                <Card hover={false}>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <HiUsers className="text-primary-500" />
                        Responsáveis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {prontuario.responsaveis.map((resp, idx) => (
                            <div
                                key={idx}
                                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center">
                                        <HiUser className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800 dark:text-white">
                                            {resp.responsavel?.usuario?.first_name}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {resp.parentesco_display || resp.parentesco}
                                        </p>
                                    </div>
                                </div>
                                {resp.responsavel?.telefone && (
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                        <HiPhone className="w-4 h-4" />
                                        {resp.responsavel.telefone_formatado || resp.responsavel.telefone}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}

// Componente auxiliar para exibir informações
function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <p className="font-medium text-slate-800 dark:text-white">{value}</p>
            </div>
        </div>
    )
}

// Componente auxiliar para exibir boolean
function BooleanItem({ label, value }) {
    return (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            {value ? (
                <HiCheckCircle className="w-5 h-5 text-success-500" />
            ) : (
                <HiXCircle className="w-5 h-5 text-slate-400" />
            )}
            <span className={`text-sm ${value ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>
                {label}
            </span>
        </div>
    )
}
