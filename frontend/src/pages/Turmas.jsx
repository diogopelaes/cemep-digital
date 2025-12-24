import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Button, Select, Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableEmpty, Loading
} from '../components/ui'
import { HiPlus, HiUserGroup, HiTrash, HiCheck, HiX, HiBookOpen, HiPencil } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function Turmas() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [turmas, setTurmas] = useState([])
  const [anosDisponiveis, setAnosDisponiveis] = useState([])
  const [anoLetivo, setAnoLetivo] = useState(null)
  // Carrega anos disponíveis na primeira montagem
  useEffect(() => {
    loadAnosDisponiveis()
  }, [])

  // Carrega turmas quando o ano muda
  useEffect(() => {
    if (anoLetivo) {
      loadTurmas()
    }
  }, [anoLetivo])

  const loadAnosDisponiveis = async () => {
    try {
      // Busca anos disponíveis diretamente do backend
      const response = await coreAPI.turmas.anosDisponiveis()
      const anos = response.data

      if (anos && anos.length > 0) {
        setAnosDisponiveis(anos)
        setAnoLetivo(anos[0]) // Seleciona o ano mais recente
      } else {
        // Nenhuma turma cadastrada - usa ano atual como padrão
        const anoAtual = new Date().getFullYear()
        setAnosDisponiveis([anoAtual])
        setAnoLetivo(anoAtual)
        setLoading(false)
      }
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar anos letivos')
      setLoading(false)
    }
  }

  const loadTurmas = async () => {
    setLoading(true)
    try {
      const response = await coreAPI.turmas.list({ ano_letivo: anoLetivo })
      setTurmas(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao carregar turmas')
    }
    setLoading(false)
  }

  // Formata o nome da turma
  const formatTurmaNome = (turma) => {
    const nomenclatura = turma.nomenclatura === 'SERIE' ? 'Série' : turma.nomenclatura === 'ANO' ? 'Ano' : 'Módulo'
    return `${turma.numero}º ${nomenclatura} ${turma.letra}`
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
            Turmas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie as turmas do ano letivo
          </p>
        </div>
        <Button icon={HiPlus} onClick={() => navigate('/turmas/novo')}>
          Nova Turma
        </Button>
      </div>

      {/* Filtro de Ano */}
      {anosDisponiveis.length > 0 && (
        <Card hover={false}>
          <div className="flex items-center gap-4">
            <div className="w-40">
              <Select
                label="Ano Letivo"
                value={anoLetivo}
                onChange={(e) => setAnoLetivo(parseInt(e.target.value))}
                options={anosDisponiveis.map(ano => ({ value: ano, label: ano.toString() }))}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500 mt-6">
                {turmas.length} turma{turmas.length !== 1 ? 's' : ''} encontrada{turmas.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabela de Turmas */}
      <Card hover={false}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Turma</TableHeader>
              <TableHeader>Curso</TableHeader>
              <TableHeader>Estudantes</TableHeader>
              <TableHeader>Disciplinas</TableHeader>
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
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all"
                      >
                        <span className="text-white font-bold text-sm">
                          {turma.numero}{turma.letra}
                        </span>
                      </button>
                      <button
                        onClick={() => navigate(`/turmas/${turma.id}`)}
                        className="font-medium text-link-subtle text-left"
                      >
                        {formatTurmaNome(turma)}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {turma.curso?.nome || 'Curso não definido'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <HiUserGroup className="h-4 w-4" />
                      <span>{turma.estudantes_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <HiBookOpen className="h-4 w-4" />
                      <span>{turma.disciplinas_count || 0}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmpty
                colSpan={4}
                message={anosDisponiveis.length > 0
                  ? `Nenhuma turma encontrada para ${anoLetivo}`
                  : 'Nenhuma turma cadastrada'
                }
              />
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
