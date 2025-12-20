import { Routes, Route, Navigate } from 'react-router-dom'
import AuthLayout from './layouts/AuthLayout'
import MainLayout from './layouts/MainLayout'

// Pages
import Login from './pages/Login'
import RecuperarSenha from './pages/RecuperarSenha'
import Dashboard from './pages/Dashboard'
import Estudantes from './pages/Estudantes'
import Turmas from './pages/Turmas'
import Avisos from './pages/Avisos'
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
        <Route path="/turmas" element={<Turmas />} />
        <Route path="/avisos" element={<Avisos />} />
        
        {/* Placeholders para outras páginas */}
        <Route path="/funcionarios" element={<PlaceholderPage title="Funcionários" />} />
        <Route path="/disciplinas" element={<PlaceholderPage title="Disciplinas" />} />
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

