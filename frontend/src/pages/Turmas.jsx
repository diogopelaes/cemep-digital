import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Card, Button, Select, Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableEmpty, Loading, Pagination,
  DropdownMenu, DropdownItem
} from '../components/ui'
import { HiPlus, HiUserGroup, HiTrash, HiCheck, HiX, HiBookOpen, HiPencil, HiCheckCircle, HiXCircle, HiUpload, HiTable, HiPhotograph } from 'react-icons/hi'
import BulkUploadModal from '../components/modals/BulkUploadModal'
import BulkAssociateDisciplinasModal from '../components/modals/BulkAssociateDisciplinasModal'
import { coreAPI, academicAPI } from '../services/api'
import { getNomenclaturaLabel } from '../data'
import toast from 'react-hot-toast'

export default function Turmas() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [turmas, setTurmas] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEnturmarModal, setShowEnturmarModal] = useState(false)
  const [showDisciplinasModal, setShowDisciplinasModal] = useState(false)

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

  // Formata o nome da turma
  const formatTurmaNome = (turma) => {
    return `${turma.nome}`
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

              <Button icon={HiPlus} onClick={() => navigate('/turmas/novo')}>
                Nova Turma
              </Button>
            </div>
          </div>



          {/* Tabela de Turmas */}
          <Card key="tabela-turmas" hover={false}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Turma</TableHeader>
                  <TableHeader>Curso</TableHeader>
                  <TableHeader className="th-center">Estudantes</TableHeader>
                  <TableHeader className="th-center">Disciplinas</TableHeader>
                  <TableHeader className="th-center">Grade</TableHeader>
                  <TableHeader className="th-center">Carômetro</TableHeader>
                  <TableHeader className="th-center">Status</TableHeader>
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
                        <Link
                          to={`/turmas/${turma.id}`}
                          state={{ tab: 'estudantes' }}
                          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          <HiUserGroup className="h-4 w-4" />
                          <span>{turma.estudantes_count || 0}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="td-center">
                        <Link
                          to={`/turmas/${turma.id}`}
                          state={{ tab: 'disciplinas' }}
                          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          <HiBookOpen className="h-4 w-4" />
                          <span>{turma.disciplinas_count || 0}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="td-center">
                        <Link
                          to={`/turmas/${turma.id}`}
                          state={{ tab: 'gradeHoraria' }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-primary-400 transition-colors"
                          title="Grade Horária"
                        >
                          <HiTable className="h-5 w-5" />
                        </Link>
                      </TableCell>
                      <TableCell className="td-center">
                        <Link
                          to={`/turmas/${turma.id}/carometro`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-primary-400 transition-colors"
                          title="Visualizar Carômetro"
                        >
                          <HiPhotograph className="h-5 w-5" />
                        </Link>
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

            {/* Paginação */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={handlePageChange}
            />
          </Card>
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
    </>
  )
}
