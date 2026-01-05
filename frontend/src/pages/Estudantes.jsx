import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Button, Input, Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableEmpty, Badge, Loading, Pagination, Avatar
} from '../components/ui'
import { HiPlus, HiSearch, HiUpload, HiUserGroup, HiDuplicate } from 'react-icons/hi'
import { FaFilePdf } from 'react-icons/fa'
import BulkUploadModal from '../components/modals/BulkUploadModal'
import { useAuth } from '../contexts/AuthContext'
import { academicAPI } from '../services/api'
import { formatDateBR, calcularIdade } from '../utils/date'
import {
  createPDF, addHeader, addFooter, addSectionTitle, addField,
  addPhoto, addTable, checkNewPage, imageToBase64, downloadPDF,
  CONFIG
} from '../utils/pdf/index'
import toast from 'react-hot-toast'

/**
 * Estudantes - Listagem de estudantes
 * 
 * Layout responsivo:
 * - Mobile: Cards empilhados
 * - Desktop: Tabela tradicional
 */
export default function Estudantes() {
  const { isSecretaria } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [estudantes, setEstudantes] = useState([])
  const [search, setSearch] = useState('')
  const [generatingPDF, setGeneratingPDF] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  // Debounce para busca automática
  useEffect(() => {
    const timer = setTimeout(() => {
      loadEstudantes()
    }, 400)
    return () => clearTimeout(timer)
  }, [search, currentPage])

  const loadEstudantes = async () => {
    try {
      const response = await academicAPI.estudantes.list({ search, page: currentPage })
      const data = response.data
      setEstudantes(data.results || data)
      setTotalCount(data.count || (data.results || data).length)
      setTotalPages(Math.ceil((data.count || (data.results || data).length) / pageSize))
    } catch (error) {
      toast.error('Erro ao carregar estudantes')
    }
    setLoading(false)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleView = (estudante) => {
    navigate(`/estudantes/${estudante.id}`)
  }

  const handleGeneratePDF = async (id, e) => {
    if (e) e.stopPropagation()
    setGeneratingPDF(id)
    try {
      // Carrega dados completos e prontuário
      const [respEstudante, respProntuario] = await Promise.all([
        academicAPI.estudantes.get(id),
        academicAPI.estudantes.prontuario(id)
      ])
      const estudante = respEstudante.data
      const prontuario = respProntuario.data

      const doc = createPDF()
      const pageWidth = doc.internal.pageSize.getWidth()

      // Cabeçalho
      // Cabeçalho
      let y = await addHeader(doc, {
        title: 'Ficha do Estudante',
        subtitle1: estudante.nome_exibicao || estudante.usuario?.first_name
      })

      // === DADOS PESSOAIS ===
      y = addSectionTitle(doc, 'Dados Pessoais', y)

      // Layout: Foto à direita, dados à esquerda
      const fotoWidth = 30
      const fotoHeight = 40
      const fotoX = pageWidth - CONFIG.margin - fotoWidth
      const fotoY = y
      const dadosWidth = fotoX - CONFIG.margin - 10

      // Adiciona foto
      let fotoBase64 = null
      if (estudante.foto) {
        try {
          fotoBase64 = await imageToBase64(estudante.foto)
        } catch (e) {
          console.log('Erro ao carregar foto para PDF')
        }
      }
      addPhoto(doc, fotoBase64, fotoX, fotoY, fotoWidth, fotoHeight)

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
      y += 6 // Espaço extra antes de Benefícios

      // === BENEFÍCIOS E TRANSPORTE ===
      y = checkNewPage(doc, y, 30)
      y = addSectionTitle(doc, 'Benefícios e Transporte', y)

      const beneficios = [
        `Bolsa Família: ${estudante.bolsa_familia ? 'Sim' : 'Não'}`,
        `Pé de Meia: ${estudante.pe_de_meia ? 'Sim' : 'Não'}`,
        `Usa Ônibus Escolar: ${estudante.usa_onibus ? 'Sim' : 'Não'}`,
        estudante.usa_onibus && estudante.linha_onibus ? `Linha: ${estudante.linha_onibus}` : null,
        `Permissão para Sair Sozinho: ${estudante.permissao_sair_sozinho ? 'Sim' : 'Não'}`
      ].filter(Boolean)

      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)

      beneficios.forEach((texto) => {
        doc.text(texto, col1, y)
        y += 6
      })
      y += 6

      // === MATRÍCULAS ===
      if (prontuario.matriculas_cemep && prontuario.matriculas_cemep.length > 0) {
        y = checkNewPage(doc, y, 40)
        y = addSectionTitle(doc, 'Matrículas', y)

        const headers = ['Nº Matrícula', 'Curso', 'Entrada', 'Saída', 'Status']
        const data = prontuario.matriculas_cemep.map(m => [
          m.numero_matricula_formatado || m.numero_matricula,
          m.curso?.nome || m.curso?.sigla || '-',
          formatDateBR(m.data_entrada) || '-',
          m.data_saida ? formatDateBR(m.data_saida) : '-',
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

      downloadPDF(doc, nomeArquivo)
      toast.success('PDF gerado com sucesso!')

    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast.error('Erro ao gerar PDF')
    }
    setGeneratingPDF(null)
  }

  // Função para copiar email
  const handleCopyEmail = (email, e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(email)
    toast.success('Email copiado!')
  }

  // Componente Card para Mobile
  const EstudanteCard = ({ estudante }) => (
    <Card
      padding={false}
      className="p-3 overflow-hidden"
    >
      <div className="flex items-start gap-3">
        {/* Avatar - clicável para ver detalhes */}
        <Avatar
          name={estudante.nome_exibicao}
          size="md"
          className="shrink-0 cursor-pointer"
          onClick={() => handleView(estudante)}
        />

        {/* Informações */}
        <div className="flex-1 min-w-0">
          {/* Nome - clicável para ver detalhes */}
          <div className="flex items-center gap-2">
            <h3
              className="font-semibold text-slate-800 dark:text-white text-sm cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              title={estudante.nome_exibicao}
              onClick={() => handleView(estudante)}
            >
              {estudante.nome_exibicao?.length > 25
                ? estudante.nome_exibicao.substring(0, 25) + '...'
                : estudante.nome_exibicao}
            </h3>
            {estudante.nome_social && (
              <span className="text-[10px] text-primary-500 font-medium bg-primary-50 dark:bg-primary-900/20 px-1.5 py-0.5 rounded shrink-0">
                Social
              </span>
            )}
          </div>

          {/* Email com botão de copiar */}
          {estudante.usuario?.email && (
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={estudante.usuario.email}>
                {estudante.usuario.email.length > 24
                  ? estudante.usuario.email.substring(0, 24) + '...'
                  : estudante.usuario.email}
              </p>
              <button
                onClick={(e) => handleCopyEmail(estudante.usuario.email, e)}
                className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                title="Copiar email"
              >
                <HiDuplicate className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Cursos e Ações */}
          <div className="flex items-center flex-wrap gap-1 mt-2">
            {estudante.cursos_matriculados?.length > 0 ? (
              <>
                {estudante.cursos_matriculados.slice(0, 3).map((curso, idx) => (
                  <Badge key={idx} variant="primary" className="text-[10px] px-1.5 py-0">
                    {curso.sigla}
                  </Badge>
                ))}
                {estudante.cursos_matriculados.length > 3 && (
                  <span className="text-[10px] text-slate-400">
                    +{estudante.cursos_matriculados.length - 3}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[10px] text-slate-400">Sem curso</span>
            )}

            {/* PDF */}
            <button
              onClick={(e) => handleGeneratePDF(estudante.id, e)}
              disabled={generatingPDF === estudante.id}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors disabled:opacity-50"
              title="Gerar PDF"
            >
              {generatingPDF === estudante.id ? (
                <Loading size="sm" />
              ) : (
                <FaFilePdf className="h-3.5 w-3.5" />
              )}
            </button>
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
        Nenhum estudante encontrado
      </h3>
      <p className="text-slate-500 dark:text-slate-400">
        {search ? 'Tente ajustar os termos da busca' : (isSecretaria ? 'Cadastre o primeiro estudante' : 'Nenhum estudante cadastrado no sistema')}
      </p>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            Estudantes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie os estudantes matriculados
          </p>
        </div>
        {isSecretaria && (
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="secondary" icon={HiUpload} onClick={() => setShowUploadModal(true)} className="text-sm sm:text-base">
              <span className="hidden sm:inline">Cadastro em massa</span>
              <span className="sm:hidden">Importar</span>
            </Button>
            <Button icon={HiPlus} onClick={() => navigate('/estudantes/novo')} className="text-sm sm:text-base">
              <span className="hidden sm:inline">Novo Estudante</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <Card hover={false} className="max-w-sm mx-auto md:max-w-none">
        <Input
          placeholder="Buscar por nome, CPF..."
          icon={HiSearch}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {/* Conteúdo */}
      {estudantes.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="md:hidden space-y-3 max-w-sm mx-auto">
            {estudantes.map((estudante) => (
              <EstudanteCard key={estudante.id} estudante={estudante} />
            ))}
          </div>

          {/* Desktop: Tabela */}
          <Card hover={false} className="hidden md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Nome</TableHeader>
                  <TableHeader>CPF</TableHeader>
                  <TableHeader>E-mail</TableHeader>
                  <TableHeader>Cursos</TableHeader>
                  <TableHeader className="th-center">Bolsa Família</TableHeader>
                  <TableHeader className="th-center">Ações</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {estudantes.map((estudante) => (
                  <TableRow key={estudante.id}>
                    <TableCell>
                      <div className="flex items-center gap-3 group">
                        <Avatar
                          name={estudante.nome_exibicao}
                          size="md"
                          onClick={() => handleView(estudante)}
                        />
                        <button
                          onClick={() => handleView(estudante)}
                          className="text-left"
                        >
                          <p className="font-medium text-slate-800 dark:text-white group-hover:text-primary-500 transition-colors">
                            {estudante.nome_exibicao}
                          </p>
                          {estudante.nome_social && (
                            <p className="text-xs text-slate-500">
                              Nome Social
                            </p>
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{estudante.cpf_formatado || estudante.cpf}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <span className="truncate" title={estudante.usuario?.email}>
                          {estudante.usuario?.email || '-'}
                        </span>
                        {estudante.usuario?.email && (
                          <button
                            onClick={(e) => handleCopyEmail(estudante.usuario.email, e)}
                            className="text-slate-400 hover:text-primary-600 dark:text-slate-500 dark:hover:text-primary-400 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                            title="Copiar email"
                          >
                            <HiDuplicate className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {estudante.cursos_matriculados?.length > 0 ? (
                          estudante.cursos_matriculados.map((curso, idx) => (
                            <Badge key={idx} variant="primary" title={curso.nome}>
                              {curso.sigla}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="td-center">
                      <Badge variant={estudante.bolsa_familia ? 'success' : 'default'}>
                        {estudante.bolsa_familia ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell className="td-center">
                      <button
                        onClick={() => handleGeneratePDF(estudante.id)}
                        disabled={generatingPDF === estudante.id}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-primary-400 transition-colors disabled:opacity-50"
                        title="Gerar PDF"
                      >
                        {generatingPDF === estudante.id ? (
                          <Loading size="sm" />
                        ) : (
                          <FaFilePdf className="h-5 w-5" />
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Paginação */}
      {estudantes.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      )}

      {isSecretaria && (
        <BulkUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={async (formData) => {
            const response = await academicAPI.estudantes.uploadFile(formData)
            if (response.data.errors?.length > 0) {
              toast.error('Alguns registros não foram importados. Verifique os erros.')
            }
            loadEstudantes()
            return response
          }}
          entityName="Estudantes"
          templateHeaders={[
            'NOME_COMPLETO', 'EMAIL', 'CPF', 'SENHA', 'CIN', 'LINHA_ONIBUS',
            'BOLSA_FAMILIA', 'PE_DE_MEIA', 'SAIDA_SOZINHO',
            'LOGRADOURO', 'NUMERO', 'BAIRRO', 'CIDADE', 'ESTADO', 'CEP',
            'COMPLEMENTO', 'TELEFONE',
            'NUMERO_MATRICULA', 'DATA_NASCIMENTO', 'CURSO_SIGLA', 'DATA_ENTRADA_CURSO', 'DATA_SAIDA_CURSO', 'STATUS_MATRICULA'
          ]}
          onDownloadTemplate={async () => {
            try {
              const response = await academicAPI.estudantes.downloadModel()
              const url = window.URL.createObjectURL(new Blob([response.data]))
              const link = document.createElement('a')
              link.href = url
              link.setAttribute('download', 'modelo_estudantes.xlsx')
              document.body.appendChild(link)
              link.click()
              link.remove()
            } catch (error) {
              console.error(error)
              toast.error('Erro ao baixar o modelo.')
            }
          }}
          instructions={
            <ul className="list-disc list-inside space-y-1 ml-1 text-slate-600 dark:text-slate-300">
              <li>Formatos aceitos: <strong>.csv</strong> ou <strong>.xlsx</strong>.</li>
              <li><strong>EMAIL</strong> será usado como Nome de Usuário (Login).</li>
              <li>Colunas Obrigatórias do Estudante: <strong>NOME_COMPLETO, EMAIL, CPF, DATA_NASCIMENTO</strong>.</li>
              <li>Se a <strong>SENHA</strong> estiver vazia, uma aleatória será gerada (para novos usuários).</li>
              <li>Campos Booleanos: <strong>BOLSA_FAMILIA, PE_DE_MEIA, SAIDA_SOZINHO</strong>. Use <strong>Sim</strong> ou <strong>Não</strong>.</li>
              <li className="mt-2 font-semibold">Campos de Matrícula (opcionais, mas se preenchidos exigem todos os obrigatórios):</li>
              <li className="ml-4">Obrigatórios: <strong>NUMERO_MATRICULA</strong> (10 dígitos), <strong>CURSO_SIGLA</strong>, <strong>DATA_ENTRADA_CURSO</strong>, <strong>STATUS_MATRICULA</strong>.</li>
              <li className="ml-4">Opcional: <strong>DATA_SAIDA_CURSO</strong>.</li>
              <li className="ml-4">Opções de STATUS_MATRICULA: <strong>MATRICULADO, CONCLUIDO, ABANDONO, TRANSFERIDO, OUTRO</strong>.</li>
            </ul>
          }
        />
      )}
    </div>
  )
}
