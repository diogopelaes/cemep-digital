import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Loading, DateInputAnoLetivo, FormActionsProfessor } from '../../components/ui'
import { HiArrowRight } from 'react-icons/hi'
import { pedagogicalAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function AulaFaltasOptions() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [turmas, setTurmas] = useState([])
    const [disciplinasPorTurma, setDisciplinasPorTurma] = useState({})

    // Datas liberadas pré-calculadas pelo backend
    const [datasLiberadas, setDatasLiberadas] = useState([])
    const [dataAtual, setDataAtual] = useState(null)
    const [mensagemRestricao, setMensagemRestricao] = useState(null)

    const [turmaSelecionada, setTurmaSelecionada] = useState('')
    const [disciplinaSelecionada, setDisciplinaSelecionada] = useState('')
    const [numeroAulas, setNumeroAulas] = useState(2)
    const [data, setData] = useState('')
    const [dataValida, setDataValida] = useState(false)

    // Disciplinas disponíveis para a turma selecionada
    const disciplinasDisponiveis = turmaSelecionada
        ? (disciplinasPorTurma[turmaSelecionada] || [])
        : []

    // Mostra select de disciplina somente se houver mais de uma
    const showDisciplinaSelect = disciplinasDisponiveis.length > 1

    // Gerencia a seleção da disciplina quando a turma muda
    useEffect(() => {
        const idsDisponiveis = disciplinasDisponiveis.map(d => d.professor_disciplina_turma_id)

        if (disciplinasDisponiveis.length === 1) {
            // Se só tem 1, auto-seleciona (se já não estiver correta)
            const idUnico = disciplinasDisponiveis[0].professor_disciplina_turma_id
            if (disciplinaSelecionada !== idUnico) {
                setDisciplinaSelecionada(idUnico)
            }
        } else {
            // Se tem múltiplas ou nenhuma, verifica se a seleção atual ainda é válida
            if (disciplinaSelecionada && !idsDisponiveis.includes(disciplinaSelecionada)) {
                setDisciplinaSelecionada('')
            }
        }
    }, [turmaSelecionada, disciplinasDisponiveis, disciplinaSelecionada])


    useEffect(() => {
        loadContexto()
    }, [])

    const loadContexto = async () => {
        setLoading(true)
        try {
            const res = await pedagogicalAPI.aulasFaltas.opcoesNovaAula()

            // Processa a lista plana de atribuições do backend
            const atribuicoes = res.data.atribuicoes || []
            const turmasMap = new Map()
            const discMap = {}

            atribuicoes.forEach(atrib => {
                // Extrai Turmas únicas
                if (!turmasMap.has(atrib.turma_id)) {
                    turmasMap.set(atrib.turma_id, {
                        id: atrib.turma_id,
                        nome: atrib.turma_nome
                    })
                }

                // Agrupa Disciplinas por Turma
                if (!discMap[atrib.turma_id]) {
                    discMap[atrib.turma_id] = []
                }

                discMap[atrib.turma_id].push({
                    professor_disciplina_turma_id: atrib.id, // ID da atribuição PD
                    disciplina_nome: atrib.disciplina_nome
                })
            })

            // Converte Map para Array e atualiza estado
            const turmasList = Array.from(turmasMap.values())
            setTurmas(turmasList)
            setDisciplinasPorTurma(discMap)

            // Backend já envia datasLiberadas processadas (cache com TTL 2h)
            // Não precisa mais processar controles no frontend
            const datasDoBackend = res.data.datasLiberadas || []
            const today = res.data.data_atual || new Date().toISOString().split('T')[0]

            setDatasLiberadas(datasDoBackend)
            setDataAtual(today)

            if (datasDoBackend.length === 0) {
                setMensagemRestricao('O registro de aulas não está liberado para nenhum bimestre hoje.')
            } else {
                setMensagemRestricao(null)
            }

            // Se só tem uma turma, seleciona automaticamente
            if (turmasList.length === 1) {
                setTurmaSelecionada(turmasList[0].id)
            }

            // Sempre inicializa com a data atual
            if (today) {
                setData(today)
            }
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar dados.')
        }
        setLoading(false)
    }

    const handleValidationChange = (isValid, message) => {
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
                            datasLiberadas={datasLiberadas}
                            dataAtual={dataAtual}
                            mensagemRestricao={mensagemRestricao}
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
                                        (disciplinasDisponiveis.length === 1
                                            ? disciplinasDisponiveis[0]
                                            : disciplinasDisponiveis.find(d => d.professor_disciplina_turma_id === disciplinaSelecionada)
                                        )?.disciplina_nome
                                    }
                                </p>
                            )}
                        </div>
                    )}

                    {/* Botões */}
                    <FormActionsProfessor
                        saveLabel="Continuar"
                        icon={HiArrowRight}
                        iconPosition="right"
                        onSave={handleContinuar}
                        onCancel={() => navigate('/aula-faltas')}
                        disabled={submitting || !turmaSelecionada || !dataValida}
                        saving={submitting}
                        className="pb-0"
                    />
                </div>
            </Card>
        </div>
    )
}
