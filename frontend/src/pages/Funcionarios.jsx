import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, Button, Input, DateInput, Select, Table, TableHead, TableBody, TableRow, 
  TableHeader, TableCell, TableEmpty, Loading, Badge
} from '../components/ui'
import { HiPlus, HiPencil, HiCalendar, HiCheck, HiX, HiEye } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import { formatDateBR } from '../utils/date'
import toast from 'react-hot-toast'

const TIPOS_USUARIO = [
  { value: 'GESTAO', label: 'Gestão' },
  { value: 'SECRETARIA', label: 'Secretaria' },
  { value: 'PROFESSOR', label: 'Professor' },
  { value: 'MONITOR', label: 'Monitor' },
]

export default function Funcionarios() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [funcionarios, setFuncionarios] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('')

  // Períodos de Trabalho
  const [periodosExpandido, setPeriodosExpandido] = useState(null)
  const [periodos, setPeriodos] = useState([])
  const [loadingPeriodos, setLoadingPeriodos] = useState(false)
  const [novoPeriodo, setNovoPeriodo] = useState({ data_entrada: '', data_saida: '' })

  useEffect(() => {
    loadFuncionarios()
  }, [filtroTipo, filtroAtivo])

  const loadFuncionarios = async () => {
    try {
      const params = {}
      if (filtroTipo) params['usuario__tipo_usuario'] = filtroTipo
      if (filtroAtivo !== '') params.ativo = filtroAtivo
      
      const response = await coreAPI.funcionarios.list(params)
      setFuncionarios(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao carregar funcionários')
    }
    setLoading(false)
  }

  const handleToggleAtivo = async (funcionario) => {
    try {
      await coreAPI.funcionarios.update(funcionario.id, {
        ativo: !funcionario.ativo,
      })
      toast.success(funcionario.ativo ? 'Funcionário desativado' : 'Funcionário ativado')
      loadFuncionarios()
    } catch (error) {
      toast.error('Erro ao alterar status')
    }
  }

  // Períodos de Trabalho
  const togglePeriodos = async (funcionario) => {
    if (periodosExpandido === funcionario.id) {
      setPeriodosExpandido(null)
      setPeriodos([])
      return
    }

    setPeriodosExpandido(funcionario.id)
    setLoadingPeriodos(true)
    try {
      const response = await coreAPI.periodosTrabalho.list({ funcionario: funcionario.id })
      setPeriodos(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao carregar períodos')
    }
    setLoadingPeriodos(false)
  }

  const handleAddPeriodo = async (e) => {
    e.preventDefault()
    
    if (!novoPeriodo.data_entrada) {
      toast.error('Data de entrada é obrigatória')
      return
    }

    try {
      await coreAPI.periodosTrabalho.create({
        funcionario: periodosExpandido,
        data_entrada: novoPeriodo.data_entrada,
        data_saida: novoPeriodo.data_saida || null,
      })
      toast.success('Período adicionado!')
      setNovoPeriodo({ data_entrada: '', data_saida: '' })
      const response = await coreAPI.periodosTrabalho.list({ funcionario: periodosExpandido })
      setPeriodos(response.data.results || response.data)
    } catch (error) {
      const msg = error.response?.data?.non_field_errors?.[0] || 
                  error.response?.data?.detail ||
                  'Erro ao adicionar período'
      toast.error(msg)
    }
  }

  const handleDeletePeriodo = async (id) => {
    try {
      await coreAPI.periodosTrabalho.delete(id)
      toast.success('Período removido!')
      const response = await coreAPI.periodosTrabalho.list({ funcionario: periodosExpandido })
      setPeriodos(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao remover período')
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
            Funcionários
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie os funcionários e seus períodos de trabalho
          </p>
        </div>
        <Button icon={HiPlus} onClick={() => navigate('/funcionarios/novo')}>
          Novo Funcionário
        </Button>
      </div>

      {/* Filtros */}
      <Card hover={false}>
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <Select
              label="Tipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              options={TIPOS_USUARIO}
              placeholder="Todos"
            />
          </div>
          <div className="w-48">
            <Select
              label="Status"
              value={filtroAtivo}
              onChange={(e) => setFiltroAtivo(e.target.value)}
              options={[
                { value: 'true', label: 'Ativos' },
                { value: 'false', label: 'Inativos' },
              ]}
              placeholder="Todos"
            />
          </div>
        </div>
      </Card>

      {/* Lista de Funcionários */}
      <div className="space-y-3">
        {funcionarios.length > 0 ? (
          funcionarios.map((func) => (
            <Card key={func.id} hover={false}>
              {/* Info Principal */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {func.usuario?.first_name?.[0] || 'F'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-slate-800 dark:text-white">
                        {func.nome_completo || func.usuario?.first_name}
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300">
                        Mat. {func.matricula}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {func.funcao}
                    </p>
                    <p className="text-xs text-slate-400">
                      {func.usuario?.email}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="primary">
                    {func.usuario?.tipo_usuario}
                  </Badge>
                  
                  <button
                    onClick={() => handleToggleAtivo(func)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      func.ativo 
                        ? 'bg-success-500/10 text-success-600 hover:bg-success-500/20' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    {func.ativo ? (
                      <>
                        <HiCheck className="h-4 w-4" />
                        Ativo
                      </>
                    ) : (
                      <>
                        <HiX className="h-4 w-4" />
                        Inativo
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => togglePeriodos(func)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                      periodosExpandido === func.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-primary-500/10 text-primary-600 hover:bg-primary-500/20'
                    }`}
                  >
                    <HiCalendar className="h-5 w-5" />
                    Períodos
                  </button>

                  <button
                    onClick={() => navigate(`/funcionarios/${func.id}/editar`)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-primary-600 transition-colors"
                    title="Editar"
                  >
                    <HiPencil className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Seção de Períodos Expandida */}
              {periodosExpandido === func.id && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-4">
                    Períodos de Trabalho
                  </h4>

                  {/* Formulário Novo Período */}
                  <form onSubmit={handleAddPeriodo} className="flex flex-wrap gap-3 mb-4">
                    <div className="w-48">
                      <DateInput
                        label="Data de Entrada"
                        value={novoPeriodo.data_entrada}
                        onChange={(e) => setNovoPeriodo({ ...novoPeriodo, data_entrada: e.target.value })}
                      />
                    </div>
                    <div className="w-48">
                      <DateInput
                        label="Data de Saída"
                        value={novoPeriodo.data_saida}
                        onChange={(e) => setNovoPeriodo({ ...novoPeriodo, data_saida: e.target.value })}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" size="sm">
                        <HiPlus className="h-5 w-5" />
                        Adicionar
                      </Button>
                    </div>
                  </form>

                  {/* Lista de Períodos */}
                  {loadingPeriodos ? (
                    <div className="flex justify-center py-6">
                      <Loading size="md" />
                    </div>
                  ) : periodos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {periodos.map((periodo) => (
                        <div 
                          key={periodo.id}
                          className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                        >
                          <div className="flex items-center gap-3">
                            <HiCalendar className="h-5 w-5 text-primary-500" />
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white">
                                {formatDateBR(periodo.data_entrada)}
                              </p>
                              <p className="text-sm text-slate-500">
                                até {periodo.data_saida 
                                  ? formatDateBR(periodo.data_saida)
                                  : <span className="text-success-600">Atual</span>
                                }
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeletePeriodo(periodo.id)}
                            className="p-2 rounded-lg hover:bg-danger-500/10 text-danger-600 transition-colors"
                          >
                            <HiX className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-6">
                      Nenhum período de trabalho registrado
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))
        ) : (
          <Card hover={false}>
            <p className="text-center text-slate-500 py-8">
              Nenhum funcionário encontrado
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
