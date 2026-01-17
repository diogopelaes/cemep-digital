import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import api from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token')
    if (token) {
      try {
        const response = await api.get('/users/me/')
        setUser(response.data)
      } catch (error) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      }
    }
    setLoading(false)
  }

  const login = async (username, password) => {
    try {
      // Usa o endpoint de login híbrido (JWT + Sessão) para segurança de arquivos
      const response = await api.post('/users/login/', { username, password })
      const { access, refresh } = response.data

      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)

      const userResponse = await api.get('/users/me/')
      setUser(userResponse.data)

      toast.success('Login realizado com sucesso!')
      navigate('/dashboard')

      return { success: true }
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao fazer login'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    toast.success('Logout realizado com sucesso!')
    navigate('/login')
  }

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }))
  }

  const toggleDarkMode = async () => {
    try {
      const response = await api.post('/users/toggle_dark_mode/')
      setUser(prev => ({ ...prev, dark_mode: response.data.dark_mode }))
    } catch (error) {
      toast.error('Erro ao alterar tema')
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    toggleDarkMode,
    isAuthenticated: !!user,
    isGestao: user?.tipo_usuario === 'GESTAO',
    isSecretaria: ['GESTAO', 'SECRETARIA'].includes(user?.tipo_usuario),
    isProfessor: ['GESTAO', 'PROFESSOR'].includes(user?.tipo_usuario),
    isFuncionario: ['GESTAO', 'SECRETARIA', 'PROFESSOR', 'MONITOR'].includes(user?.tipo_usuario),
    isEstudante: user?.tipo_usuario === 'ESTUDANTE',
    isResponsavel: user?.tipo_usuario === 'RESPONSAVEL',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

