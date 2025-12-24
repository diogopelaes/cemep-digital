import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Button, Select, Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableEmpty, Loading, Pagination
} from '../components/ui'
import { HiPlus, HiTrash, HiBookOpen, HiX, HiCheck, HiAcademicCap } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function Disciplinas() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [disciplinas, setDisciplinas] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('false')

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  useEffect(() => {
    loadDisciplinas()
  }, [filtroStatus, currentPage])

  const loadDisciplinas = async () => {
    setLoading(true)
    try {
      const params = { page: currentPage }
      if (filtroStatus !== '') {
        params.descontinuada = filtroStatus
      }

      const response = await coreAPI.disciplinas.list(params)
      const data = response.data
      setDisciplinas(data.results || data)
      setTotalCount(data.count || (data.results || data).length)
      setTotalPages(Math.ceil((data.count || (data.results || data).length) / pageSize))
    } catch (error) {
      toast.error('Erro ao carregar disciplinas')
    }
    setLoading(false)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleFiltroStatusChange = (e) => {
    setFiltroStatus(e.target.value)
    setCurrentPage(1)
  }

  const handleDelete = async (disciplina) => {
    try {
      await coreAPI.disciplinas.delete(disciplina.id)
      toast.success('Disciplina excluída com sucesso!')
      setConfirmDelete(null)
      loadDisciplinas()
    } catch (error) {
      const msg = error.response?.data?.detail || 'Erro ao excluir disciplina'
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
            Disciplinas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie as disciplinas e suas habilidades (BNCC)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button icon={HiPlus} onClick={() => navigate('/disciplinas/novo')}>
            Nova Disciplina
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card hover={false}>
        <div className="w-48">
          <Select
            label="Status"
            value={filtroStatus}
            onChange={handleFiltroStatusChange}
            options={[
              { value: 'false', label: 'Ativas' },
              { value: 'true', label: 'Descontinuadas' },
            ]}
            placeholder="Todas"
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
              <TableHeader>Área de Conhecimento</TableHeader>
              <TableHeader className="w-32 text-right">Ações</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {disciplinas.length > 0 ? (
              disciplinas.map((disciplina) => (
                <TableRow key={disciplina.id}>
                  {confirmDelete?.id === disciplina.id ? (
                    // Linha em modo de confirmação de exclusão
                    <>
                      <TableCell colSpan={3}>
                        <span className="text-danger-600 dark:text-danger-400 font-medium">
                          Confirma exclusão de "{disciplina.nome}"?
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDelete(disciplina)}
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
                          onClick={() => navigate(`/disciplinas/${disciplina.id}/editar`)}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <HiBookOpen className="h-5 w-5 text-white" />
                          </div>
                          <span className={`font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors ${disciplina.descontinuada
                            ? 'text-slate-400 dark:text-slate-500 line-through'
                            : 'text-slate-800 dark:text-white'
                            }`}>
                            {disciplina.nome}
                          </span>
                          {disciplina.descontinuada && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              Descontinuada
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                          {disciplina.sigla}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {disciplina.area_conhecimento_display || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setConfirmDelete(disciplina)}
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
              <TableEmpty colSpan={4} message="Nenhuma disciplina cadastrada" />
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
    </div >
  )
}
