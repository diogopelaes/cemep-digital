import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardContent, Loading, Badge } from '../components/ui'
import {
  HiUserGroup, HiAcademicCap, HiClipboardList, HiCalendar,
  HiCheckCircle, HiClock, HiExclamationCircle, HiSwitchHorizontal
} from 'react-icons/hi'
import { managementAPI, coreAPI } from '../services/api'
import { formatDateBR } from '../utils/date'
import { SYSTEM_NAME } from '../config/constants'

export default function Dashboard() {
  const { user, isGestao, isFuncionario, isEstudante, isResponsavel } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [tarefas, setTarefas] = useState([])
  const [avisos, setAvisos] = useState([])
  const [anoSelecionado, setAnoSelecionado] = useState(null)
  const [anosDisponiveis, setAnosDisponiveis] = useState([])
  const [showYearModal, setShowYearModal] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Carrega anos disponíveis (para o modal de troca)
      // O ano selecionado já vem no objeto 'user' do AuthContext, não precisamos buscar de novo
      if (user?.ano_letivo_selecionado) {
        setAnoSelecionado({ ano: user.ano_letivo_selecionado }) // Mock visual simples ou buscar detalhes se precisar
      }

      // Arrays de Promises para execução paralela
      const promises = []

      // 1. Anos Disponíveis
      promises.push(coreAPI.anosLetivos.list().then(res => {
        const lista = Array.isArray(res.data) ? res.data : (res.data.results || [])
        setAnosDisponiveis(lista)
        // Atualiza objeto ano selecionado com dados completos se encontrar na lista
        if (user?.ano_letivo_selecionado) {
          const current = lista.find(a => a.ano === user.ano_letivo_selecionado)
          if (current) setAnoSelecionado(current)
        }
      }))

      // 2. Estatísticas (Gestão)
      if (isGestao) {
        promises.push(managementAPI.dashboard.estatisticas().then(res => {
          setStats({
            totalEstudantes: res.data.total_estudantes || 0,
            totalTurmas: res.data.total_turmas || 0,
            total: res.data.tarefas_total || 0,
            pendentes: res.data.tarefas_pendentes || 0,
            concluidas: res.data.tarefas_concluidas || 0,
            atrasadas: res.data.tarefas_atrasadas || 0,
          })
        }).catch(e => {
          console.warn('Erro ao carregar estatísticas:', e)
          setStats({ total: 0, pendentes: 0, concluidas: 0, totalEstudantes: 0, totalTurmas: 0 })
        }))
      }

      // 3. Avisos (Todos)
      promises.push(managementAPI.avisos.meus().then(res => {
        setAvisos(res.data.results?.slice(0, 5) || res.data?.slice?.(0, 5) || [])
      }).catch(e => console.warn('Erro ao carregar avisos:', e)))

      // 4. Tarefas (Funcionários)
      if (isFuncionario) {
        promises.push(managementAPI.tarefas.minhas().then(res => {
          setTarefas(res.data.results?.slice(0, 5) || res.data?.slice?.(0, 5) || [])
        }).catch(e => console.warn('Erro ao carregar tarefas:', e)))
      }

      // Executa tudo em paralelo
      await Promise.all(promises)

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    }
    setLoading(false)
  }

  const handleChangeYear = async (anoLetivoId) => {
    try {
      const res = await coreAPI.anoLetivoSelecionado.update(anoLetivoId)
      setAnoSelecionado(res.data.ano_letivo_details)
      setShowYearModal(false)
      // Recarrega os dados do dashboard com o novo ano
      window.location.reload()
    } catch (e) {
      console.error('Erro ao alterar ano letivo:', e)
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
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            Olá, {user?.first_name || user?.username}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Bem-vindo ao {SYSTEM_NAME}
          </p>
        </div>

        {/* Ano Letivo Selecionado */}
        {anoSelecionado && (
          <button
            onClick={() => setShowYearModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <HiCalendar className="h-5 w-5" />
            <span>Ano Letivo: {anoSelecionado.ano}</span>
            <HiSwitchHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Modal de Troca de Ano */}
      {showYearModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 max-w-md w-full animate-fade-in">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
              Selecionar Ano Letivo
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {anosDisponiveis.map((ano) => (
                <button
                  key={ano.id}
                  onClick={() => handleChangeYear(ano.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${anoSelecionado?.id === ano.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white'
                    }`}
                >
                  <span className="font-medium">{ano.ano}</span>
                  {ano.is_active && (
                    <Badge variant="success" className="text-xs">Ativo</Badge>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowYearModal(false)}
              className="mt-4 w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards - Apenas Gestão */}
      {isGestao && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Estudantes"
            value={stats.totalEstudantes || 0}
            icon={HiAcademicCap}
            color="primary"
          />
          <StatsCard
            title="Turmas Ativas"
            value={stats.totalTurmas || 0}
            icon={HiUserGroup}
            color="accent"
          />
          <StatsCard
            title="Tarefas Pendentes"
            value={stats.pendentes || 0}
            icon={HiClock}
            color="warning"
          />
          <StatsCard
            title="Tarefas Concluídas"
            value={stats.concluidas || 0}
            icon={HiCheckCircle}
            color="success"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarefas */}
        {isFuncionario && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HiClipboardList className="h-5 w-5 text-primary-500" />
                Minhas Tarefas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tarefas.length > 0 ? (
                <ul className="space-y-3">
                  {tarefas.map((tarefa) => (
                    <li
                      key={tarefa.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                    >
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">
                          {tarefa.titulo}
                        </p>
                        <p className="text-sm text-slate-500">
                          Prazo: {formatDateBR(tarefa.prazo)}
                        </p>
                      </div>
                      <Badge variant={tarefa.concluido ? 'success' : 'warning'}>
                        {tarefa.concluido ? 'Concluída' : 'Pendente'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-slate-500 py-8">
                  Nenhuma tarefa pendente
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Avisos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HiExclamationCircle className="h-5 w-5 text-accent-500" />
              Avisos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {avisos.length > 0 ? (
              <ul className="space-y-3">
                {avisos.map((aviso) => (
                  <li
                    key={aviso.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                  >
                    <p className="font-medium text-slate-800 dark:text-white">
                      {aviso.titulo}
                    </p>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {aviso.texto}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      {formatDateBR(aviso.data_aviso)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-slate-500 py-8">
                Nenhum aviso recente
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acesso Rápido */}
      <Card>
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isGestao && (
              <>
                <QuickAccessButton to="/estudantes" icon={HiAcademicCap} label="Estudantes" color="primary" />
                <QuickAccessButton to="/turmas" icon={HiUserGroup} label="Turmas" color="accent" />
                <QuickAccessButton to="/configuracoes" icon={HiCalendar} label="Configurações" color="warning" />
                <QuickAccessButton to="/tarefas" icon={HiClipboardList} label="Tarefas" color="success" />
              </>
            )}
            {(isEstudante || isResponsavel) && (
              <>
                <QuickAccessButton to="/boletim" icon={HiClipboardList} label="Boletim" color="primary" />
                <QuickAccessButton to="/avisos" icon={HiExclamationCircle} label="Avisos" color="accent" />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatsCard({ title, value, icon: Icon, color }) {
  const colors = {
    primary: 'from-primary-500 to-primary-600',
    accent: 'from-accent-500 to-accent-600',
    success: 'from-success-500 to-success-600',
    warning: 'from-warning-500 to-warning-600',
  }

  return (
    <Card hover={false}>
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{value}</p>
        </div>
      </div>
    </Card>
  )
}

function QuickAccessButton({ to, icon: Icon, label, color }) {
  const colors = {
    primary: 'from-primary-500/10 to-primary-500/5 text-primary-600 hover:from-primary-500/20',
    accent: 'from-accent-500/10 to-accent-500/5 text-accent-600 hover:from-accent-500/20',
    success: 'from-success-500/10 to-success-500/5 text-success-600 hover:from-success-500/20',
    warning: 'from-warning-500/10 to-warning-500/5 text-warning-600 hover:from-warning-500/20',
  }

  return (
    <a
      href={to}
      className={`flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br ${colors[color]} transition-all duration-200`}
    >
      <Icon className="h-8 w-8" />
      <span className="font-medium">{label}</span>
    </a>
  )
}
