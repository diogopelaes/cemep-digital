import { HiPencil, HiPhotograph } from 'react-icons/hi'
import { Button } from '../ui'

/**
 * Header da página TurmaDetalhes
 * 
 * @param {Object} props
 * @param {Object} props.turma - Dados da turma
 * @param {Function} props.onBack - Callback para voltar
 * @param {Function} props.onEdit - Callback para editar
 */
export default function TurmaHeader({ turma, onBack, onEdit, onCarometro }) {
    if (!turma) return null

    return (
        <div className="flex items-center gap-4">

            <div className="flex-1">
                <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-xl">
                            {turma.numero}{turma.letra}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                            {turma.nome_completo || `${turma.numero}º ${turma.nomenclatura === 'SERIE' ? 'Série' : (turma.nomenclatura === 'ANO' ? 'Ano' : 'Módulo')} ${turma.letra}`}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            {turma.curso?.nome} • {turma.ano_letivo}
                        </p>
                    </div>
                </div>
            </div>
            <Button
                variant="secondary"
                icon={HiPencil}
                onClick={onEdit}
            >
                Editar
            </Button>
            {onCarometro && (
                <Button
                    variant="secondary"
                    icon={HiPhotograph}
                    onClick={onCarometro}
                >
                    Carômetro
                </Button>
            )}
        </div>
    )
}
