import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button, Input, Card } from '../components/ui'
import { LOGO_PATH, SYSTEM_NAME } from '../config/constants'
import { HiMail, HiLockClosed } from 'react-icons/hi'

export default function Login() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await login(formData.username, formData.password)
    setLoading(false)
  }

  return (
    <div className="animate-fade-in">
      {/* Logo e Título */}
      <div className="text-center mb-8">
        <img
          src={LOGO_PATH}
          alt={SYSTEM_NAME}
          className="w-24 h-24 rounded-2xl object-cover shadow-2xl shadow-primary-500/30 mx-auto mb-6"
        />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
          {SYSTEM_NAME}
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Sistema de Gestão Escolar
        </p>
      </div>

      {/* Card de Login */}
      <Card className="animate-slide-up">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Usuário ou E-mail"
            type="text"
            placeholder="Digite seu usuário ou e-mail"
            icon={HiMail}
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />

          <Input
            label="Senha"
            type="password"
            placeholder="Digite sua senha"
            icon={HiLockClosed}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <Button
            type="submit"
            className="w-full"
            loading={loading}
          >
            Entrar
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/recuperar-senha"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Esqueceu sua senha?
          </Link>
        </div>
      </Card>

      {/* Footer */}
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">
        © {new Date().getFullYear()} {SYSTEM_NAME}. Todos os direitos reservados.
      </p>
    </div>
  )
}

