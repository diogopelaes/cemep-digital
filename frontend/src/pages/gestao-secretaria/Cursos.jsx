import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Button, Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableEmpty, Loading, Pagination, Select
} from '../../components/ui'
import { HiPlus, HiBookOpen, HiCheckCircle, HiXCircle, HiUpload, HiPencil } from 'react-icons/hi'
import BulkUploadModal from '../../components/modals/BulkUploadModal'
import { coreAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function Cursos() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [cursos, setCursos] = useState([])
  const [filtroAtivo, setFiltroAtivo] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  useEffect(() => {
    loadCursos()
  }, [currentPage, filtroAtivo])

  const loadCursos = async () => {
    try {
      const params = { page: currentPage }
      if (filtroAtivo !== '') {
        params.is_active = filtroAtivo
      }
      const response = await coreAPI.cursos.list(params)
      const data = response.data
      setCursos(data.results || data)
      setTotalCount(data.count || (data.results || data).length)
      setTotalPages(Math.ceil((data.count || (data.results || data).length) / pageSize))
    } catch (error) {
      toast.error('Erro ao carregar cursos')
    }
    setLoading(false)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleFiltroActiveChange = (e) => {
    setFiltroAtivo(e.target.value)
    setCurrentPage(1)
  }

  const handleToggleAtivo = async (curso) => {
    try {
      await coreAPI.cursos.toggleAtivo(curso.id)
      toast.success(curso.is_active ? 'Curso desativado' : 'Curso ativado')
      loadCursos()
    } catch (error) {
      toast.error('Erro ao alterar status')
    }
  }

  // Componente de Card para Mobile
  const CursoCard = ({ curso }) => {
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
              onClick={() => navigate(`/cursos/${curso.id}/editar`)}
            >
              <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <HiBookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`font-bold text-sm group-hover:text-primary-600 transition-colors truncate ${!curso.is_active ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`} title={curso.nome}>
                  {curso.nome?.length > 25 ? curso.nome.substring(0, 25) + '...' : curso.nome}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {curso.sigla}
                  </span>
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
          <div className="overflow-hidden grid grid-cols-2">
            <button
              onClick={() => navigate(`/cursos/${curso.id}/editar`)}
              className="py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 transition-all border-r border-slate-100 dark:border-slate-800"
            >
              <HiPencil className="h-5 w-5" />
              <span>Editar</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleToggleAtivo(curso)
              }}
              className={`
                                py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-all
                                ${curso.is_active
                  ? 'text-success-600 hover:bg-success-50 dark:text-success-400 dark:hover:bg-success-900/10'
                  : 'text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800'
                }
                            `}
            >
              {curso.is_active ? <HiCheckCircle className="h-5 w-5" /> : <HiXCircle className="h-5 w-5" />}
              <span>{curso.is_active ? 'Ativo' : 'Inativo'}</span>
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
            Cursos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie os cursos oferecidos pela instituição
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="secondary" icon={HiUpload} onClick={() => setShowUploadModal(true)}>
            <span className="hidden sm:inline">Cadastro em massa</span>
          </Button>
          <Button icon={HiPlus} onClick={() => navigate('/cursos/novo')}>
            <span className="hidden sm:inline">Novo Curso</span>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card hover={false}>
        <div className="w-48">
          <Select
            label="Status"
            value={filtroAtivo}
            onChange={handleFiltroActiveChange}
            options={[
              { value: 'true', label: 'Ativos' },
              { value: 'false', label: 'Inativos' },
            ]}
            placeholder="Todos"
            allowClear
          />
        </div>
      </Card>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {cursos.length > 0 ? (
          cursos.map((curso) => (
            <CursoCard key={curso.id} curso={curso} />
          ))
        ) : (
          <Card className="p-8 text-center text-slate-500">
            Nenhum curso cadastrado
          </Card>
        )}
      </div>

      {/* Desktop: Tabela */}
      <div className="hidden md:block">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Nome</TableHeader>
              <TableHeader>Sigla</TableHeader>
              <TableHeader className="th-center">Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {cursos.length > 0 ? (
              cursos.map((curso) => (
                <TableRow key={curso.id}>
                  <TableCell>
                    <div
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => navigate(`/cursos/${curso.id}/editar`)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <HiBookOpen className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className={`font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors ${!curso.is_active
                          ? 'text-slate-400 dark:text-slate-500 line-through'
                          : 'text-slate-800 dark:text-white'
                          }`}>
                          {curso.nome}
                        </p>
                        {!curso.is_active && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Inativo</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                      {curso.sigla}
                    </span>
                  </TableCell>
                  <TableCell className="td-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleAtivo(curso)
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${curso.is_active
                        ? 'bg-success-500/10 text-success-600 hover:bg-success-500/20 dark:text-success-400'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      title="Alterar Status"
                    >
                      {curso.is_active ? (
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
                </TableRow>
              ))
            ) : (
              <TableEmpty colSpan={3} message="Nenhum curso cadastrado" />
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

      <BulkUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={async (formData) => {
          const response = await coreAPI.cursos.importarArquivo(formData)
          if (response.data.errors?.length > 0) {
            toast.error('Alguns registros não foram importados. Verifique os erros.')
          }
          loadCursos()
          return response
        }}
        entityName="Cursos"
        templateHeaders={['NOME', 'SIGLA']}
        onDownloadTemplate={async () => {
          try {
            const response = await coreAPI.cursos.downloadModelo()
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'modelo_cursos.xlsx')
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
            <li>Colunas obrigatórias: <strong>NOME</strong> e <strong>SIGLA</strong>.</li>
            <li>A <strong>SIGLA</strong> é usada para identificar duplicatas.</li>
          </ul>
        }
      />
    </div>
  )
}

