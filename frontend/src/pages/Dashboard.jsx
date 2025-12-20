import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardContent, Loading, Badge } from '../components/ui'
import { 
  HiUserGroup, HiAcademicCap, HiClipboardList, HiCalendar,
  HiCheckCircle, HiClock, HiExclamationCircle
} from 'react-icons/hi'
import { managementAPI, academicAPI, coreAPI } from '../services/api'
import { formatDateBR } from '../utils/date'

export default function Dashboard() {
  const { user, isGestao, isFuncionario, isEstudante, isResponsavel } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [tarefas, setTarefas] = useState([])
  const [avisos, setAvisos] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      if (isGestao) {
        // Carrega estatísticas - cada uma individualmente para não falhar tudo
        try {
          const [tarefasRes, estudantesRes, turmasRes] = await Promise.all([
            managementAPI.tarefas.relatorio(),
            academicAPI.estudantes.list({ page_size: 1 }),
            coreAPI.turmas.list({ page_size: 1 }),
          ])
          
          setStats({
            ...tarefasRes.data,
            totalEstudantes: estudantesRes.data.count || 0,
            totalTurmas: turmasRes.data.count || 0,
          })
        } catch (e) {
          console.warn('Erro ao carregar estatísticas:', e)
          setStats({ total: 0, pendentes: 0, concluidas: 0, totalEstudantes: 0, totalTurmas: 0 })
        }
      }
      
      // Avisos para todos
      try {
        const avisosRes = await managementAPI.avisos.meus()
        setAvisos(avisosRes.data.results?.slice(0, 5) || avisosRes.data?.slice?.(0, 5) || [])
      } catch (e) {
        console.warn('Erro ao carregar avisos:', e)
      }
      
      // Tarefas para funcionários
      if (isFuncionario) {
        try {
          const tarefasRes = await managementAPI.tarefas.minhas()
          setTarefas(tarefasRes.data.results?.slice(0, 5) || tarefasRes.data?.slice?.(0, 5) || [])
        } catch (e) {
          console.warn('Erro ao carregar tarefas (usuário pode não ter perfil de funcionário):', e)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
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
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
          Olá, {user?.first_name || user?.username}! 👋
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Bem-vindo ao CEMEP Digital
        </p>
      </div>

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
                <QuickAccessButton to="/calendario" icon={HiCalendar} label="Calendário" color="warning" />
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

