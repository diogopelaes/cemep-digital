import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Select, Loading } from '../components/ui'
import { HiPlus, HiUserGroup, HiTrash, HiCheck, HiX, HiBookOpen } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function Turmas() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [turmas, setTurmas] = useState([])
  const [anosDisponiveis, setAnosDisponiveis] = useState([])
  const [anoLetivo, setAnoLetivo] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

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
      // Busca todas as turmas para extrair os anos únicos
      const response = await coreAPI.turmas.list()
      const todasTurmas = response.data.results || response.data
      
      // Extrai anos únicos e ordena decrescente
      const anos = [...new Set(todasTurmas.map(t => t.ano_letivo))].sort((a, b) => b - a)
      
      if (anos.length > 0) {
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

  const handleDelete = async (turma) => {
    try {
      await coreAPI.turmas.delete(turma.id)
      toast.success('Turma excluída com sucesso!')
      setConfirmDelete(null)
      loadTurmas()
      // Recarrega anos disponíveis caso tenha removido a última turma do ano
      loadAnosDisponiveis()
    } catch (error) {
      const msg = error.response?.data?.detail || 'Erro ao excluir turma. Verifique se não há alunos ou disciplinas vinculadas.'
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

      {/* Cards de Turmas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {turmas.length > 0 ? (
          turmas.map((turma) => (
            <Card key={turma.id} hover={false}>
              {confirmDelete?.id === turma.id ? (
                <div className="text-center py-4">
                  <p className="text-danger-600 dark:text-danger-400 font-medium mb-4">
                    Excluir "{turma.numero}º {turma.letra}"?
                  </p>
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleDelete(turma)}
                      className="p-2 rounded-lg bg-danger-500/10 hover:bg-danger-500/20 text-danger-600 transition-colors"
                    >
                      <HiCheck className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <HiX className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex items-center gap-4 cursor-pointer flex-1"
                      onClick={() => navigate(`/turmas/${turma.id}`)}
                    >
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
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1" title="Estudantes">
                          <HiUserGroup className="h-4 w-4" />
                          <span>0</span>
                        </div>
                        <div className="flex items-center gap-1" title="Disciplinas">
                          <HiBookOpen className="h-4 w-4" />
                          <span>{turma.disciplinas_count || 0}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setConfirmDelete(turma)}
                        className="p-2 rounded-lg hover:bg-danger-500/10 text-danger-600 transition-colors"
                        title="Excluir"
                      >
                        <HiTrash className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          ))
        ) : (
          <Card className="col-span-full text-center py-12" hover={false}>
            <HiUserGroup className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 mb-4">
              {anosDisponiveis.length > 0 
                ? `Nenhuma turma encontrada para ${anoLetivo}`
                : 'Nenhuma turma cadastrada'}
            </p>
            <Button icon={HiPlus} onClick={() => navigate('/turmas/novo')}>
              Criar Primeira Turma
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
