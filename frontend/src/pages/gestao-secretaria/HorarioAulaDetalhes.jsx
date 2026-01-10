import { useMemo } from 'react'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '../../components/ui'

const DAYS = [
    { value: '0', label: 'Segunda' },
    { value: '1', label: 'Terça' },
    { value: '2', label: 'Quarta' },
    { value: '3', label: 'Quinta' },
    { value: '4', label: 'Sexta' },
]

export default function HorarioAulaDetalhes({ horarios }) {

    const { maxAulas, intervalMap } = useMemo(() => {
        console.log('HorarioAulaDetalhes - horarios prop:', horarios)
        if (!horarios || horarios.length === 0) return { maxAulas: 0, intervalMap: {} }

        const max = Math.max(...horarios.map(h => h.numero))
        const intervals = {}

        // Helper to convert time to minutes
        const toMins = (time) => {
            const [h, m] = time.split(':').map(Number)
            return h * 60 + m
        }

        // Logic to find intervals: 
        // For each class number, find if there is a gap before the next class number
        for (let i = 1; i < max; i++) {
            // Find any day that has both class i and class i+1
            const classI = horarios.find(h => h.numero === i)
            const classNext = horarios.find(h => h.numero === i + 1)

            if (classI && classNext) {
                const endI = toMins(classI.hora_fim)
                const startNext = toMins(classNext.hora_inicio)

                if (startNext > endI) {
                    intervals[i] = startNext - endI
                }
            }
        }

        return { maxAulas: max, intervalMap: intervals }
    }, [horarios])

    if (!horarios || horarios.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-500">Nenhum horário de aula cadastrado para este ano letivo.</p>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeader className="w-20 !text-center bg-slate-50 dark:bg-slate-800">Aula</TableHeader>
                            {DAYS.map(day => (
                                <TableHeader key={day.value} className="!text-center bg-slate-50 dark:bg-slate-800">{day.label}</TableHeader>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Array.from({ length: maxAulas }).flatMap((_, i) => {
                            const aulaNum = i + 1
                            const rows = []

                            // Class Row
                            rows.push(
                                <TableRow key={`class-${aulaNum}`}>
                                    <TableCell className="text-center font-bold text-slate-700 dark:text-slate-200">
                                        {aulaNum}ª
                                    </TableCell>
                                    {DAYS.map(day => {
                                        const horario = horarios.find(h =>
                                            h.dia_semana === parseInt(day.value) && h.numero === aulaNum
                                        )

                                        if (!horario) {
                                            return <TableCell key={day.value} className="text-center text-slate-400">-</TableCell>
                                        }

                                        return (
                                            <TableCell key={day.value} className="p-2">
                                                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                        {horario.hora_inicio.slice(0, 5)}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        até {horario.hora_fim.slice(0, 5)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            )

                            // Interval Row
                            if (intervalMap[aulaNum]) {
                                rows.push(
                                    <TableRow key={`interval-${aulaNum}`} className="bg-amber-50 dark:bg-amber-900/20">
                                        <TableCell colSpan={6} className="py-1.5 text-center">
                                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                                Intervalo {intervalMap[aulaNum]} min
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                )
                            }

                            return rows
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
