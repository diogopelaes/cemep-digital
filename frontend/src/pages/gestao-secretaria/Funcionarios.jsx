import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Button, Input, Select, Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableEmpty, Loading, Badge, Modal, ModalFooter, DateInput, Pagination, Avatar, ActionSelect
} from '../../components/ui'
import {
  HiPlus, HiPencil, HiCalendar, HiCheck, HiX, HiRefresh,
  HiCheckCircle, HiXCircle, HiSearch, HiUpload, HiTable
} from 'react-icons/hi'
import { FaFilePdf } from 'react-icons/fa'
import { coreAPI } from '../../services/api'
import BulkUploadModal from '../../components/modals/BulkUploadModal'
import { formatDateBR } from '../../utils/date'
import { TIPOS_USUARIO, TIPOS_USUARIO_COLORS } from '../../data'
import {
  createPDF, addHeader, addFooter, addSectionTitle, addField,
  addTable, checkNewPage, downloadPDF, CONFIG
} from '../../utils/pdf/index'
import toast from 'react-hot-toast'

export default function Funcionarios() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [funcionarios, setFuncionarios] = useState([])
  const [generatingPDF, setGeneratingPDF] = useState(null)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Modal de Períodos
  const [modalPeriodos, setModalPeriodos] = useState({ open: false, funcionario: null })
  const [periodos, setPeriodos] = useState([])
  const [loadingPeriodos, setLoadingPeriodos] = useState(false)
  const [novoPeriodo, setNovoPeriodo] = useState({ data_entrada: '', data_saida: '' })

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  // Debounce para busca automática
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFuncionarios()
    }, 400)
    return () => clearTimeout(timer)
  }, [search, filtroTipo, filtroAtivo, currentPage])

  const loadFuncionarios = async () => {
    try {
      const params = { search, page: currentPage }
      if (filtroTipo) params['usuario__tipo_usuario'] = filtroTipo
      if (filtroAtivo !== '') params['usuario__is_active'] = filtroAtivo

      const response = await coreAPI.funcionarios.list(params)
      const data = response.data
      setFuncionarios(data.results || data)
      setTotalCount(data.count || (data.results || data).length)
      setTotalPages(Math.ceil((data.count || (data.results || data).length) / pageSize))
    } catch (error) {
      toast.error('Erro ao carregar funcionários')
    }
    setLoading(false)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  // Reset página quando muda filtro
  const handleFiltroTipoChange = (e) => {
    setFiltroTipo(e.target.value)
    setCurrentPage(1)
  }

  const handleFiltroAtivoChange = (e) => {
    setFiltroAtivo(e.target.value)
    setCurrentPage(1)
  }

  const handleToggleAtivo = async (funcionario) => {
    try {
      await coreAPI.funcionarios.toggleAtivo(funcionario.id)
      toast.success(funcionario.usuario?.is_active ? 'Funcionário desativado' : 'Funcionário ativado')
      loadFuncionarios()
    } catch (error) {
      toast.error('Erro ao alterar status')
    }
  }

  // === Lógica de Períodos ===
  const handleOpenPeriodosModal = async (funcionario) => {
    setModalPeriodos({ open: true, funcionario })
    setLoadingPeriodos(true)
    setPeriodos([]) // Limpa anterior
    try {
      const response = await coreAPI.periodosTrabalho.list({ funcionario: funcionario.id })
      setPeriodos(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao carregar períodos')
    }
    setLoadingPeriodos(false)
  }

  const handleClosePeriodosModal = () => {
    setModalPeriodos({ open: false, funcionario: null })
    setPeriodos([])
    setNovoPeriodo({ data_entrada: '', data_saida: '' })
  }

  const handleAddPeriodo = async (e) => {
    e.preventDefault()

    if (!novoPeriodo.data_entrada) {
      toast.error('Data de entrada é obrigatória')
      return
    }

    try {
      await coreAPI.periodosTrabalho.create({
        funcionario: modalPeriodos.funcionario.id,
        data_entrada: novoPeriodo.data_entrada,
        data_saida: novoPeriodo.data_saida || null,
      })
      toast.success('Período adicionado!')
      setNovoPeriodo({ data_entrada: '', data_saida: '' })
      // Recarrega lista
      const response = await coreAPI.periodosTrabalho.list({ funcionario: modalPeriodos.funcionario.id })
      setPeriodos(response.data.results || response.data)
    } catch (error) {
      const msg = error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.detail ||
        'Erro ao adicionar período'
      toast.error(msg)
    }
  }

  const handleDeletePeriodo = async (id) => {
    try {
      await coreAPI.periodosTrabalho.delete(id)
      toast.success('Período removido!')
      // Recarrega lista
      const response = await coreAPI.periodosTrabalho.list({ funcionario: modalPeriodos.funcionario.id })
      setPeriodos(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao remover período')
    }
  }

  const handleGeneratePDF = async (funcionarioId) => {
    setGeneratingPDF(funcionarioId)
    try {
      const [respFunc, respPeriodos] = await Promise.all([
        coreAPI.funcionarios.get(funcionarioId),
        coreAPI.periodosTrabalho.list({ funcionario: funcionarioId })
      ])
      const funcionario = respFunc.data
      const periodosList = respPeriodos.data.results || respPeriodos.data

      const doc = createPDF()
      const pageWidth = doc.internal.pageSize.getWidth()

      // Cabeçalho
      let y = await addHeader(doc, {
        title: 'Ficha do Funcionário',
        subtitle1: funcionario.nome_completo || funcionario.usuario?.first_name
      })

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
      if (periodosList && periodosList.length > 0) {
        y = checkNewPage(doc, y, 40)
        y = addSectionTitle(doc, 'Períodos de Trabalho', y)

        const headers = ['Data Entrada', 'Data Saída', 'Situação']
        const data = periodosList.map(p => [
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
      downloadPDF(doc, nomeArquivo)
      toast.success('PDF gerado com sucesso!')

    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast.error('Erro ao gerar PDF')
    }
    setGeneratingPDF(null)
  }

  // Componente de Card para Mobile
  const FuncionarioCard = ({ func }) => {
    const [showActions, setShowActions] = useState(false);

    return (
      <Card
        padding={false}
        className="overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm transition-all duration-300"
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex-1 min-w-0 flex gap-3 cursor-pointer group"
              onClick={() => navigate(`/funcionarios/${func.id}`)}
            >
              <Avatar
                name={func.nome_completo || func.usuario?.first_name}
                size="md"
                className="shrink-0"
              />
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-primary-600 transition-colors truncate" title={func.nome_completo || func.usuario?.first_name}>
                  {(func.nome_completo || func.usuario?.first_name)?.length > 25
                    ? (func.nome_completo || func.usuario?.first_name).substring(0, 25) + '...'
                    : (func.nome_completo || func.usuario?.first_name)}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Mat. {func.matricula}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors shrink-0 ${TIPOS_USUARIO_COLORS[func.usuario?.tipo_usuario] || 'bg-slate-100 text-slate-600'}`}>
                    {func.usuario?.tipo_usuario}
                  </span>
                  {func.area_atuacao && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 max-w-[100px] truncate">
                      {func.area_atuacao}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => setShowActions(!showActions)}
                className={`
                                text-[10px] font-bold px-3 py-1 rounded-full transition-all duration-200
                                ${showActions
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 border border-primary-100 dark:border-primary-800/50'
                  }
                            `}
              >
                {showActions ? 'Fechar' : 'Ações'}
              </button>
            </div>
          </div>
        </div>

        {/* BARRA DE AÇÕES EXPANSÍVEL */}
        <div className={`
                    grid transition-all duration-300 ease-in-out border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30
                    ${showActions ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}
                `}>
          <div className="overflow-hidden grid grid-cols-4">
            <button
              onClick={() => navigate(`/funcionarios/${func.id}`)}
              className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 transition-all border-r border-slate-100 dark:border-slate-800"
            >
              <HiPencil className="h-5 w-5" />
              <span>Editar</span>
            </button>

            <button
              onClick={() => handleGeneratePDF(func.id)}
              disabled={generatingPDF === func.id}
              className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 transition-all border-r border-slate-100 dark:border-slate-800 disabled:opacity-50"
            >
              {generatingPDF === func.id ? <Loading size="sm" /> : <FaFilePdf className="h-5 w-5" />}
              <span>Ficha</span>
            </button>

            <button
              onClick={() => handleOpenPeriodosModal(func)}
              className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 transition-all border-r border-slate-100 dark:border-slate-800"
            >
              <HiCalendar className="h-5 w-5" />
              <span>Períodos</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleToggleAtivo(func)
              }}
              className={`
                                py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-all
                                ${func.usuario?.is_active
                  ? 'text-success-600 hover:bg-success-50 dark:text-success-400 dark:hover:bg-success-900/10'
                  : 'text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800'
                }
                            `}
            >
              {func.usuario?.is_active ? <HiCheckCircle className="h-5 w-5" /> : <HiXCircle className="h-5 w-5" />}
              <span>{func.usuario?.is_active ? 'Ativo' : 'Inativo'}</span>
            </button>
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            Funcionários
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie os funcionários e turnos
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="secondary" icon={HiUpload} onClick={() => setShowUploadModal(true)}>
            <span className="hidden sm:inline">Cadastro em massa</span>
          </Button>
          <Button icon={HiPlus} onClick={() => navigate('/funcionarios/novo')}>
            <span className="hidden sm:inline">Novo Funcionário</span>
          </Button>
        </div>
      </div>

      {/* Busca e Filtros */}
      <Card hover={false}>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Buscar por matrícula, nome ou apelido..."
              icon={HiSearch}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              label="Tipo"
              value={filtroTipo}
              onChange={handleFiltroTipoChange}
              options={TIPOS_USUARIO}
              placeholder="Todos"
            />
          </div>
          <div className="w-48">
            <Select
              label="Status"
              value={filtroAtivo}
              onChange={handleFiltroAtivoChange}
              options={[
                { value: 'true', label: 'Ativos' },
                { value: 'false', label: 'Inativos' },
              ]}
              placeholder="Todos"
            />
          </div>
        </div>
      </Card>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {funcionarios.length > 0 ? (
          funcionarios.map((func) => (
            <FuncionarioCard key={func.id} func={func} />
          ))
        ) : (
          <Card className="p-8 text-center text-slate-500">
            Nenhum funcionário encontrado
          </Card>
        )}
      </div>

      {/* Desktop: Tabela de Funcionários */}
      <div className="hidden md:block">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Funcionário</TableHeader>
              <TableHeader>Cargo</TableHeader>
              <TableHeader>Área</TableHeader>
              <TableHeader className="th-center">Status</TableHeader>
              <TableHeader className="th-center font-bold text-primary-600 dark:text-primary-400">Ações</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {funcionarios.length > 0 ? (
              funcionarios.map((func) => (
                <TableRow key={func.id}>
                  <TableCell>
                    <div
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => navigate(`/funcionarios/${func.id}`)}
                    >
                      <Avatar
                        name={func.nome_completo || func.usuario?.first_name}
                        size="md"
                      />
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {func.nome_completo || func.usuario?.first_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Mat. {func.matricula}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${TIPOS_USUARIO_COLORS[func.usuario?.tipo_usuario] || 'bg-slate-100 text-slate-600'}`}>
                      {func.usuario?.tipo_usuario}
                    </span>
                  </TableCell>
                  <TableCell>
                    {func.area_atuacao || '-'}
                  </TableCell>
                  <TableCell className="td-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleAtivo(func)
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${func.usuario?.is_active
                        ? 'bg-success-500/10 text-success-600 hover:bg-success-500/20 dark:text-success-400'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      title="Alterar Status"
                    >
                      {func.usuario?.is_active ? (
                        <>
                          <HiCheckCircle className="w-4 h-4" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <HiXCircle className="w-4 h-4" />
                          Inativo
                        </>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="td-center">
                    <ActionSelect
                      size="sm"
                      actions={[
                        {
                          label: 'Editar Funcionário',
                          icon: HiPencil,
                          onClick: () => navigate(`/funcionarios/${func.id}`)
                        },
                        {
                          label: 'Gerar Ficha (PDF)',
                          icon: FaFilePdf,
                          disabled: generatingPDF === func.id,
                          onClick: () => handleGeneratePDF(func.id)
                        },
                        {
                          label: 'Períodos de Trabalho',
                          icon: HiCalendar,
                          onClick: () => handleOpenPeriodosModal(func)
                        },
                        ...(func.usuario?.tipo_usuario === 'PROFESSOR' ? [{
                          label: 'Grade',
                          icon: HiTable,
                          onClick: () => navigate(`/minha-grade?professor_id=${func.id}`)
                        }] : []),
                        {
                          label: func.usuario?.is_active ? 'Desativar Usuário' : 'Ativar Usuário',
                          icon: func.usuario?.is_active ? HiXCircle : HiCheckCircle,
                          variant: func.usuario?.is_active ? 'danger' : 'default',
                          onClick: () => handleToggleAtivo(func)
                        }
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmpty colSpan={5} message="Nenhum funcionário encontrado" />
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />

      {/* Modal de Períodos */}
      <Modal
        isOpen={modalPeriodos.open}
        onClose={handleClosePeriodosModal}
        title={`Períodos: ${modalPeriodos.funcionario?.nome_completo || ''}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Formulário */}
          <form onSubmit={handleAddPeriodo} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <DateInput
                  label="Data de Entrada"
                  value={novoPeriodo.data_entrada}
                  onChange={(e) => setNovoPeriodo({ ...novoPeriodo, data_entrada: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <DateInput
                  label="Data de Saída"
                  value={novoPeriodo.data_saida}
                  onChange={(e) => setNovoPeriodo({ ...novoPeriodo, data_saida: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" >
                  <HiPlus className="h-5 w-5" />
                  Adicionar
                </Button>
              </div>
            </div>
          </form>

          {/* Lista */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            <h4 className="font-medium text-slate-700 dark:text-slate-300 px-1">Histórico</h4>
            {loadingPeriodos ? (
              <div className="flex justify-center py-4">
                <Loading size="md" />
              </div>
            ) : periodos.length > 0 ? (
              periodos.map(periodo => (
                <div key={periodo.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-lg">
                      <HiCalendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-white">
                        {formatDateBR(periodo.data_entrada)}
                      </p>
                      <p className="text-sm text-slate-500">
                        até {periodo.data_saida ? formatDateBR(periodo.data_saida) : 'Atual'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePeriodo(periodo.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remover"
                  >
                    <HiX className="h-5 w-5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-4">Nenhum período registrado.</p>
            )}
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={handleClosePeriodosModal}>
            Fechar
          </Button>
        </ModalFooter>
      </Modal>

      <BulkUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={async (formData) => {
          const response = await coreAPI.funcionarios.uploadFile(formData)
          if (response.data.errors?.length > 0) {
            toast.error('Alguns registros não foram importados. Verifique os erros.')
          }
          loadFuncionarios()
          return response
        }}
        entityName="Funcionários"
        templateHeaders={[
          'NOME_COMPLETO', 'EMAIL', 'MATRICULA', 'TIPO_USUARIO', 'SENHA', 'CPF', 'APELIDO',
          'AREA_ATUACAO', 'CIN', 'NOME_SOCIAL', 'DATA_NASCIMENTO', 'LOGRADOURO', 'NUMERO',
          'BAIRRO', 'CIDADE', 'ESTADO', 'CEP', 'COMPLEMENTO', 'TELEFONE', 'DATA_ADMISSAO'
        ]}
        onDownloadTemplate={async () => {
          try {
            const response = await coreAPI.funcionarios.downloadModel()
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'modelo_funcionarios.xlsx')
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
            <li><strong>Matrícula</strong> será usada como Nome de Usuário.</li>
            <li><strong>CPF</strong> e <strong>Datas</strong> são validados (se inválidos, o registro é criado sem eles).</li>
            <li>Tipos permitidos: <strong>GESTAO, SECRETARIA, PROFESSOR, MONITOR</strong>.</li>
          </ul>
        }
      />
    </div>
  )
}
