import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Button, Card } from '../components/ui'
import { HiLockClosed, HiCheck } from 'react-icons/hi'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function RedefinirSenha() {
    const { uid, token } = useParams()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [formData, setFormData] = useState({
        new_password: '',
        re_new_password: ''
    })

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (formData.new_password !== formData.re_new_password) {
            toast.error('As senhas não coincidem.')
            return
        }

        if (formData.new_password.length < 8) {
            toast.error('A senha deve ter no mínimo 8 caracteres.')
            return
        }

        setLoading(true)

        try {
            await authAPI.resetPasswordConfirm({
                uid,
                token,
                new_password: formData.new_password,
                re_new_password: formData.re_new_password
            })

            setSuccess(true)
            toast.success('Senha redefinida com sucesso!')

            setTimeout(() => {
                navigate('/login')
            }, 3000)

        } catch (error) {
            console.error(error)
            const msg = error.response?.data?.new_password?.[0] ||
                error.response?.data?.token?.[0] ||
                error.response?.data?.uid?.[0] ||
                'Erro ao redefinir senha. O link pode ter expirado.'
            toast.error(msg)
        }

        setLoading(false)
    }

    if (success) {
        return (
            <div className="animate-fade-in text-center">
                <Card hover={false}>
                    <div className="py-8">
                        <div className="w-16 h-16 rounded-full bg-success-500/10 flex items-center justify-center mx-auto mb-4">
                            <HiCheck className="h-8 w-8 text-success-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                            Senha Alterada!
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            Você será redirecionado para o login.
                        </p>
                        <Link to="/login">
                            <Button variant="primary">
                                Ir para Login
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
                    Nova Senha
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Crie uma nova senha para sua conta
                </p>
            </div>

            <Card hover={false}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="label">Nova Senha</label>
                        <input
                            type="password"
                            name="new_password"
                            placeholder="Mínimo 8 caracteres"
                            value={formData.new_password}
                            onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                            className="input"
                            autoComplete="new-password"
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Confirmar Nova Senha</label>
                        <input
                            type="password"
                            name="re_new_password"
                            placeholder="Repita a senha"
                            value={formData.re_new_password}
                            onChange={(e) => setFormData({ ...formData, re_new_password: e.target.value })}
                            className="input"
                            autoComplete="new-password"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        loading={loading}
                        icon={HiLockClosed}
                    >
                        Redefinir Senha
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600"
                    >
                        Voltar ao login
                    </Link>
                </div>
            </Card>
        </div>
    )
}
