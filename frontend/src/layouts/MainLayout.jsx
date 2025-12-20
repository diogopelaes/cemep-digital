import { useState } from 'react'
import { Outlet, Navigate, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { PageLoading } from '../components/ui/Loading'
import { LOGO_PATH, SYSTEM_NAME } from '../config/constants'
import { 
  HiHome, HiUserGroup, HiAcademicCap, HiClipboardList,
  HiCalendar, HiCog, HiLogout, HiMenu, HiX, HiSun, HiMoon,
  HiBell, HiUsers, HiDocumentText, HiChartBar, HiBookOpen
} from 'react-icons/hi'

const menuItems = {
  GESTAO: [
    { path: '/dashboard', label: 'Dashboard', icon: HiHome },
    { path: '/funcionarios', label: 'Funcionários', icon: HiUserGroup },
    { path: '/estudantes', label: 'Estudantes', icon: HiAcademicCap },
    { path: '/turmas', label: 'Turmas', icon: HiUsers },
    { path: '/cursos', label: 'Cursos', icon: HiAcademicCap },
    { path: '/disciplinas', label: 'Disciplinas', icon: HiBookOpen },
    { path: '/calendario', label: 'Calendário', icon: HiCalendar },
    { path: '/tarefas', label: 'Tarefas', icon: HiClipboardList },
    { path: '/avisos', label: 'Avisos', icon: HiBell },
    { path: '/relatorios', label: 'Relatórios', icon: HiChartBar },
    { path: '/configuracoes', label: 'Configurações', icon: HiCog },
  ],
  SECRETARIA: [
    { path: '/dashboard', label: 'Dashboard', icon: HiHome },
    { path: '/estudantes', label: 'Estudantes', icon: HiAcademicCap },
    { path: '/turmas', label: 'Turmas', icon: HiUsers },
    { path: '/calendario', label: 'Calendário', icon: HiCalendar },
    { path: '/avisos', label: 'Avisos', icon: HiBell },
  ],
  PROFESSOR: [
    { path: '/dashboard', label: 'Dashboard', icon: HiHome },
    { path: '/minhas-turmas', label: 'Minhas Turmas', icon: HiUsers },
    { path: '/diario', label: 'Diário de Classe', icon: HiDocumentText },
    { path: '/notas', label: 'Notas', icon: HiClipboardList },
    { path: '/tarefas', label: 'Tarefas', icon: HiClipboardList },
    { path: '/avisos', label: 'Avisos', icon: HiBell },
  ],
  ESTUDANTE: [
    { path: '/dashboard', label: 'Dashboard', icon: HiHome },
    { path: '/boletim', label: 'Boletim', icon: HiDocumentText },
    { path: '/avisos', label: 'Avisos', icon: HiBell },
  ],
  RESPONSAVEL: [
    { path: '/dashboard', label: 'Dashboard', icon: HiHome },
    { path: '/boletim', label: 'Boletim', icon: HiDocumentText },
    { path: '/ocorrencias', label: 'Ocorrências', icon: HiClipboardList },
    { path: '/avisos', label: 'Avisos', icon: HiBell },
  ],
  MONITOR: [
    { path: '/dashboard', label: 'Dashboard', icon: HiHome },
    { path: '/tarefas', label: 'Tarefas', icon: HiClipboardList },
    { path: '/avisos', label: 'Avisos', icon: HiBell },
  ],
}

export default function MainLayout() {
  const { isAuthenticated, loading, user, logout } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  if (loading) {
    return <PageLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const menu = menuItems[user?.tipo_usuario] || menuItems.ESTUDANTE

  return (
    <div className="min-h-screen flex">
      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72
        glass border-r border-slate-200/50 dark:border-slate-700/50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <img 
                src={LOGO_PATH} 
                alt={SYSTEM_NAME}
                className="w-12 h-12 rounded-xl object-cover shadow-lg"
              />
              <div>
                <h1 className="font-bold text-xl text-slate-800 dark:text-white">CEMEP</h1>
                <p className="text-xs text-slate-500">Digital</p>
              </div>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {menu.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user?.tipo_usuario}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleDarkMode}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {darkMode ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
              </button>
              <button
                onClick={logout}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-danger-500/10 text-danger-600 hover:bg-danger-500/20 transition-colors"
              >
                <HiLogout className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header Mobile */}
        <header className="lg:hidden glass border-b border-slate-200/50 dark:border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <HiMenu className="h-6 w-6" />
            </button>
            <h1 className="font-bold text-lg">CEMEP Digital</h1>
            <div className="w-10" />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

