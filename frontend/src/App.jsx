import { Routes, Route, Navigate } from 'react-router-dom'
import AuthLayout from './layouts/AuthLayout'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { ReferenceProvider } from './contexts/ReferenceContext'
import { useAuth } from './contexts/AuthContext'

// Pages comuns
import Login from './pages/Login'
import RecuperarSenha from './pages/RecuperarSenha'
import RedefinirSenha from './pages/RedefinirSenha'
import Avisos from './pages/Avisos'
import NotFound from './pages/NotFound'
import GradeTurma from './pages/GradeTurma'

// Dashboards por perfil
import DashboardGestao from './pages/gestao-secretaria/DashboardGestao'
import DashboardProfessor from './pages/professor/DashboardProfessor'
import DashboardMonitor from './pages/monitor/DashboardMonitor'
import DashboardEstudante from './pages/estudante-responsavel/DashboardEstudante'

// Pages de Gestão/Secretaria
import Estudantes from './pages/gestao-secretaria/Estudantes'
import EstudanteForm from './pages/gestao-secretaria/EstudanteForm'
import EstudanteDetalhes from './pages/gestao-secretaria/EstudanteDetalhes'
import Turmas from './pages/gestao-secretaria/Turmas'
import TurmaForm from './pages/gestao-secretaria/TurmaForm'
import TurmaDetalhes from './pages/gestao-secretaria/TurmaDetalhes'
import GradeHorariaForm from './pages/gestao-secretaria/GradeHorariaForm'
import Carometro from './pages/gestao-secretaria/Carometro'
import Cursos from './pages/gestao-secretaria/Cursos'
import CursoForm from './pages/gestao-secretaria/CursoForm'
import Disciplinas from './pages/gestao-secretaria/Disciplinas'
import DisciplinaForm from './pages/gestao-secretaria/DisciplinaForm'
import Funcionarios from './pages/gestao-secretaria/Funcionarios'
import FuncionarioForm from './pages/gestao-secretaria/FuncionarioForm'
import FuncionarioDetalhes from './pages/gestao-secretaria/FuncionarioDetalhes'
import FuncionarioCredenciais from './pages/gestao-secretaria/FuncionarioCredenciais'
import Configuracoes from './pages/gestao-secretaria/Configuracoes'
import CalendarioDetalhes from './pages/gestao-secretaria/CalendarioDetalhes'
import CalendarioForm from './pages/gestao-secretaria/CalendarioForm'

// Pages do Professor
import MinhasTurmas from './pages/professor/MinhasTurmas'
import MinhaTurmaDetalhes from './pages/professor/MinhaTurmaDetalhes'
import PlanoAula from './pages/professor/PlanoAula'
import PlanoAulaForm from './pages/professor/PlanoAulaForm'
import AulaFaltas from './pages/professor/AulaFaltas'
import AulaFaltasOptions from './pages/professor/AulaFaltasOptions'
import AulaFaltasForm from './pages/professor/AulaFaltasForm'
import GradeProfessor from './pages/professor/GradeProfessor'
import Avaliacoes from './pages/professor/Avaliacoes'
import AvaliacoesForm from './pages/professor/AvaliacoesForm'
import AvaliacaoDigitarNota from './pages/professor/AvaliacaoDigitarNota'
import AvaliacaoConfigProfessor from './pages/professor/AvaliacaoConfigProfessor'

// Constantes de perfis para evitar repetição
const GESTAO_ONLY = ['GESTAO']
const GESTAO_SECRETARIA = ['GESTAO', 'SECRETARIA']
const FUNCIONARIOS = ['GESTAO', 'SECRETARIA', 'PROFESSOR', 'MONITOR']
const PROFESSOR_ONLY = ['PROFESSOR']

// Componente que renderiza o Dashboard correto baseado no perfil
function DashboardRouter() {
  const { user, isGestao, isSecretaria, isProfessor, isMonitor, isEstudante, isResponsavel } = useAuth()

  if (isGestao || isSecretaria) return <DashboardGestao />
  if (isProfessor) return <DashboardProfessor />
  if (isMonitor) return <DashboardMonitor />
  if (isEstudante || isResponsavel) return <DashboardEstudante />

  // Fallback - não deveria acontecer
  return <DashboardGestao />
}

