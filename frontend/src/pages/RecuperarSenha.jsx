import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, Card } from '../components/ui'
import { HiMail, HiArrowLeft } from 'react-icons/hi'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function RecuperarSenha() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await authAPI.resetPassword({ email })
      setSent(true)
      toast.success('E-mail de recuperação enviado!')
    } catch (error) {
      toast.error(error.response?.data?.email?.[0] || 'Erro ao enviar e-mail')
    }
    
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="animate-fade-in text-center">
        <Card>
          <div className="py-8">
            <div className="w-16 h-16 rounded-full bg-success-500/10 flex items-center justify-center mx-auto mb-4">
              <HiMail className="h-8 w-8 text-success-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              E-mail Enviado!
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Verifique sua caixa de entrada e siga as instruções.
            </p>
            <Link to="/login">
              <Button variant="secondary" icon={HiArrowLeft}>
                Voltar ao Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
          Recuperar Senha
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Digite seu e-mail para receber uma nova senha
        </p>
      </div>

      <Card className="animate-slide-up">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="E-mail"
            type="email"
            placeholder="Digite seu e-mail"
            icon={HiMail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button
            type="submit"
            className="w-full"
            loading={loading}
          >
            Enviar
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600"
          >
            <HiArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Link>
        </div>
      </Card>
    </div>
  )
}

