import { Routes, Route, Navigate } from 'react-router-dom'
import AuthLayout from './layouts/AuthLayout'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import Login from './pages/Login'
import RecuperarSenha from './pages/RecuperarSenha'
import RedefinirSenha from './pages/RedefinirSenha'
import Dashboard from './pages/Dashboard'
import Estudantes from './pages/Estudantes'
import EstudanteForm from './pages/EstudanteForm'
import EstudanteDetalhes from './pages/EstudanteDetalhes'
import Turmas from './pages/Turmas'
import TurmaForm from './pages/TurmaForm'
import TurmaDetalhes from './pages/TurmaDetalhes'
import Avisos from './pages/Avisos'
import Cursos from './pages/Cursos'
import CursoForm from './pages/CursoForm'
import Disciplinas from './pages/Disciplinas'
import DisciplinaForm from './pages/DisciplinaForm'
import Funcionarios from './pages/Funcionarios'
import FuncionarioForm from './pages/FuncionarioForm'
import FuncionarioDetalhes from './pages/FuncionarioDetalhes'
import FuncionarioCredenciais from './pages/FuncionarioCredenciais'
import NotFound from './pages/NotFound'
import Configuracoes from './pages/Configuracoes'
import CalendarioDetalhes from './pages/CalendarioDetalhes'
import CalendarioForm from './pages/CalendarioForm'

// Constantes de perfis para evitar repetição
const GESTAO_ONLY = ['GESTAO']
const GESTAO_SECRETARIA = ['GESTAO', 'SECRETARIA']
const FUNCIONARIOS = ['GESTAO', 'SECRETARIA', 'PROFESSOR', 'MONITOR']

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
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/avisos" element={<Avisos />} />

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
        <Route path="/turmas/:id/editar" element={
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><TurmaForm /></ProtectedRoute>
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
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><Estudantes /></ProtectedRoute>
        } />
        <Route path="/estudantes/novo" element={
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><EstudanteForm /></ProtectedRoute>
        } />
        <Route path="/estudantes/:cpf" element={
          <ProtectedRoute allowedRoles={GESTAO_SECRETARIA}><EstudanteDetalhes /></ProtectedRoute>
        } />
        <Route path="/estudantes/:cpf/editar" element={
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
        <Route path="/minhas-turmas" element={<PlaceholderPage title="Minhas Turmas" />} />
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