function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/redefinir-senha/:uid/:token" element={<RedefinirSenha />} />
      </Route>

      {/* Protected Routes */}
      <Route element={
        <ReferenceProvider>
          <MainLayout />
        </ReferenceProvider>
      }>
        <Route path="/dashboard" element={<DashboardRouter />} />
        <Route path="/avisos" element={<Avisos />} />

        {/* Grade Horária pública (todos autenticados) */}
        <Route path="/grade-turma/:ano/:numero/:letra" element={<GradeTurma />} />

        {/* Rotas de Gestão/Secretaria */}
        <Route path="/turmas" element={
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><Turmas /></ProtectedRoute>
        } />
        <Route path="/turmas/novo" element={
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><TurmaForm /></ProtectedRoute>
        } />
        <Route path="/turmas/:id" element={
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><TurmaDetalhes /></ProtectedRoute>
        } />
        <Route path="/turmas/:id/grade-horaria/editar" element={
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><GradeHorariaForm /></ProtectedRoute>
        } />
        <Route path="/turmas/:id/editar" element={
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><TurmaForm /></ProtectedRoute>
        } />
        <Route path="/turmas/:id/carometro" element={
          <ProtectedRoute allowedRoles={FUNCIONARIOS}><Carometro /></ProtectedRoute>
        } />
        <Route path="/cursos" element={
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><Cursos /></ProtectedRoute>
        } />
        <Route path="/cursos/novo" element={
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><CursoForm /></ProtectedRoute>
        } />
        <Route path="/cursos/:id/editar" element={
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><CursoForm /></ProtectedRoute>
        } />

        {/* Rotas de Estudantes */}
        <Route path="/estudantes" element={
          <ProtectedRoute allowedRoles={FUNCIONARIOS}><Estudantes /></ProtectedRoute>
        } />
        <Route path="/estudantes/novo" element={
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><EstudanteForm /></ProtectedRoute>
        } />
        <Route path="/estudantes/:id" element={
          <ProtectedRoute allowedRoles={FUNCIONARIOS}><EstudanteDetalhes /></ProtectedRoute>
        } />
        <Route path="/estudantes/:id/editar" element={
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><EstudanteForm /></ProtectedRoute>
        } />
        <Route path="/disciplinas" element={
          <ProtectedRoute allowedRoles={FUNCIONARIOS}><Disciplinas /></ProtectedRoute>
        } />
        <Route path="/disciplinas/novo" element={
          <ProtectedRoute allowedRoles={GESTAO_ONLY}><DisciplinaForm /></ProtectedRoute>
        } />
        <Route path="/disciplinas/:id/editar" element={
          <ProtectedRoute allowedRoles={GESTAO_ONLY}><DisciplinaForm /></ProtectedRoute>
        } />

        {/* Rotas exclusivas de Gestão */}
        <Route path="/funcionarios" element={
          <ProtectedRoute allowedRoles={GESTAO_ONLY}><Funcionarios /></ProtectedRoute>
        } />
        <Route path="/funcionarios/novo" element={
          <ProtectedRoute allowedRoles={GESTAO_ONLY}><FuncionarioForm /></ProtectedRoute>
        } />
        <Route path="/funcionarios/:id" element={
          <ProtectedRoute allowedRoles={GESTAO_ONLY}><FuncionarioDetalhes /></ProtectedRoute>
        } />
        <Route path="/funcionarios/:id/editar" element={
          <ProtectedRoute allowedRoles={GESTAO_ONLY}><FuncionarioForm /></ProtectedRoute>
        } />
        <Route path="/funcionarios/credenciais" element={
          <ProtectedRoute allowedRoles={GESTAO_ONLY}><FuncionarioCredenciais /></ProtectedRoute>
        } />

        {/* Placeholders para outras páginas */}
        <Route path="/calendario" element={<PlaceholderPage title="Calendário" />} />
        <Route path="/tarefas" element={
          <ProtectedRoute allowedRoles={FUNCIONARIOS}><PlaceholderPage title="Tarefas" /></ProtectedRoute>
        } />
        <Route path="/relatorios" element={
          <ProtectedRoute allowedRoles={GESTAO_ONLY}><PlaceholderPage title="Relatórios" /></ProtectedRoute>
        } />
        <Route path="/configuracoes" element={
          <ProtectedRoute allowedRoles={GESTAO_ONLY}><Configuracoes /></ProtectedRoute>
        } />
        <Route path="/configuracoes/calendario/:ano" element={
          <ProtectedRoute allowedRoles={GESTAO_ONLY}><CalendarioDetalhes /></ProtectedRoute>
        } />
        <Route path="/configuracoes/calendario/:ano/editar" element={
          <ProtectedRoute allowedRoles={GESTAO_ONLY}><CalendarioForm /></ProtectedRoute>
        } />
        {/* Rotas exclusivas do Professor */}
        <Route path="/minha-grade" element={
          <ProtectedRoute allowedRoles={[...PROFESSOR_ONLY, ...GESTAO_SECRETARIA]}><GradeProfessor /></ProtectedRoute>
        } />
        <Route path="/minhas-turmas" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><MinhasTurmas /></ProtectedRoute>
        } />
        <Route path="/minhas-turmas/:id" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><MinhaTurmaDetalhes /></ProtectedRoute>
        } />
        <Route path="/plano-aula" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><PlanoAula /></ProtectedRoute>
        } />
        <Route path="/plano-aula/novo" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><PlanoAulaForm /></ProtectedRoute>
        } />
        <Route path="/plano-aula/:id/editar" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><PlanoAulaForm /></ProtectedRoute>
        } />
        <Route path="/aula-faltas" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><AulaFaltas /></ProtectedRoute>
        } />
        <Route path="/aula-faltas/nova" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><AulaFaltasOptions /></ProtectedRoute>
        } />
        <Route path="/aula-faltas/nova/:professorDisciplinaTurmaId" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><AulaFaltasForm /></ProtectedRoute>
        } />
        <Route path="/aula-faltas/:id/editar" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><AulaFaltasForm /></ProtectedRoute>
        } />
        <Route path="/avaliacoes" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><Avaliacoes /></ProtectedRoute>
        } />
        <Route path="/avaliacoes/nova" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><AvaliacoesForm /></ProtectedRoute>
        } />
        <Route path="/avaliacoes/:id/editar" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><AvaliacoesForm /></ProtectedRoute>
        } />
        <Route path="/avaliacoes/:id/notas" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><AvaliacaoDigitarNota /></ProtectedRoute>
        } />
        <Route path="/avaliacoes/configuracao" element={
          <ProtectedRoute allowedRoles={PROFESSOR_ONLY}><AvaliacaoConfigProfessor /></ProtectedRoute>
        } />
        <Route path="/diario" element={<PlaceholderPage title="Diário de Classe" />} />
        <Route path="/notas" element={<PlaceholderPage title="Notas" />} />
        <Route path="/boletim" element={<PlaceholderPage title="Boletim" />} />
        <Route path="/ocorrencias" element={<PlaceholderPage title="Ocorrências" />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

// Componente placeholder para páginas não implementadas
function PlaceholderPage({ title }) {
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">
        {title}
      </h1>
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          Esta página está em desenvolvimento.
        </p>
      </div>
    </div>
  )
}

export default App
