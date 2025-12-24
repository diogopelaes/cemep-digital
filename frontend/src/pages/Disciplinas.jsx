import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Button, Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableEmpty, Loading
} from '../components/ui'
import { HiPlus, HiTrash, HiBookOpen, HiX, HiCheck, HiAcademicCap } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function Disciplinas() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [disciplinas, setDisciplinas] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    loadDisciplinas()
  }, [])

  const loadDisciplinas = async () => {
    try {
      const response = await coreAPI.disciplinas.list()
      setDisciplinas(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao carregar disciplinas')
    }
    setLoading(false)
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
        <Button icon={HiPlus} onClick={() => navigate('/disciplinas/novo')}>
          Nova Disciplina
        </Button>
      </div>

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
                          <span className="font-medium text-slate-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {disciplina.nome}
                          </span>
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
      </Card>

      {/* Dica */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
        <HiAcademicCap className="h-6 w-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
            Gerenciamento de Habilidades BNCC
          </p>
          <p className="text-sm text-primary-600/80 dark:text-primary-400/80 mt-1">
            Clique em "Editar" para gerenciar as habilidades vinculadas a cada disciplina.
          </p>
        </div>
      </div>
    </div>
  )
}
