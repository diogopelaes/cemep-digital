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
 * Suporta exibição de múltiplas turmas (turmas relacionadas com mesmo ano_letivo, letra, numero).
 * 
 * @param {Object} props
 * @param {Array} props.grades - Array de GradeHoraria com horario_aula_details, disciplina_details e turma_info
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

    // Cria mapa de grade: { "dia_semana-numero": [{ disciplina, turma_info }] }
    // Mudou de objeto único para array para suportar múltiplas disciplinas no mesmo slot
    const gradeMap = {}
    grades.forEach(g => {
        if (g.horario_aula_details) {
            const key = `${g.horario_aula_details.dia_semana}-${g.horario_aula_details.numero}`
            if (!gradeMap[key]) {
                gradeMap[key] = []
            }
            gradeMap[key].push({
                disciplina: g.disciplina_details,
                turma_info: g.turma_info
            })
        }
    })

    // Verifica se há múltiplas turmas nas grades
    const turmasUnicas = new Set(grades.map(g => g.turma_info?.id).filter(Boolean))
    const temMultiplasTurmas = turmasUnicas.size > 1

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
            {temMultiplasTurmas && (
                <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        📅 Exibindo grades de turmas com mesmos estudantes. A sigla do curso indica de qual turma é cada disciplina.
                    </p>
                </div>
            )}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeader className="w-32 !text-center bg-slate-50 dark:bg-slate-800">Aula</TableHeader>
                            {DAYS.map((day, idx) => (
                                <TableHeader
                                    key={day.value}
                                    className={`!text-center ${idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800' : 'bg-primary-50/50 dark:bg-primary-900/20'}`}
                                >
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
                                    {DAYS.map((day, idx) => {
                                        const key = `${day.value}-${numero}`
                                        const disciplinas = gradeMap[key] || []
                                        const colBg = idx % 2 === 0 ? '' : 'bg-primary-50/30 dark:bg-primary-900/10'

                                        if (disciplinas.length === 0) {
                                            return (
                                                <TableCell key={day.value} className={`text-center text-slate-300 dark:text-slate-600 ${colBg}`}>
                                                    -
                                                </TableCell>
                                            )
                                        }

                                        return (
                                            <TableCell key={day.value} className={`p-2 text-center ${colBg}`}>
                                                <div className="flex flex-col gap-1 items-center">
                                                    {disciplinas.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                                                        >
                                                            <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                                                                {item.disciplina?.sigla}
                                                            </span>
                                                            {temMultiplasTurmas && item.turma_info?.curso_sigla && (
                                                                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                                                    {item.turma_info.curso_sigla}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
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
