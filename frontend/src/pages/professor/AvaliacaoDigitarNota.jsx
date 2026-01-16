import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Button, Loading, Badge, FormActionsProfessor, InputValor } from '../../components/ui'
import { evaluationAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function AvaliacaoDigitarNota() {
    const navigate = useNavigate()
    const { id } = useParams()

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    // Dados da avaliação
    const [avaliacao, setAvaliacao] = useState(null)
    const [turmasInfo, setTurmasInfo] = useState([])
    const [casasDecimais, setCasasDecimais] = useState(2)
    const [formaCalculo, setFormaCalculo] = useState('SOMA')

    // PDT selecionado e estudantes
    const [pdtSelecionado, setPdtSelecionado] = useState('')
    const [estudantes, setEstudantes] = useState([])
    const [loadingEstudantes, setLoadingEstudantes] = useState(false)

    useEffect(() => {
        loadAvaliacao()
    }, [id])

    useEffect(() => {
        if (pdtSelecionado) {
            loadEstudantes(pdtSelecionado)
        } else {
            setEstudantes([])
        }
    }, [pdtSelecionado])

    const loadAvaliacao = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await evaluationAPI.digitarNotas.get(id)
            const data = res.data

            setAvaliacao({
                id: data.avaliacao_id,
                titulo: data.titulo,
                valor: parseFloat(data.valor),
                peso: data.peso ? parseFloat(data.peso) : null,
                data_inicio: data.data_inicio,
                data_fim: data.data_fim,
                bimestre: data.bimestre,
            })
            setTurmasInfo(data.turmas_info || [])
            setCasasDecimais(data.casas_decimais ?? 2)
            setFormaCalculo(data.forma_calculo || 'SOMA')

            // Se só tem uma turma, seleciona automaticamente
            if (data.turmas_info?.length === 1) {
                setPdtSelecionado(data.turmas_info[0].pdt_id)
            }
        } catch (error) {
            console.error(error)
            if (error.response?.status === 403) {
                setError('Você não tem permissão para acessar esta avaliação.')
            } else if (error.response?.status === 404) {
                setError('Avaliação não encontrada.')
            } else {
                setError('Erro ao carregar avaliação.')
            }
            toast.error('Erro ao carregar dados.')
        }
        setLoading(false)
    }

    const loadEstudantes = async (pdtId) => {
        setLoadingEstudantes(true)
        try {
            const res = await evaluationAPI.digitarNotas.estudantes(id, pdtId)
            setEstudantes(res.data.estudantes || [])
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar estudantes.')
            setEstudantes([])
        }
        setLoadingEstudantes(false)
    }

    const handleNotaChange = (matriculaTurmaId, val) => {
        setEstudantes(prev => prev.map(e => {
            if (e.matricula_turma_id !== matriculaTurmaId) return e
            return { ...e, nota: val }
        }))
    }



    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!pdtSelecionado) {
            toast.error('Selecione uma turma/disciplina.')
            return
        }

        setSubmitting(true)
        try {
            const notasPayload = estudantes.map(est => ({
                matricula_turma_id: est.matricula_turma_id,
                nota: est.nota ? parseFloat(est.nota.replace(',', '.')) : null
            }))

            await evaluationAPI.digitarNotas.salvar(id, {
                pdt_id: pdtSelecionado,
                notas: notasPayload
            })

            toast.success('Notas salvas com sucesso!')
            navigate(-1)
        } catch (error) {
            console.error('Erro ao salvar:', error)
            if (error.response?.data) {
                const errors = error.response.data
                const firstError = Object.values(errors)[0]
                toast.error(Array.isArray(firstError) ? firstError[0] : String(firstError))
            } else {
                toast.error('Erro ao salvar notas.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <Loading />

    if (error) return (
        <div className="p-8 text-center">
            <p className="text-rose-500 mb-4">{error}</p>
            <Button onClick={() => navigate(-1)}>Voltar</Button>
        </div>
    )

    // Conta estudantes sem nota
    const estudantesSemNota = estudantes.filter(e => !e.nota || e.nota === '').length

    // Turma selecionada info
    const turmaSelecionada = turmasInfo.find(t => t.pdt_id === pdtSelecionado)

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                            Digitar Notas
                        </h1>
                        <p className="text-slate-500 text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-medium text-primary-600 dark:text-primary-400">
                                {avaliacao?.titulo}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className={`bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${formaCalculo === 'MEDIA_PONDERADA' ? 'text-violet-600 dark:text-violet-400' : ''}`}>
                                {formaCalculo === 'MEDIA_PONDERADA'
                                    ? `Peso: ${avaliacao?.peso?.toFixed(1).replace('.', ',')}`
                                    : `Valor: ${avaliacao?.valor?.toFixed(casasDecimais).replace('.', ',')}`
                                }
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">
                                {avaliacao?.bimestre}º BIMESTRE
                            </span>
                            {pdtSelecionado && (
                                <>
                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                    <span className={`font-medium ${estudantesSemNota > 0 ? 'text-warning-600 dark:text-warning-400' : 'text-success-600 dark:text-success-400'}`}>
                                        {estudantesSemNota > 0
                                            ? `${estudantesSemNota} ${estudantesSemNota === 1 ? 'nota pendente' : 'notas pendentes'}`
                                            : 'Todas as notas preenchidas'
                                        }
                                    </span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* Seleção de Turma/Disciplina */}
                {turmasInfo.length > 1 ? (
                    <Card hover={false}>
                        <div className="w-full">
                            <label className="label">Turma / Disciplina</label>
                            <select
                                className="input"
                                value={pdtSelecionado}
                                onChange={(e) => setPdtSelecionado(e.target.value)}
                            >
                                <option value="">Selecione uma opção...</option>
                                {turmasInfo.map(t => (
                                    <option key={t.pdt_id} value={t.pdt_id}>
                                        {t.turma_numero}{t.turma_letra} - {t.disciplina_sigla}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </Card>
                ) : (
                    turmasInfo.length === 1 && (
                        <div className="flex items-center gap-3 px-1 py-1">
                            <Badge variant="primary" className="text-sm font-bold py-1 px-3">
                                {turmasInfo[0].turma_numero}{turmasInfo[0].turma_letra} - {turmasInfo[0].disciplina_sigla}
                            </Badge>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                                    {turmasInfo[0].turma_nome}
                                </span>
                                <span className="text-[10px] text-slate-500 leading-tight">
                                    {turmasInfo[0].disciplina_nome}
                                </span>
                            </div>
                        </div>
                    )
                )}

                {/* Lista de Estudantes */}
                {pdtSelecionado && (
                    <div className="space-y-4">
                        {loadingEstudantes ? (
                            <Loading />
                        ) : estudantes.length === 0 ? (
                            <Card className="p-8 text-center">
                                <p className="text-slate-500 dark:text-slate-400">
                                    Nenhum estudante elegível encontrado para esta avaliação.
                                </p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {estudantes.map((estudante, idx) => (
                                    <div
                                        key={estudante.matricula_turma_id}
                                        className="
                                            bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 
                                            border border-slate-200/60 dark:border-slate-700/50 
                                            transition-colors duration-200 group
                                            hover:border-primary-200 dark:hover:border-primary-800/50
                                        "
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            {/* Left Side: Number + Name */}
                                            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                                <span className="text-xs font-bold text-slate-300 dark:text-slate-600 w-6 tabular-nums">
                                                    {(estudante.numero_chamada && estudante.numero_chamada !== 0)
                                                        ? estudante.numero_chamada.toString().padStart(2, '0')
                                                        : (idx + 1).toString().padStart(2, '0')}
                                                </span>

                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">
                                                        {estudante.estudante_nome}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right Side: Nota input */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <InputValor
                                                    className="w-20 sm:w-24 text-center font-bold"
                                                    value={estudante.nota}
                                                    maxValor={avaliacao.valor}
                                                    casasDecimais={casasDecimais}
                                                    onChange={(val) => handleNotaChange(estudante.matricula_turma_id, val)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {pdtSelecionado && estudantes.length > 0 && (
                    <FormActionsProfessor
                        saving={submitting}
                        saveLabel="Salvar Notas"
                    />
                )}
            </form>
        </div>
    )
}
