import { Link } from 'react-router-dom'
import { Button, Card } from '../components/ui'
import { HiHome } from 'react-icons/hi'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <div className="py-8">
          <div className="text-8xl font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent mb-4">
            404
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Página não encontrada
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            A página que você está procurando não existe ou foi movida.
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

