import { useState, useEffect } from 'react'
import { 
  Card, Button, Input, Table, TableHead, TableBody, TableRow, 
  TableHeader, TableCell, TableEmpty, Badge, Modal, ModalFooter,
  Loading, Select
} from '../components/ui'
import { HiPlus, HiSearch, HiPencil, HiEye, HiTrash } from 'react-icons/hi'
import { academicAPI } from '../services/api'
import { formatDateBR } from '../utils/date'
import toast from 'react-hot-toast'

export default function Estudantes() {
  const [loading, setLoading] = useState(true)
  const [estudantes, setEstudantes] = useState([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedEstudante, setSelectedEstudante] = useState(null)

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

  const handleView = async (estudante) => {
    try {
      const response = await academicAPI.estudantes.prontuario(estudante.id)
      setSelectedEstudante(response.data)
      setDetailsOpen(true)
    } catch (error) {
      toast.error('Erro ao carregar prontuário')
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
            Estudantes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie os estudantes matriculados
          </p>
        </div>
        <Button icon={HiPlus} onClick={() => setModalOpen(true)}>
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
              <TableRow key={estudante.id}>
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
                <TableCell>{estudante.cpf}</TableCell>
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
                    >
                      <HiEye className="h-5 w-5" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600">
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

      {/* Modal Detalhes */}
      <Modal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Prontuário do Estudante"
        size="lg"
      >
        {selectedEstudante && (
          <div className="space-y-6">
            {/* Dados Pessoais */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-3">
                Dados Pessoais
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Nome</p>
                  <p className="font-medium">{selectedEstudante.estudante?.nome_exibicao}</p>
                </div>
                <div>
                  <p className="text-slate-500">CPF</p>
                  <p className="font-medium">{selectedEstudante.estudante?.cpf}</p>
                </div>
                <div>
                  <p className="text-slate-500">Data de Nascimento</p>
                  <p className="font-medium">
                    {formatDateBR(selectedEstudante.estudante?.data_nascimento)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Endereço</p>
                  <p className="font-medium">{selectedEstudante.estudante?.endereco_completo}</p>
                </div>
              </div>
            </div>

            {/* Matrículas */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-3">
                Matrículas
              </h3>
              {selectedEstudante.matriculas_cemep?.length > 0 ? (
                <ul className="space-y-2">
                  {selectedEstudante.matriculas_cemep.map((mat) => (
                    <li 
                      key={mat.numero_matricula}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                    >
                      <div>
                        <p className="font-medium">{mat.numero_matricula}</p>
                        <p className="text-sm text-slate-500">{mat.curso?.nome}</p>
                      </div>
                      <Badge variant={mat.status === 'MATRICULADO' ? 'success' : 'default'}>
                        {mat.status_display}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">Nenhuma matrícula encontrada</p>
              )}
            </div>

            {/* Responsáveis */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-3">
                Responsáveis
              </h3>
              {selectedEstudante.responsaveis?.length > 0 ? (
                <ul className="space-y-2">
                  {selectedEstudante.responsaveis.map((resp, idx) => (
                    <li 
                      key={idx}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                    >
                      <p className="font-medium">{resp.estudante?.nome_exibicao}</p>
                      <p className="text-sm text-slate-500">{resp.parentesco_display}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">Nenhum responsável cadastrado</p>
              )}
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDetailsOpen(false)}>
            Fechar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Novo Estudante */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Estudante"
        size="lg"
      >
        <p className="text-slate-500">
          Formulário de cadastro de estudante será implementado aqui.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button>Salvar</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

