import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Card, Button, Select, Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableEmpty, Loading, Pagination,
  DropdownMenu, DropdownItem, ActionSelect, Modal
} from '../../components/ui'
import { HiPlus, HiUserGroup, HiTrash, HiCheck, HiX, HiBookOpen, HiPencil, HiCheckCircle, HiXCircle, HiUpload, HiTable, HiPhotograph } from 'react-icons/hi'
import { FaFilePdf } from 'react-icons/fa'
import BulkUploadModal from '../../components/modals/BulkUploadModal'
import BulkAssociateDisciplinasModal from '../../components/modals/BulkAssociateDisciplinasModal'
import { coreAPI, academicAPI } from '../../services/api'
import { getNomenclaturaLabel } from '../../data'
import toast from 'react-hot-toast'
import { generateListaTurmaPDF } from '../../utils/pdf'
import { formatDateBR } from '../../utils/date'

export default function Turmas() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [turmas, setTurmas] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEnturmarModal, setShowEnturmarModal] = useState(false)

  const [showDisciplinasModal, setShowDisciplinasModal] = useState(false)
  const [showMobileActions, setShowMobileActions] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(null)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  // Carrega turmas quando página muda
  useEffect(() => {
    loadTurmas()
  }, [currentPage])

  const loadTurmas = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = { page: currentPage }
      const response = await coreAPI.turmas.list(params)
      const data = response.data
      setTurmas(data.results || data)
      setTotalCount(data.count || (data.results || data).length)
      setTotalPages(Math.ceil((data.count || (data.results || data).length) / pageSize))
    } catch (error) {
      toast.error('Erro ao carregar turmas')
    }
    if (!silent) setLoading(false)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }



  const handleToggleAtivo = async (turma) => {
    try {
      await coreAPI.turmas.toggleAtivo(turma.id)
      toast.success(turma.is_active ? 'Turma desativada' : 'Turma ativada')
      loadTurmas()
    } catch (error) {
      toast.error('Erro ao alterar status')
    }
  }

  const formatTurmaNome = (turma) => {
    return `${turma.nome}`
  }

  const handleGerarLista = async (turma, e) => {
    e.preventDefault()
    e.stopPropagation()
    setGeneratingPDF(turma.id)
    try {
      // Busca estudantes da turma
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
            <div className="flex-1 min-w-0 flex gap-3">
              {/* Avatar da Turma - clicável */}
              <div
                className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform ${turma.is_active
                  ? 'from-primary-500 to-accent-500'
                  : 'from-slate-400 to-slate-500 grayscale'
                  }`}
                onClick={() => navigate(`/turmas/${turma.id}`)}
              >
                <span className="text-white font-bold text-sm">
                  {turma.numero}{turma.letra}
                </span>
              </div>

              {/* Informações */}
              <div className="min-w-0 flex-1">
                <h3
                  className={`font-bold text-sm cursor-pointer hover:text-primary-600 transition-colors truncate ${!turma.is_active ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}
                  title={formatTurmaNome(turma)}
                  onClick={() => navigate(`/turmas/${turma.id}`)}
                >
                  {formatTurmaNome(turma)?.length > 25 ? formatTurmaNome(turma).substring(0, 25) + '...' : formatTurmaNome(turma)}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[11px] text-slate-500 truncate font-medium max-w-[150px]">
                    {turma.curso?.nome || 'Curso não definido'}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-lg shrink-0">
                    <HiUserGroup className="h-3 w-3" />
                    <span>{turma.estudantes_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>

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

        {/* BARRA DE AÇÕES EXPANSÍVEL */}
        <div className={`
                    grid transition-all duration-300 ease-in-out border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30
                    ${showActions ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}
                `}>
          <div className="overflow-hidden">
            <div className="grid grid-cols-4">
              <button
                onClick={() => navigate(`/turmas/${turma.id}`)}
                className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 transition-all border-r border-b border-slate-100 dark:border-slate-800"
              >
                <HiPencil className="h-5 w-5" />
                <span>Editar</span>
              </button>

              <button
                onClick={() => navigate(`/turmas/${turma.id}`, { state: { tab: 'estudantes' } })}
                className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 transition-all border-r border-b border-slate-100 dark:border-slate-800"
              >
                <HiUserGroup className="h-5 w-5" />
                <span>Alunos</span>
              </button>

              <button
                onClick={() => navigate(`/turmas/${turma.id}`, { state: { tab: 'disciplinas' } })}
                className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 transition-all border-r border-b border-slate-100 dark:border-slate-800"
              >
                <HiBookOpen className="h-5 w-5" />
                <span>Matriz</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleAtivo(turma)
                }}
                className={`
                                py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-all border-b border-slate-100 dark:border-slate-800
                                ${turma.is_active
                    ? 'text-success-600 hover:bg-success-50 dark:text-success-400 dark:hover:bg-success-900/10'
                    : 'text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800'
                  }
                            `}
              >
                {turma.is_active ? <HiCheckCircle className="h-5 w-5" /> : <HiXCircle className="h-5 w-5" />}
                <span>Status</span>
              </button>

              <button
                onClick={(e) => handleGerarLista(turma, e)}
                disabled={generatingPDF === turma.id}
                className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 transition-all border-r border-slate-100 dark:border-slate-800 disabled:opacity-50"
              >
                {generatingPDF === turma.id ? <Loading size="sm" /> : <FaFilePdf className="h-5 w-5" />}
                <span>Lista</span>
              </button>

              <button
                onClick={() => navigate(`/turmas/${turma.id}/carometro`)}
                className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 transition-all border-r border-slate-100 dark:border-slate-800"
              >
                <HiPhotograph className="h-5 w-5" />
                <span>Fotos</span>
              </button>

              <button
                onClick={() => navigate(`/turmas/${turma.id}`, { state: { tab: 'gradeHoraria' } })}
                className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 transition-all border-r border-slate-100 dark:border-slate-800"
              >
                <HiTable className="h-5 w-5" />
                <span>Grade</span>
              </button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div key="header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                Turmas
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Gerencie as turmas do ano letivo
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Desktop View */}
              <div className="hidden sm:block">
                <DropdownMenu
                  trigger={
                    <Button variant="secondary" icon={HiUpload}>
                      Importar / Ações
                    </Button>
                  }
                >
                  <DropdownItem icon={HiBookOpen} onClick={() => setShowDisciplinasModal(true)}>
                    Importar Disciplinas
                  </DropdownItem>
                  <DropdownItem icon={HiUserGroup} onClick={() => setShowEnturmarModal(true)}>
                    Enturmar Estudantes
                  </DropdownItem>
                  <DropdownItem icon={HiUpload} onClick={() => setShowUploadModal(true)}>
                    Cadastro de Turmas em massa
                  </DropdownItem>
                </DropdownMenu>
              </div>

              {/* Mobile View */}
              <div className="sm:hidden">
                <Button variant="secondary" icon={HiUpload} onClick={() => setShowMobileActions(true)} />
              </div>

              <Button icon={HiPlus} onClick={() => navigate('/turmas/novo')}>
                <span className="hidden sm:inline">Nova Turma</span>
              </Button>
            </div>
          </div>

          {/* Mobile: Cards */}
          <div className="md:hidden space-y-3">
            {turmas.length > 0 ? (
              turmas.map((turma) => (
                <TurmaCard key={turma.id} turma={turma} />
              ))
            ) : (
              <Card className="p-8 text-center text-slate-500">
                Nenhuma turma encontrada
              </Card>
            )}
          </div>

          {/* Desktop: Tabela de Turmas */}
          <div className="hidden md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Turma</TableHeader>
                  <TableHeader>Curso</TableHeader>
                  <TableHeader className="th-center">Status</TableHeader>
                  <TableHeader className="th-center font-bold text-primary-600 dark:text-primary-400">Ações</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {turmas.length > 0 ? (
                  turmas.map((turma) => (
                    <TableRow key={turma.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => navigate(`/turmas/${turma.id}`)}
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all ${turma.is_active
                              ? 'from-primary-500 to-accent-500'
                              : 'from-slate-400 to-slate-500 grayscale'
                              }`}
                          >
                            <span className="text-white font-bold text-sm">
                              {turma.numero}{turma.letra}
                            </span>
                          </button>
                          <div>
                            <button
                              onClick={() => navigate(`/turmas/${turma.id}`)}
                              className={`font-medium text-left ${!turma.is_active ? 'text-slate-400 line-through' : 'text-link-subtle'}`}
                            >
                              {formatTurmaNome(turma)}
                            </button>
                            {!turma.is_active && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Inativa</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {turma.curso?.nome || 'Curso não definido'}
                        </span>
                      </TableCell>
                      <TableCell className="td-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleAtivo(turma)
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${turma.is_active
                            ? 'bg-success-500/10 text-success-600 hover:bg-success-500/20 dark:text-success-400'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'
                            }`}
                          title="Alterar Status"
                        >
                          {turma.is_active ? (
                            <>
                              <HiCheckCircle className="w-4 h-4" />
                              Ativa
                            </>
                          ) : (
                            <>
                              <HiXCircle className="w-4 h-4" />
                              Inativa
                            </>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="td-center">
                        <ActionSelect
                          size="sm"
                          actions={[
                            {
                              label: `Estudantes (${turma.estudantes_count || 0})`,
                              icon: HiUserGroup,
                              onClick: () => navigate(`/turmas/${turma.id}`, { state: { tab: 'estudantes' } })
                            },
                            {
                              label: `Disciplinas (${turma.disciplinas_count || 0})`,
                              icon: HiBookOpen,
                              onClick: () => navigate(`/turmas/${turma.id}`, { state: { tab: 'disciplinas' } })
                            },
                            {
                              label: 'Grade Horária',
                              icon: HiTable,
                              onClick: () => navigate(`/turmas/${turma.id}`, { state: { tab: 'gradeHoraria' } })
                            },
                            {
                              label: 'Lista PDF',
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
                              label: turma.is_active ? 'Desativar Turma' : 'Ativar Turma',
                              icon: turma.is_active ? HiXCircle : HiCheckCircle,
                              variant: turma.is_active ? 'danger' : 'default',
                              onClick: () => handleToggleAtivo(turma)
                            }
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmpty
                    colSpan={4}
                    message="Nenhuma turma encontrada"
                  />
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
        </div>
      )}

      <BulkUploadModal
        key="modal-upload-turmas"
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={async (formData) => {
          const response = await coreAPI.turmas.importarArquivo(formData)
          if (response.data.errors?.length > 0) {
            toast.error('Alguns registros não foram importados. Verifique os erros.')
          }
          loadTurmas(true)
          loadTurmas(true)
          return response
        }}
        entityName="Turmas"
        templateHeaders={['NUMERO', 'LETRA', 'ANO_LETIVO', 'NOMENCLATURA', 'SIGLA_CURSO']}
        onDownloadTemplate={async () => {
          try {
            const response = await coreAPI.turmas.downloadModelo()
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'modelo_turmas.xlsx')
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
            <li>Todos os campos são obrigatórios.</li>
            <li><strong>SIGLA_CURSO</strong> deve corresponder a um curso existente.</li>
            <li><strong>NOMENCLATURA</strong>: SÉRIE, ANO ou MÓDULO.</li>
          </ul>
        }
      />

      {/* Modal de Enturmar Estudantes em Massa */}
      <BulkUploadModal
        key="modal-enturmar"
        isOpen={showEnturmarModal}
        onClose={() => setShowEnturmarModal(false)}
        title="Enturmar Estudantes em Massa"
        onUpload={async (formData) => {
          const response = await academicAPI.matriculasTurma.importarArquivo(formData)
          return response
        }}
        onDownloadTemplate={async () => {
          try {
            const response = await academicAPI.matriculasTurma.downloadModelo()
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'modelo_enturmacao.xlsx')
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
            <li><strong>MATRICULA</strong>: Número da matrícula CEMEP.</li>
            <li><strong>TURMA</strong>: Código da turma (ex: 1A, 2B).</li>
            <li><strong>CURSO</strong>: Sigla do curso (ex: INFO, ENF).</li>
            <li><strong>DATA_ENTRADA</strong>: (Opcional) Data no formato dd/mm/aaaa.</li>
          </ul>
        }
      />

      {/* Modal de Importar Disciplinas em Massa */}
      <BulkAssociateDisciplinasModal
        isOpen={showDisciplinasModal}
        onClose={() => setShowDisciplinasModal(false)}
        onUpload={(response) => {
          if (response.data.errors?.length > 0) {
            toast.error('Alguns registros não foram importados. Verifique os erros.')
          } else {
            toast.success('Disciplinas importadas com sucesso!')
          }
          loadTurmas(true)
        }}
      />

      {/* Menu de Ações Mobile */}
      <Modal
        isOpen={showMobileActions}
        onClose={() => setShowMobileActions(false)}
        title="Ações e Importações"
        size="sm"
      >
        <div className="grid gap-3 py-2">
          <button
            onClick={() => {
              setShowMobileActions(false)
              setShowDisciplinasModal(true)
            }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-200 transition-all text-left group"
          >
            <div className="w-12 h-12 shrink-0 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
              <HiBookOpen className="h-6 w-6 text-primary-500" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 dark:text-white">Importar Disciplinas</p>
              <p className="text-xs text-slate-500">Vincular matérias às turmas</p>
            </div>
          </button>

          <button
            onClick={() => {
              setShowMobileActions(false)
              setShowEnturmarModal(true)
            }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-200 transition-all text-left group"
          >
            <div className="w-12 h-12 shrink-0 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
              <HiUserGroup className="h-6 w-6 text-primary-500" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 dark:text-white">Enturmar Estudantes</p>
              <p className="text-xs text-slate-500">Distribuir alunos em lote</p>
            </div>
          </button>

          <button
            onClick={() => {
              setShowMobileActions(false)
              setShowUploadModal(true)
            }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-200 transition-all text-left group"
          >
            <div className="w-12 h-12 shrink-0 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
              <HiUpload className="h-6 w-6 text-primary-500" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 dark:text-white">Matrícula em Massa</p>
              <p className="text-xs text-slate-500">Cadastro rápido de turmas</p>
            </div>
          </button>
        </div>
      </Modal>
    </>
  )
}
