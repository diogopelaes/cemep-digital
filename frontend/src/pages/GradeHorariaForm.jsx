import { useState, useEffect } from 'react'
import { HiSave, HiX } from 'react-icons/hi'
import { Button, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '../components/ui'
import { coreAPI } from '../services/api'
import { toast } from 'react-hot-toast'

const DAYS = [
    { value: 0, label: 'Segunda' },
    { value: 1, label: 'Terça' },
    { value: 2, label: 'Quarta' },
    { value: 3, label: 'Quinta' },
    { value: 4, label: 'Sexta' },
]

/**
 * Formulário para edição da grade horária.
 * Permite selecionar uma disciplina para cada slot (horário x dia).
 * 
 * @param {Object} props
 * @param {Object} props.turma - Dados da turma
 * @param {Array} props.grades - Grades existentes
 * @param {Array} props.horariosAula - Horários de aula disponíveis
 * @param {Array} props.disciplinas - Disciplinas vinculadas à turma
 * @param {Function} props.onCancel - Callback para cancelar
 * @param {Function} props.onSuccess - Callback após salvar com sucesso
 */
export default function GradeHorariaForm({ turma, grades, horariosAula, disciplinas, onCancel, onSuccess }) {
    const [saving, setSaving] = useState(false)
    // Estado local: { "horario_aula_id": "disciplina_id" ou null }
    const [selections, setSelections] = useState({})

    // Inicializa seleções com grades existentes
    useEffect(() => {
        const initial = {}
        grades.forEach(g => {
            if (g.horario_aula) {
                initial[g.horario_aula] = g.disciplina
            }
        })
        setSelections(initial)
    }, [grades])

    // Agrupa horários por número de aula
    const aulasPorNumero = {}
    horariosAula.forEach(h => {
        if (!aulasPorNumero[h.numero]) {
            aulasPorNumero[h.numero] = {}
        }
        aulasPorNumero[h.numero][h.dia_semana] = h
    })

    const numerosAula = Object.keys(aulasPorNumero).map(Number).sort((a, b) => a - b)

    const handleSelectChange = (horarioId, disciplinaId) => {
        setSelections(prev => ({
            ...prev,
            [horarioId]: disciplinaId || null
        }))
    }

    const handleSave = async () => {
        try {
            setSaving(true)

            // Deleta todas as grades existentes
            for (const g of grades) {
                await coreAPI.gradesHorarias.delete(g.id)
            }

            // Cria novas grades
            const entries = Object.entries(selections).filter(([_, disciplinaId]) => disciplinaId)
            for (const [horarioId, disciplinaId] of entries) {
                await coreAPI.gradesHorarias.create({
                    turma: turma.id,
                    horario_aula: horarioId,
                    disciplina: disciplinaId
                })
            }

            toast.success('Grade horária salva com sucesso!')
            onSuccess()

        } catch (error) {
            console.error('Erro ao salvar grade horária:', error)
            toast.error('Erro ao salvar grade horária.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
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
                                const horariosDia = aulasPorNumero[numero] || {}
                                // Pega qualquer horário desse número para exibir hora
                                const horarioRef = Object.values(horariosDia)[0]

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
                                            const horario = horariosDia[day.value]

                                            if (!horario) {
                                                return (
                                                    <TableCell key={day.value} className="text-center text-slate-300 dark:text-slate-600">
                                                        -
                                                    </TableCell>
                                                )
                                            }

                                            const selectedDisciplina = selections[horario.id] || ''

                                            return (
                                                <TableCell key={day.value} className="p-2">
                                                    <select
                                                        value={selectedDisciplina}
                                                        onChange={(e) => handleSelectChange(horario.id, e.target.value)}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    >
                                                        <option value="">— Vazio —</option>
                                                        {disciplinas.map(d => (
                                                            <option key={d.id} value={d.id}>
                                                                {d.sigla} - {d.nome}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                    <Button variant="secondary" onClick={onCancel} icon={HiX}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        loading={saving}
                        icon={HiSave}
                    >
                        Salvar Grade
                    </Button>
                </div>
            </div>
        </div>
    )
}
