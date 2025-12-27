import { HiUserGroup } from 'react-icons/hi'
import { Card } from '../ui'

/**
 * Componente placeholder para estudantes da turma
 */
export default function TurmaEstudantes() {
    return (
        <Card hover={false}>
            <div className="text-center py-12 text-slate-500">
                <HiUserGroup className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Estudantes</p>
                <p className="text-sm mt-2">
                    Esta funcionalidade será implementada na Fase 3
                </p>
            </div>
        </Card>
    )
}
