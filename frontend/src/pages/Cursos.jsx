import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Button, Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableEmpty, Loading, Pagination, Select
} from '../components/ui'
import { HiPlus, HiTrash, HiBookOpen, HiX, HiCheck, HiCheckCircle, HiXCircle } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function Cursos() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [cursos, setCursos] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [filtroAtivo, setFiltroAtivo] = useState('')

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

  const handleDelete = async (curso) => {
    try {
      await coreAPI.cursos.delete(curso.id)
      toast.success('Curso excluído com sucesso!')
      setConfirmDelete(null)
      loadCursos()
    } catch (error) {
      const msg = error.response?.data?.detail || 'Erro ao excluir curso. Verifique se não há turmas vinculadas.'
      toast.error(msg)
    }
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
        <Button icon={HiPlus} onClick={() => navigate('/cursos/novo')}>
          Novo Curso
        </Button>
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

      {/* Tabela */}
      <Card hover={false}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Nome</TableHeader>
              <TableHeader>Sigla</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader className="w-40 text-right">Ações</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {cursos.length > 0 ? (
              cursos.map((curso) => (
                <TableRow key={curso.id}>
                  {confirmDelete?.id === curso.id ? (
                    // Linha em modo de confirmação de exclusão
                    <>
                      <TableCell colSpan={3}>
                        <span className="text-danger-600 dark:text-danger-400 font-medium">
                          Confirma exclusão de "{curso.nome}"?
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDelete(curso)}
                            className="p-2 rounded-lg bg-danger-500/10 hover:bg-danger-500/20 text-danger-600 transition-colors"
                            title="Confirmar exclusão"
                          >
                            <HiCheck className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                            title="Cancelar"
                          >
                            <HiX className="h-5 w-5" />
                          </button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    // Linha normal
                    <>
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
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleAtivo(curso)
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${curso.is_active
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
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setConfirmDelete(curso)}
                            className="p-2 rounded-lg hover:bg-danger-500/10 text-danger-600 transition-colors"
                            title="Excluir"
                          >
                            <HiTrash className="h-5 w-5" />
                          </button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            ) : (
              <TableEmpty colSpan={4} message="Nenhum curso cadastrado" />
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
  )
}

