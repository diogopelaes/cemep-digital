import { HiTable } from 'react-icons/hi'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '../components/ui'

const DAYS = [
    { value: 0, label: 'Segunda' },
    { value: 1, label: 'Terça' },
    { value: 2, label: 'Quarta' },
    { value: 3, label: 'Quinta' },
    { value: 4, label: 'Sexta' },
]

/**
 * Exibe a grade horária em formato de tabela (read-only).
 * 
 * @param {Object} props
 * @param {Array} props.grades - Array de GradeHoraria com horario_aula_details e disciplina_details
 * @param {Array} props.horariosAula - Array de HorarioAula disponíveis
 */
export default function GradeHorariaDetalhes({ grades = [], horariosAula = [] }) {
    // Agrupa horários por número de aula (ignorando dia da semana)
    const aulasPorNumero = {}
    horariosAula.forEach(h => {
        if (!aulasPorNumero[h.numero]) {
            aulasPorNumero[h.numero] = h
        }
    })

    const numerosAula = Object.keys(aulasPorNumero).map(Number).sort((a, b) => a - b)

    // Cria mapa de grade: { "dia_semana-numero": disciplina }
    const gradeMap = {}
    grades.forEach(g => {
        if (g.horario_aula_details) {
            const key = `${g.horario_aula_details.dia_semana}-${g.horario_aula_details.numero}`
            gradeMap[key] = g.disciplina_details
        }
    })

    if (horariosAula.length === 0) {
        return (
            <div className="text-center py-12 space-y-4">
                <HiTable className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-slate-500 dark:text-slate-400">
                    Nenhum horário de aula configurado.
                </p>
            </div>
        )
    }

    if (grades.length === 0) {
        return (
            <div className="text-center py-12 space-y-4">
                <HiTable className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-slate-500 dark:text-slate-400">
                    Nenhuma disciplina atribuída na grade horária.
                </p>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeader className="w-20 !text-center bg-slate-50 dark:bg-slate-800">Aula</TableHeader>
                            {DAYS.map(day => (
                                <TableHeader key={day.value} className="!text-center bg-slate-50 dark:bg-slate-800">
                                    {day.label}
                                </TableHeader>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {numerosAula.map(numero => {
                            const horarioRef = aulasPorNumero[numero]
                            return (
                                <TableRow key={numero}>
                                    <TableCell className="text-center">
                                        <div className="font-bold text-slate-700 dark:text-slate-200">
                                            {numero}ª
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {horarioRef?.hora_inicio?.slice(0, 5)} - {horarioRef?.hora_fim?.slice(0, 5)}
                                        </div>
                                    </TableCell>
                                    {DAYS.map(day => {
                                        const key = `${day.value}-${numero}`
                                        const disciplina = gradeMap[key]

                                        if (!disciplina) {
                                            return (
                                                <TableCell key={day.value} className="text-center text-slate-300 dark:text-slate-600">
                                                    -
                                                </TableCell>
                                            )
                                        }

                                        return (
                                            <TableCell key={day.value} className="p-2">
                                                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                    <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                                                        {disciplina.sigla}
                                                    </span>
                                                    <span className="text-xs text-slate-500 truncate max-w-[80px]" title={disciplina.nome}>
                                                        {disciplina.nome}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
