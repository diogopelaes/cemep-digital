import { Link } from 'react-router-dom'
import { Button, Card } from '../components/ui'
import { HiLockClosed, HiHome } from 'react-icons/hi'

export default function Forbidden() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-md w-full text-center">
                <div className="py-8">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-red-100 text-red-600 rounded-full dark:bg-red-900/30 dark:text-red-400">
                            <HiLockClosed className="w-16 h-16" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                        Acesso Negado
                    </h1>

                    <p className="text-slate-500 dark:text-slate-400 mb-8">
                        Você não tem permissão para acessar este recurso.<br />
                        Se acredita que isso é um erro, contate o administrador.
                    </p>

                    <Link to="/dashboard">
                        <Button icon={HiHome}>
                            Voltar ao Dashboard
                        </Button>
                    </Link>
                </div>
            </Card>
        </div>
    )
}
