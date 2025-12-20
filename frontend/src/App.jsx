import { Routes, Route, Navigate } from 'react-router-dom'
import AuthLayout from './layouts/AuthLayout'
import MainLayout from './layouts/MainLayout'

// Pages
import Login from './pages/Login'
import RecuperarSenha from './pages/RecuperarSenha'
import Dashboard from './pages/Dashboard'
import Estudantes from './pages/Estudantes'
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
import FuncionarioCredenciais from './pages/FuncionarioCredenciais'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/estudantes" element={<Estudantes />} />
        <Route path="/avisos" element={<Avisos />} />
        
        {/* Fase 1 - Cadastros Base */}
        
        {/* Fase 2 - Estrutura Escolar */}
        <Route path="/turmas" element={<Turmas />} />
        <Route path="/turmas/novo" element={<TurmaForm />} />
        <Route path="/turmas/:id" element={<TurmaDetalhes />} />
        <Route path="/turmas/:id/editar" element={<TurmaForm />} />
        <Route path="/cursos" element={<Cursos />} />
        <Route path="/cursos/novo" element={<CursoForm />} />
        <Route path="/cursos/:id/editar" element={<CursoForm />} />
        <Route path="/disciplinas" element={<Disciplinas />} />
        <Route path="/disciplinas/novo" element={<DisciplinaForm />} />
        <Route path="/disciplinas/:id/editar" element={<DisciplinaForm />} />
        <Route path="/funcionarios" element={<Funcionarios />} />
        <Route path="/funcionarios/novo" element={<FuncionarioForm />} />
        <Route path="/funcionarios/:id/editar" element={<FuncionarioForm />} />
        <Route path="/funcionarios/credenciais" element={<FuncionarioCredenciais />} />
        
        {/* Placeholders para outras páginas */}
        <Route path="/calendario" element={<PlaceholderPage title="Calendário" />} />
        <Route path="/tarefas" element={<PlaceholderPage title="Tarefas" />} />
        <Route path="/relatorios" element={<PlaceholderPage title="Relatórios" />} />
        <Route path="/configuracoes" element={<PlaceholderPage title="Configurações" />} />
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

