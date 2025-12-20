import { useState, useEffect } from 'react'
import { 
  Card, Button, Input, Table, TableHead, TableBody, TableRow, 
  TableHeader, TableCell, TableEmpty, Badge, Modal, ModalFooter,
  Loading, Select
} from '../components/ui'
import { HiPlus, HiSearch, HiPencil, HiEye, HiUserGroup } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function Turmas() {
  const [loading, setLoading] = useState(true)
  const [turmas, setTurmas] = useState([])
  const [cursos, setCursos] = useState([])
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear())
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [anoLetivo])

  const loadData = async () => {
    try {
      const [turmasRes, cursosRes] = await Promise.all([
        coreAPI.turmas.list({ ano_letivo: anoLetivo }),
        coreAPI.cursos.list(),
      ])
      setTurmas(turmasRes.data.results || turmasRes.data)
      setCursos(cursosRes.data.results || cursosRes.data)
    } catch (error) {
      toast.error('Erro ao carregar turmas')
    }
    setLoading(false)
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
        <Button icon={HiPlus} onClick={() => setModalOpen(true)}>
          Nova Turma
        </Button>
      </div>

      {/* Filters */}
      <Card hover={false}>
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <Select
              label="Ano Letivo"
              value={anoLetivo}
              onChange={(e) => setAnoLetivo(e.target.value)}
              options={[
                { value: 2024, label: '2024' },
                { value: 2025, label: '2025' },
                { value: 2026, label: '2026' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Cards de Turmas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {turmas.length > 0 ? (
          turmas.map((turma) => (
            <Card key={turma.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">
                      {turma.numero}{turma.letra}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-white">
                      {turma.numero}º {turma.nomenclatura === 'SERIE' ? 'Série' : turma.nomenclatura === 'ANO' ? 'Ano' : 'Módulo'} {turma.letra}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {turma.curso?.nome || 'Curso não definido'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <HiUserGroup className="h-5 w-5" />
                    <span>0 estudantes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-primary-600">
                      <HiEye className="h-5 w-5" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600">
                      <HiPencil className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="col-span-full text-center py-12">
            <p className="text-slate-500">Nenhuma turma encontrada para {anoLetivo}</p>
          </Card>
        )}
      </div>

      {/* Modal Nova Turma */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova Turma"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Número" type="number" placeholder="1" />
            <Input label="Letra" placeholder="A" maxLength={1} />
          </div>
          <Select
            label="Nomenclatura"
            options={[
              { value: 'ANO', label: 'Ano' },
              { value: 'SERIE', label: 'Série' },
              { value: 'MODULO', label: 'Módulo' },
            ]}
          />
          <Select
            label="Curso"
            options={cursos.map(c => ({ value: c.id, label: c.nome }))}
          />
          <Input label="Ano Letivo" type="number" value={anoLetivo} />
        </div>
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

