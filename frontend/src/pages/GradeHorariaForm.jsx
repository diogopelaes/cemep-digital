import { useState, useEffect } from 'react'
import { HiSave, HiX } from 'react-icons/hi'
import { Button, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, DateInput } from '../components/ui'
import { useGradeHoraria } from '../hooks/useGradeHoraria'
import toast from 'react-hot-toast'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

const DAYS = [
    { value: 0, label: 'Segunda' },
    { value: 1, label: 'Terça' },
    { value: 2, label: 'Quarta' },
    { value: 3, label: 'Quinta' },
    { value: 4, label: 'Sexta' },
]

export default function GradeHorariaForm() {
    const { id: turmaId } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const { fetchDadosEdicao, salvarGrade, loading: hookLoading } = useGradeHoraria()

    // O validadeId pode vir do state da navegação
    const validadeIdInicial = location.state?.validade_id

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Dados carregados
    const [dados, setDados] = useState(null)
    const [selections, setSelections] = useState({})

    // Campos de Data
    const [dataInicio, setDataInicio] = useState('')
    const [dataFim, setDataFim] = useState('')

    useEffect(() => {
        carregarDados()
    }, [turmaId, validadeIdInicial])

    const carregarDados = async () => {
        setLoading(true)
        try {
            const data = await fetchDadosEdicao(turmaId, validadeIdInicial)
            setDados(data)

            // Inicializa seleções com grades existentes
            const initial = {}
            if (data.grades) {
                data.grades.forEach(g => {
                    if (g.horario_aula) {
                        initial[g.horario_aula] = g.disciplina
                    }
                })
            }
            setSelections(initial)

            // Inicializa datas
            if (data.validade_selecionada) {
                setDataInicio(data.validade_selecionada.data_inicio)
                setDataFim(data.validade_selecionada.data_fim)
            }
        } catch (err) {
            // Erro tratado no hook
        } finally {
            setLoading(false)
        }
    }

    const handleSelectChange = (horarioId, disciplinaId) => {
        setSelections(prev => ({
            ...prev,
            [horarioId]: disciplinaId || ''
        }))
    }

    const handleSave = async () => {
        if (!dataInicio || !dataFim) {
            toast.error('Informe as datas de início e fim da vigência.')
            return
        }

        try {
            setSaving(true)

            // Monta array de grades para enviar
            const gradesParaSalvar = Object.entries(selections)
                .filter(([_, disciplinaId]) => disciplinaId)
                .map(([horarioId, disciplinaId]) => ({
                    horario_aula: horarioId,
                    disciplina: disciplinaId
                }))

            await salvarGrade({
                turma_id: turmaId,
                validade_id: validadeIdInicial, // Se estiver editando uma existente
                data_inicio: dataInicio,
                data_fim: dataFim,
                grades: gradesParaSalvar
            })

            // Retorna para detalhes
            navigate(`/turmas/${turmaId}`, { state: { tab: 'gradeHoraria' } })

        } catch (error) {
            // Tratado no hook
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Carregando formulário...</div>
    }

    if (!dados) return null

    const { horarios_aula: horariosAula = [], turmas = [], disciplinas = [] } = dados
    const temMultiplasTurmas = turmas.length > 1

    // Processa dados para tabela
    const aulasPorNumero = {}
    horariosAula.forEach(h => {
        if (!aulasPorNumero[h.numero]) {
            aulasPorNumero[h.numero] = {}
        }
        aulasPorNumero[h.numero][h.dia_semana] = h
    })
    const numerosAula = Object.keys(aulasPorNumero).map(Number).sort((a, b) => a - b)

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header com Datas */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DateInput
                        label="Início da Vigência"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        required
                    />
                    <DateInput
                        label="Fim da Vigência"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        min={dataInicio}
                        required
                    />
                </div>
            </div>

            {/* Aviso de múltiplas turmas */}
            {temMultiplasTurmas && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        📅 Editando grades de {turmas.length} turmas com mesmos estudantes: {' '}
                        <strong>{turmas.map(t => t.curso_sigla).join(', ')}</strong>.
                        As disciplinas são identificadas pela sigla do curso.
                    </p>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
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
                                const horariosDia = aulasPorNumero[numero] || {}
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
                                        {DAYS.map((day, idx) => {
                                            const horario = horariosDia[day.value]
                                            const colBg = idx % 2 === 0 ? '' : 'bg-primary-50/30 dark:bg-primary-900/10'

                                            if (!horario) {
                                                return (
                                                    <TableCell key={day.value} className={`text-center text-slate-300 dark:text-slate-600 ${colBg}`}>
                                                        -
                                                    </TableCell>
                                                )
                                            }

                                            const selectedDisciplina = selections[horario.id] || ''

                                            return (
                                                <TableCell key={day.value} className={`p-2 text-center ${colBg}`}>
                                                    <select
                                                        value={selectedDisciplina}
                                                        onChange={(e) => handleSelectChange(horario.id, e.target.value)}
                                                        className="max-w-[120px] px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    >
                                                        <option value="">— Vazio —</option>
                                                        {disciplinas.map(d => (
                                                            <option key={`${d.id}-${d.turma_id}`} value={d.id}>
                                                                {d.sigla}{temMultiplasTurmas ? ` - ${d.curso_sigla}` : ''}
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
                    <Button variant="secondary" onClick={() => navigate(`/turmas/${turmaId}`, { state: { tab: 'gradeHoraria' } })} icon={HiX}>
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
