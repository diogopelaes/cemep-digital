import { useState, useEffect } from 'react'
import { HiPlus, HiTrash, HiSave, HiClock, HiCheck, HiPause } from 'react-icons/hi'
import { Button, Card, Input, TimeInput, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '../components/ui'
import { coreAPI } from '../services/api'
import { toast } from 'react-hot-toast'
import HorarioAulaDetalhes from './HorarioAulaDetalhes'

const DAYS = [
    { value: '0', label: 'Segunda' },
    { value: '1', label: 'Terça' },
    { value: '2', label: 'Quarta' },
    { value: '3', label: 'Quinta' },
    { value: '4', label: 'Sexta' },
]

export default function HorarioAulaForm({ anoLetivo, existingHorarios, onSuccess, onCancel }) {
    const [config, setConfig] = useState({
        horaInicio: '07:00',
        duracaoAula: '50', // Stored as string to handle text input
        quantidadeAulas: '5', // Default 5 classes
        diasSelecionados: ['0', '1', '2', '3', '4'],
        intervalos: [] //Array of { inicio: '09:30', duracao: '20' }
    })

    // Preview state
    const [previewHorarios, setPreviewHorarios] = useState([])
    const [generated, setGenerated] = useState(false)
    const [saving, setSaving] = useState(false)
    const [intervalMap, setIntervalMap] = useState({}) // { classNumber: { inicio, duracao, fim } }

    // Load existing horarios into preview on mount
    useEffect(() => {
        if (existingHorarios && existingHorarios.length > 0) {
            // Set preview with existing data
            setPreviewHorarios(existingHorarios)
            setGenerated(true)

            // Derive config from existing data
            const diasUnicos = [...new Set(existingHorarios.map(h => String(h.dia_semana)))]
            const maxAulas = Math.max(...existingHorarios.map(h => h.numero))
            const primeiraAula = existingHorarios.find(h => h.numero === 1)

            // Calculate class duration from first class
            let duracao = 50
            if (primeiraAula) {
                const toMins = (t) => {
                    const [h, m] = t.split(':').map(Number)
                    return h * 60 + m
                }
                duracao = toMins(primeiraAula.hora_fim) - toMins(primeiraAula.hora_inicio)
            }

            // Detect intervals between classes
            const intervals = []
            const intervalsMap = {}
            const toMins = (t) => {
                const [h, m] = t.split(':').map(Number)
                return h * 60 + m
            }
            const toTime = (mins) => {
                const h = Math.floor(mins / 60) % 24
                const m = mins % 60
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
            }

            for (let i = 1; i < maxAulas; i++) {
                const classI = existingHorarios.find(h => h.numero === i)
                const classNext = existingHorarios.find(h => h.numero === i + 1)

                if (classI && classNext) {
                    const endI = toMins(classI.hora_fim)
                    const startNext = toMins(classNext.hora_inicio)

                    if (startNext > endI) {
                        const gap = startNext - endI
                        intervals.push({ inicio: classI.hora_fim.slice(0, 5), duracao: String(gap) })
                        intervalsMap[i] = {
                            inicio: classI.hora_fim.slice(0, 5),
                            duracao: gap,
                            fim: classNext.hora_inicio.slice(0, 5)
                        }
                    }
                }
            }

            setConfig(prev => ({
                ...prev,
                horaInicio: primeiraAula ? primeiraAula.hora_inicio.slice(0, 5) : '07:00',
                duracaoAula: String(duracao),
                quantidadeAulas: String(maxAulas),
                diasSelecionados: diasUnicos,
                intervalos: intervals
            }))

            setIntervalMap(intervalsMap)
        }
    }, [existingHorarios])

    const handleDayToggle = (dayValue) => {
        setConfig(prev => {
            const current = [...prev.diasSelecionados]
            if (current.includes(dayValue)) {
                return { ...prev, diasSelecionados: current.filter(d => d !== dayValue) }
            } else {
                return { ...prev, diasSelecionados: [...current, dayValue] }
            }
        })
    }

    const addIntervalo = () => {
        setConfig(prev => ({
            ...prev,
            intervalos: [...prev.intervalos, { inicio: '', duracao: '15' }]
        }))
    }

    const removeIntervalo = (index) => {
        setConfig(prev => ({
            ...prev,
            intervalos: prev.intervalos.filter((_, i) => i !== index)
        }))
    }

    const updateIntervalo = (index, field, value) => {
        if (field === 'duracao') {
            // Validate positive integer for text input
            const val = value.replace(/\D/g, '')
            if (val === '' || parseInt(val) > 0) {
                setConfig(prev => {
                    const newIntervalos = [...prev.intervalos]
                    newIntervalos[index] = { ...newIntervalos[index], [field]: val }
                    return { ...prev, intervalos: newIntervalos }
                })
            }
            return
        }

        setConfig(prev => {
            const newIntervalos = [...prev.intervalos]
            newIntervalos[index] = { ...newIntervalos[index], [field]: value }
            return { ...prev, intervalos: newIntervalos }
        })
    }

    const handleDuracaoChange = (e) => {
        const val = e.target.value.replace(/\D/g, '')
        if (val === '' || parseInt(val) > 0) {
            setConfig({ ...config, duracaoAula: val })
        }
    }

    const handleQuantidadeChange = (e) => {
        const val = e.target.value.replace(/\D/g, '')
        if (val === '' || parseInt(val) > 0) {
            setConfig({ ...config, quantidadeAulas: val })
        }
    }

    // Helper: Time to minutes
    const timeToMinutes = (time) => {
        const [h, m] = time.split(':').map(Number)
        return h * 60 + m
    }

    // Helper: Minutes to HH:MM
    const minutesToTime = (minutes) => {
        const h = Math.floor(minutes / 60) % 24
        const m = minutes % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const generatePreview = () => {
        // 1. Basic Validation
        if (!config.horaInicio || !config.duracaoAula || !config.quantidadeAulas || config.diasSelecionados.length === 0) {
            toast.error('Preencha os campos obrigatórios')
            return
        }

        const duracao = parseInt(config.duracaoAula)
        const qtdAulas = parseInt(config.quantidadeAulas)

        if (isNaN(duracao) || duracao <= 0) {
            toast.error('Duração inválida')
            return
        }
        if (isNaN(qtdAulas) || qtdAulas <= 0) {
            toast.error('Quantidade de aulas inválida')
            return
        }

        // 2. Validate Intervals Matches
        // Map all valid "break points" (times where a class ends)
        // We simulate a single day flow
        let currentMins = timeToMinutes(config.horaInicio)
        const validBreakPoints = new Set() // stores minutes from midnight

        for (let i = 0; i < qtdAulas; i++) {
            // Class End
            const classEnd = currentMins + duracao
            validBreakPoints.add(classEnd)

            // Check if there is an interval STARTING at this end time
            // We need to convert back to string to match config
            const timeStr = minutesToTime(classEnd)
            const interval = config.intervalos.find(intv => intv.inicio === timeStr)

            if (interval) {
                const intervalDur = parseInt(interval.duracao) || 0
                currentMins = classEnd + intervalDur
            } else {
                currentMins = classEnd
            }
        }

        // Now check if EVERY configured interval matches a valid break point
        // "Unused interval" check
        for (const intv of config.intervalos) {
            const intvStartMins = timeToMinutes(intv.inicio)
            // It must match one of the valid BreakPoints
            if (!validBreakPoints.has(intvStartMins)) {
                toast.error(`Erro: O intervalo das ${intv.inicio} não coincide com o término de nenhuma aula.`)
                return
            }
        }

        // 3. Generate Schedule with interval markers
        const newHorarios = []

        // We also need to track where intervals are for rendering
        // We'll store interval info in a separate structure
        const intervalAfterClass = {} // { classNumber: { inicio, duracao, fim } }

        // Simulate one day to map intervals
        let simMins = timeToMinutes(config.horaInicio)
        for (let i = 1; i <= qtdAulas; i++) {
            const endMins = simMins + duracao
            const endStr = minutesToTime(endMins)

            const interval = config.intervalos.find(intv => intv.inicio === endStr)
            if (interval) {
                const intDur = parseInt(interval.duracao) || 0
                intervalAfterClass[i] = {
                    inicio: endStr,
                    duracao: intDur,
                    fim: minutesToTime(endMins + intDur)
                }
                simMins = endMins + intDur
            } else {
                simMins = endMins
            }
        }

        config.diasSelecionados.forEach(dia => {
            let mins = timeToMinutes(config.horaInicio)

            for (let i = 1; i <= qtdAulas; i++) {
                const startStr = minutesToTime(mins)
                const endMins = mins + duracao
                const endStr = minutesToTime(endMins)

                newHorarios.push({
                    id: `temp-${dia}-${i}`,
                    dia_semana: parseInt(dia),
                    numero: i,
                    hora_inicio: startStr,
                    hora_fim: endStr
                })

                // Move to next slot handling interval
                const interval = config.intervalos.find(intv => intv.inicio === endStr)
                if (interval) {
                    mins = endMins + (parseInt(interval.duracao) || 0)
                } else {
                    mins = endMins
                }
            }
        })

        setPreviewHorarios(newHorarios)
        setGenerated(true)
        setIntervalMap(intervalAfterClass)
        toast.success('Pré-visualização gerada!')
    }

    const removeHorario = (id) => {
        setPreviewHorarios(prev => prev.filter(h => h.id !== id))
    }

    const handleSave = async () => {
        try {
            setSaving(true)

            const existingIds = existingHorarios.map(h => h.id)
            for (const id of existingIds) {
                await coreAPI.horariosAula.delete(id)
            }

            for (const h of previewHorarios) {
                await coreAPI.horariosAula.create({
                    ano_letivo: anoLetivo.ano,
                    numero: h.numero,
                    dia_semana: h.dia_semana,
                    hora_inicio: h.hora_inicio,
                    hora_fim: h.hora_fim
                })
            }

            toast.success('Horários salvos com sucesso!')
            onSuccess()

        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar horários.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <TimeInput
                        label="Início da Primeira Aula"
                        value={config.horaInicio}
                        onChange={e => setConfig({ ...config, horaInicio: e.target.value })}
                    />
                    <Input
                        label="Duração (min)"
                        value={config.duracaoAula}
                        onChange={handleDuracaoChange}
                        placeholder="Ex: 50"
                        maxLength={3}
                    />
                    <Input
                        label="Quantidade de Aulas"
                        value={config.quantidadeAulas}
                        onChange={handleQuantidadeChange}
                        placeholder="Ex: 5"
                        maxLength={2}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Dias da Semana
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {DAYS.map(day => {
                            const isSelected = config.diasSelecionados.includes(day.value)
                            return (
                                <button
                                    key={day.value}
                                    onClick={() => handleDayToggle(day.value)}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 select-none border border-transparent
                                        ${isSelected
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }
                                    `}
                                >
                                    {isSelected && <HiCheck className="w-3.5 h-3.5" />}
                                    {day.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            Intervalos / Recreio
                        </label>
                        <Button size="sm" variant="secondary" onClick={addIntervalo} icon={HiPlus}>
                            Adicionar Intervalo
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {config.intervalos.map((intervalo, index) => (
                            <div key={index} className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div className="w-full md:flex-1">
                                    <TimeInput
                                        label="Início"
                                        value={intervalo.inicio}
                                        onChange={e => updateIntervalo(index, 'inicio', e.target.value)}
                                    />
                                </div>
                                <div className="w-full md:flex-1">
                                    <Input
                                        label="Duração (min)"
                                        value={intervalo.duracao}
                                        onChange={e => updateIntervalo(index, 'duracao', e.target.value)}
                                        placeholder="Ex: 15"
                                        maxLength={3}
                                    />
                                </div>
                                <button
                                    onClick={() => removeIntervalo(index)}
                                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors self-end"
                                    title="Remover intervalo"
                                >
                                    <HiTrash className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        {config.intervalos.length === 0 && (
                            <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-4">
                                Nenhum intervalo configurado.
                            </p>
                        )}
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button onClick={generatePreview} className="w-full md:w-auto">
                        Gerar Pré-visualização
                    </Button>
                </div>
            </div>

            {/* Preview Section */}
            {generated && (
                <div className="space-y-4 animate-slide-up">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                Pré-visualização
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Confira como ficará a grade horária antes de salvar.
                            </p>
                        </div>
                        <div className="text-sm font-medium px-3 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-lg">
                            {previewHorarios.length} aulas geradas
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
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
                                    {Array.from({ length: parseInt(config.quantidadeAulas) }).flatMap((_, i) => {
                                        const aulaNum = i + 1
                                        const rows = []

                                        // Class Row
                                        rows.push(
                                            <TableRow key={`class-${aulaNum}`}>
                                                <TableCell className="text-center font-bold text-slate-700 dark:text-slate-200">
                                                    {aulaNum}ª
                                                </TableCell>
                                                {DAYS.map(day => {
                                                    const horario = previewHorarios.find(h =>
                                                        h.dia_semana === parseInt(day.value) && h.numero === aulaNum
                                                    )

                                                    if (!horario) {
                                                        return <TableCell key={day.value} className="text-center text-slate-400">-</TableCell>
                                                    }

                                                    return (
                                                        <TableCell key={day.value} className="p-2">
                                                            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 group hover:border-brand-200 dark:hover:border-brand-800 transition-colors relative">
                                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                                    {horario.hora_inicio}
                                                                </span>
                                                                <span className="text-xs text-slate-500">
                                                                    até {horario.hora_fim}
                                                                </span>

                                                                <button
                                                                    onClick={() => removeHorario(horario.id)}
                                                                    className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200"
                                                                    title="Remover"
                                                                >
                                                                    <HiTrash className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </TableCell>
                                                    )
                                                })}
                                            </TableRow>
                                        )

                                        // Interval Row (if exists after this class)
                                        if (intervalMap[aulaNum]) {
                                            const intv = intervalMap[aulaNum]
                                            rows.push(
                                                <TableRow key={`interval-${aulaNum}`} className="bg-amber-50 dark:bg-amber-900/20">
                                                    <TableCell colSpan={6} className="py-1.5 text-center">
                                                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                                            Intervalo {intv.duracao} min
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

                        <div className="bg-white dark:bg-slate-800 p-4 flex justify-end gap-3">
                            <Button variant="secondary" onClick={onCancel}>
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                isLoading={saving}
                                icon={HiSave}
                            >
                                Confirmar e Salvar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
