import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Button, Input, Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableEmpty, Badge, Loading
} from '../components/ui'
import { HiPlus, HiSearch, HiPencil, HiEye } from 'react-icons/hi'
import { academicAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function Estudantes() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [estudantes, setEstudantes] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadEstudantes()
  }, [])

  const loadEstudantes = async () => {
    try {
      const response = await academicAPI.estudantes.list({ search })
      setEstudantes(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao carregar estudantes')
    }
    setLoading(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadEstudantes()
  }

  const handleView = (estudante) => {
    navigate(`/estudantes/${estudante.cpf}`)
  }

  const handleEdit = (estudante) => {
    navigate(`/estudantes/${estudante.cpf}/editar`)
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
            Estudantes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie os estudantes matriculados
          </p>
        </div>
        <Button icon={HiPlus} onClick={() => navigate('/estudantes/novo')}>
          Novo Estudante
        </Button>
      </div>

      {/* Search */}
      <Card hover={false}>
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome, CPF..."
              icon={HiSearch}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
      </Card>

      {/* Table */}
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Nome</TableHeader>
            <TableHeader>CPF</TableHeader>
            <TableHeader>E-mail</TableHeader>
            <TableHeader>Bolsa Família</TableHeader>
            <TableHeader>Ações</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {estudantes.length > 0 ? (
            estudantes.map((estudante) => (
              <TableRow key={estudante.cpf}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {estudante.nome_exibicao?.[0] || 'E'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-white">
                        {estudante.nome_exibicao}
                      </p>
                      {estudante.nome_social && (
                        <p className="text-xs text-slate-500">
                          Nome Social
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{estudante.cpf_formatado || estudante.cpf}</TableCell>
                <TableCell>{estudante.usuario?.email}</TableCell>
                <TableCell>
                  <Badge variant={estudante.bolsa_familia ? 'success' : 'default'}>
                    {estudante.bolsa_familia ? 'Sim' : 'Não'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(estudante)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-primary-600"
                      title="Ver prontuário"
                    >
                      <HiEye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(estudante)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                      title="Editar estudante"
                    >
                      <HiPencil className="h-5 w-5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableEmpty colSpan={5} message="Nenhum estudante encontrado" />
          )}
        </TableBody>
      </Table>
    </div>
  )
}
