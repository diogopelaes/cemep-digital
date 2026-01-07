import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Loading, DateInputAnoLetivo } from '../../components/ui'
import { HiArrowRight } from 'react-icons/hi'
import { pedagogicalAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function AulaFaltasOptions() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [turmas, setTurmas] = useState([])
    const [disciplinasPorTurma, setDisciplinasPorTurma] = useState({})
    const [restricoesData, setRestricoesData] = useState(null)

    const [turmaSelecionada, setTurmaSelecionada] = useState('')
    const [disciplinaSelecionada, setDisciplinaSelecionada] = useState('')
    const [numeroAulas, setNumeroAulas] = useState(2)
    const [data, setData] = useState('')
    const [dataValida, setDataValida] = useState(false)

    // Disciplinas disponíveis para a turma selecionada
    const disciplinasDisponiveis = turmaSelecionada
        ? (disciplinasPorTurma[turmaSelecionada] || [])
        : []

    // Mostra select de disciplina se turma tiver mais de uma
    const showDisciplinaSelect = disciplinasDisponiveis.length > 1

    // Se só tem uma disciplina, seleciona automaticamente
    useEffect(() => {
        if (disciplinasDisponiveis.length === 1 && !disciplinaSelecionada) {
            setDisciplinaSelecionada(disciplinasDisponiveis[0].professor_disciplina_turma_id)
        } else if (disciplinasDisponiveis.length > 1 && disciplinaSelecionada) {
            // Limpa se mudou de turma
            const existe = disciplinasDisponiveis.find(d => d.professor_disciplina_turma_id === disciplinaSelecionada)
            if (!existe) {
                setDisciplinaSelecionada('')
            }
        }
    }, [turmaSelecionada, disciplinasDisponiveis])

    useEffect(() => {
        loadContexto()
    }, [])

    const loadContexto = async () => {
        setLoading(true)
        try {
            const res = await pedagogicalAPI.aulasFaltas.contextoFormulario()
            setTurmas(res.data.turmas || [])
            setDisciplinasPorTurma(res.data.disciplinas_por_turma || {})
            setRestricoesData(res.data.restricoes_data || null)

            // Se só tem uma turma, seleciona automaticamente
            if (res.data.turmas?.length === 1) {
                setTurmaSelecionada(res.data.turmas[0].id)
            }

            // Define data inicial como hoje se estiver liberado
            const restricoes = res.data.restricoes_data
            if (restricoes?.data_atual) {
                setData(restricoes.data_atual)
            }
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar dados.')
        }
        setLoading(false)
    }

    const handleValidationChange = (isValid, message, bimestre) => {
        setDataValida(isValid)
    }

    const handleContinuar = async () => {
        // Validações
        if (!turmaSelecionada) {
            return toast.error('Selecione uma turma')
        }

        const pdtId = disciplinaSelecionada ||
            (disciplinasDisponiveis.length === 1 ? disciplinasDisponiveis[0].professor_disciplina_turma_id : null)

        if (!pdtId) {
            return toast.error('Selecione uma disciplina')
        }

        if (!data) {
            return toast.error('Selecione uma data')
        }

        if (!dataValida) {
            return toast.error('A data selecionada não está liberada para registro')
        }

        if (numeroAulas < 1 || numeroAulas > 6) {
            return toast.error('Número de aulas deve ser entre 1 e 6')
        }

        setSubmitting(true)

        try {
            // Verificar se já existe aula para essa data/turma/disciplina
            const res = await pedagogicalAPI.aulasFaltas.verificarExistente({
                professor_disciplina_turma_id: pdtId,
                data: data
            })

            if (res.data.existe) {
                // Aula já existe, redireciona para edição
                navigate(`/aula-faltas/${res.data.aula_id}/editar`)
            } else {
                // Nova aula, passa dados via state
                navigate(`/aula-faltas/nova/${pdtId}`, {
                    state: {
                        data,
                        numeroAulas,
                        turma: turmas.find(t => t.id === turmaSelecionada),
                        disciplina: disciplinasDisponiveis.find(d => d.professor_disciplina_turma_id === pdtId)
                    }
                })
            }
        } catch (error) {
            console.error(error)
            toast.error('Erro ao verificar aula existente')
        }

        setSubmitting(false)
    }

    if (loading) return <Loading />

    return (
        <div className="max-w-xl mx-auto space-y-6 p-4 lg:p-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                    Nova Aula
                </h1>
                <p className="text-slate-500 text-sm">Selecione as opções para registrar a aula</p>
            </div>

            <Card hover={false}>
                <div className="space-y-6">
                    {/* Turma */}
                    <div>
                        <label className="label">Turma</label>
                        <select
                            className="input"
                            value={turmaSelecionada}
                            onChange={(e) => setTurmaSelecionada(e.target.value)}
                        >
                            <option value="">Selecione uma turma...</option>
                            {turmas.map(t => (
                                <option key={t.id} value={t.id}>{t.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Disciplina (condicional) */}
                    {showDisciplinaSelect && (
                        <div>
                            <label className="label">Disciplina</label>
                            <select
                                className="input"
                                value={disciplinaSelecionada}
                                onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                            >
                                <option value="">Selecione uma disciplina...</option>
                                {disciplinasDisponiveis.map(d => (
                                    <option key={d.professor_disciplina_turma_id} value={d.professor_disciplina_turma_id}>
                                        {d.disciplina_nome}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Data e Número de Aulas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <DateInputAnoLetivo
                            label="Data"
                            value={data}
                            onChange={(e) => setData(e.target.value)}
                            restricoesData={restricoesData}
                            onValidationChange={handleValidationChange}
                        />

                        <div>
                            <label className="label">Nº de Aulas</label>
                            <select
                                className="input"
                                value={numeroAulas}
                                onChange={(e) => setNumeroAulas(parseInt(e.target.value))}
                            >
                                <option value={1}>1 aula</option>
                                <option value={2}>2 aulas</option>
                                <option value={3}>3 aulas</option>
                                <option value={4}>4 aulas</option>
                                <option value={5}>5 aulas</option>
                                <option value={6}>6 aulas</option>
                            </select>
                        </div>
                    </div>

                    {/* Resumo da seleção */}
                    {turmaSelecionada && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                <strong>Turma:</strong> {turmas.find(t => t.id === turmaSelecionada)?.nome}
                            </p>
                            {(disciplinaSelecionada || disciplinasDisponiveis.length === 1) && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    <strong>Disciplina:</strong> {
                                        disciplinasDisponiveis.find(d =>
                                            d.professor_disciplina_turma_id === (disciplinaSelecionada || disciplinasDisponiveis[0]?.professor_disciplina_turma_id)
                                        )?.disciplina_nome
                                    }
                                </p>
                            )}
                        </div>
                    )}

                    {/* Botões */}
                    <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/aula-faltas')}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleContinuar}
                            disabled={submitting || !turmaSelecionada || !dataValida}
                            icon={HiArrowRight}
                        >
                            {submitting ? <Loading size="sm" /> : 'Continuar'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
