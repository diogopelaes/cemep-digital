import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, Button, Table, TableHead, TableBody, TableRow, 
  TableHeader, TableCell, TableEmpty, Loading
} from '../components/ui'
import { HiPlus, HiPencil, HiTrash, HiBookOpen, HiX, HiCheck } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function Cursos() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [cursos, setCursos] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    loadCursos()
  }, [])

  const loadCursos = async () => {
    try {
      const response = await coreAPI.cursos.list()
      setCursos(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao carregar cursos')
    }
    setLoading(false)
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

      {/* Tabela */}
      <Card hover={false}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Nome</TableHeader>
              <TableHeader>Sigla</TableHeader>
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
                      <TableCell colSpan={2}>
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
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                            <HiBookOpen className="h-5 w-5 text-white" />
                          </div>
                          <span className="font-medium text-slate-800 dark:text-white">
                            {curso.nome}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                          {curso.sigla}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/cursos/${curso.id}/editar`)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-primary-600 transition-colors"
                            title="Editar"
                          >
                            <HiPencil className="h-5 w-5" />
                          </button>
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
              <TableEmpty colSpan={3} message="Nenhum curso cadastrado" />
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
