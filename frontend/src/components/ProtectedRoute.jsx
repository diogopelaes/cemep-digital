/**
 * ProtectedRoute - Bloqueia páginas por perfil de usuário
 * 
 * Funciona como o @login_required do Django - a página NÃO renderiza
 * até que o usuário esteja autenticado E tenha o perfil correto.
 * 
 * Uso:
 *   <ProtectedRoute allowedRoles={['GESTAO', 'SECRETARIA']}>
 *     <TurmaDetalhes />
 *   </ProtectedRoute>
 */
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PageLoading } from './ui/Loading'

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading, isAuthenticated } = useAuth()

    // Enquanto carrega, não mostra nada (evita flash da página)
    if (loading) {
        return <PageLoading />
    }

    // Se não está autenticado, vai pro login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    // Se o perfil do usuário não está na lista de permitidos, redireciona
    if (allowedRoles && !allowedRoles.includes(user?.tipo_usuario)) {
        return <Navigate to="/dashboard" replace />
    }

    // Tudo OK, renderiza a página
    return children
}
