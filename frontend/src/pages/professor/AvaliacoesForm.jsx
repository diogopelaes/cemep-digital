import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Button, Loading, Badge, FormActionsProfessor, MultiCombobox } from '../../components/ui'
import { evaluationAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { formatDateBR } from '../../utils/date'

const TIPOS = [
    { value: 'AVALIACAO_REGULAR', label: 'Avaliação Regular' },
    { value: 'AVALIACAO_RECUPERACAO', label: 'Avaliação de Recuperação' },
    { value: 'AVALIACAO_EXTRA', label: 'Avaliação Extra' },
]

export default function AvaliacoesForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEditing = !!id

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    // Dados do formulário
    const [titulo, setTitulo] = useState('')
    const [descricao, setDescricao] = useState('')
    const [tipo, setTipo] = useState('AVALIACAO_REGULAR')
    const [valor, setValor] = useState('')
    const [dataInicio, setDataInicio] = useState('')
    const [dataFim, setDataFim] = useState('')
    const [pdtsSelecionados, setPdtsSelecionados] = useState([])

    // Dados auxiliares
    const [atribuicoes, setAtribuicoes] = useState([])
    const [valorMaximo, setValorMaximo] = useState(10)
    const [anoLetivo, setAnoLetivo] = useState(null)

    useEffect(() => {
        loadData()
    }, [id])

    const loadData = async () => {
        setLoading(true)
        setError(null)
        try {
            // Carrega choices (atribuições do professor)
            const choicesRes = await evaluationAPI.avaliacoes.choices()
            const choices = choicesRes.data

            setAtribuicoes(choices.atribuicoes || [])
            setValorMaximo(choices.valor_maximo || 10)
            setAnoLetivo(choices.ano_letivo)

            if (isEditing) {
                // Carrega avaliação existente
                const avaliacaoRes = await evaluationAPI.avaliacoes.get(id)
                const avaliacao = avaliacaoRes.data

                setTitulo(avaliacao.titulo || '')
                setDescricao(avaliacao.descricao || '')
                setTipo(avaliacao.tipo || 'AVALIACAO_REGULAR')
                setValor(avaliacao.valor ? parseFloat(avaliacao.valor).toString() : '')
                setDataInicio(avaliacao.data_inicio || '')
                setDataFim(avaliacao.data_fim || '')

                // Mapeia turmas_info para IDs de PDTs selecionados
                if (avaliacao.turmas_info) {
                    const pdtIds = avaliacao.turmas_info.map(t => t.pdt_id)
                    setPdtsSelecionados(pdtIds)
                }
            }
        } catch (error) {
            console.error(error)
            if (error.response?.status === 403) {
                setError('Você não tem permissão para editar esta avaliação.')
                toast.error('Sem permissão para editar.')
            } else {
                setError('Erro ao carregar dados.')
                toast.error('Erro ao carregar dados.')
            }
        }
        setLoading(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validações
        if (!titulo.trim()) {
            toast.error('Título é obrigatório.')
            return
        }
        if (!valor || parseFloat(valor) <= 0) {
            toast.error('Valor deve ser maior que zero.')
            return
        }
        if (parseFloat(valor) > valorMaximo) {
            toast.error(`Valor não pode exceder ${valorMaximo}.`)
            return
        }
        if (!dataInicio) {
            toast.error('Data de início é obrigatória.')
            return
        }
        if (!dataFim) {
            toast.error('Data de fim é obrigatória.')
            return
        }
        if (dataInicio > dataFim) {
            toast.error('Data de fim não pode ser anterior à de início.')
            return
        }
        if (pdtsSelecionados.length === 0) {
            toast.error('Selecione ao menos uma turma/disciplina.')
            return
        }

        setSubmitting(true)

        try {
            const payload = {
                titulo: titulo.trim(),
                descricao: descricao.trim() || null,
                tipo,
                valor: parseFloat(valor),
                data_inicio: dataInicio,
                data_fim: dataFim,
                professores_disciplinas_turmas_ids: pdtsSelecionados,
            }

            if (isEditing) {
                await evaluationAPI.avaliacoes.update(id, payload)
                toast.success('Avaliação atualizada com sucesso!')
            } else {
                await evaluationAPI.avaliacoes.create(payload)
                toast.success('Avaliação criada com sucesso!')
            }

            navigate('/avaliacoes')
        } catch (error) {
            console.error('Erro ao salvar:', error)
            if (error.response?.data) {
                const errors = error.response.data
                const firstError = Object.values(errors)[0]
                toast.error(Array.isArray(firstError) ? firstError[0] : String(firstError))
            } else {
                toast.error('Erro ao salvar avaliação.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    // Prepara opções para MultiCombobox
    const atribuicoesOptions = atribuicoes.map(a => ({
        value: a.id,
        label: a.label,
        turma: a.turma_nome,
        disciplina: a.disciplina_nome,
    }))

    if (loading) return <Loading />

    if (error) return (
        <div className="p-8 text-center">
            <p className="text-rose-500 mb-4">{error}</p>
            <Button onClick={() => navigate(-1)}>Voltar</Button>
        </div>
    )

    return (
        <div className="max-w-3xl mx-auto space-y-6 p-4 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                            {isEditing ? 'Editar Avaliação' : 'Nova Avaliação'}
                        </h1>
                        {anoLetivo && (
                            <p className="text-slate-500 text-sm">
                                Ano Letivo: <span className="font-medium text-primary-600 dark:text-primary-400">{anoLetivo}</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Formulário */}
                <Card hover={false} className="overflow-hidden border-none shadow-premium">
                    <div className="space-y-5">
                        {/* Título */}
                        <div>
                            <label className="label">Título da Avaliação *</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Ex: Prova 1, Trabalho em Grupo, etc."
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                maxLength={255}
                            />
                        </div>

                        {/* Descrição */}
                        <div>
                            <label className="label">Descrição (opcional)</label>
                            <textarea
                                className="input h-24 resize-none"
                                placeholder="Detalhes sobre a avaliação..."
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                            />
                        </div>

                        {/* Tipo e Valor */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Tipo de Avaliação *</label>
                                <select
                                    className="input"
                                    value={tipo}
                                    onChange={(e) => setTipo(e.target.value)}
                                >
                                    {TIPOS.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Valor Máximo * (até {valorMaximo})</label>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="Ex: 10"
                                    value={valor}
                                    onChange={(e) => setValor(e.target.value)}
                                    min="0.1"
                                    max={valorMaximo}
                                    step="0.1"
                                />
                            </div>
                        </div>

                        {/* Datas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Data de Início *</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={dataInicio}
                                    onChange={(e) => {
                                        setDataInicio(e.target.value)
                                        // Auto-preenche data fim se vazia
                                        if (!dataFim) {
                                            setDataFim(e.target.value)
                                        }
                                    }}
                                />
                            </div>

                            <div>
                                <label className="label">Data de Fim *</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={dataFim}
                                    onChange={(e) => setDataFim(e.target.value)}
                                    min={dataInicio}
                                />
                            </div>
                        </div>

                        {/* Turmas/Disciplinas */}
                        <div>
                            <label className="label">Turmas e Disciplinas *</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                Selecione as turmas/disciplinas onde esta avaliação será aplicada.
                            </p>
                            <MultiCombobox
                                options={atribuicoesOptions}
                                value={pdtsSelecionados}
                                onChange={setPdtsSelecionados}
                                placeholder="Selecione turmas/disciplinas..."
                                emptyMessage="Nenhuma atribuição encontrada"
                            />
                            {pdtsSelecionados.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {pdtsSelecionados.map(pdtId => {
                                        const attr = atribuicoes.find(a => a.id === pdtId)
                                        return attr ? (
                                            <Badge key={pdtId} variant="primary" className="text-xs">
                                                {attr.label}
                                            </Badge>
                                        ) : null
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <FormActionsProfessor
                    saving={submitting}
                    isEditing={isEditing}
                    entityName="Avaliação"
                    saveLabel={isEditing ? "Salvar Alterações" : "Criar Avaliação"}
                />
            </form>
        </div>
    )
}
