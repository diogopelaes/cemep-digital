import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    Card, Button, Loading, FormActionsProfessor,
    Input, Select, DateInputAnoLetivo,
    TurmaDisciplinaSelector, MultiCombobox
} from '../../components/ui'
import { evaluationAPI } from '../../services/api'
import toast from 'react-hot-toast'

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
    const [selectedHabilidades, setSelectedHabilidades] = useState([])

    // Dados auxiliares
    const [atribuicoes, setAtribuicoes] = useState([])
    const [valorMaximo, setValorMaximo] = useState(10)
    const [anoLetivo, setAnoLetivo] = useState(null)
    const [datasLiberadas, setDatasLiberadas] = useState([])
    const [dataAtual, setDataAtual] = useState(null)
    const [multiDisciplinas, setMultiDisciplinas] = useState(true)
    const [avaliacaoConfig, setAvaliacaoConfig] = useState({})
    const [habilidadesMap, setHabilidadesMap] = useState({})
    const [availableHabilidades, setAvailableHabilidades] = useState([])
    const habilidadesRef = useRef(null)

    // Rola para mostrar habilidades quando elas aparecem
    useEffect(() => {
        if (availableHabilidades.length > 0 && habilidadesRef.current) {
            const timeoutId = setTimeout(() => {
                habilidadesRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [availableHabilidades.length]);

    useEffect(() => {
        loadData()
    }, [id])

    // Filtra habilidades disponíveis com base nas disciplinas das turmas selecionadas
    useEffect(() => {
        if (pdtsSelecionados.length > 0 && atribuicoes.length > 0) {
            const selectedPdts = atribuicoes.filter(a => pdtsSelecionados.includes(a.id))
            const uniqueDisciplinaIds = [...new Set(selectedPdts.map(a => a.disciplina_id))]

            let habs = []
            uniqueDisciplinaIds.forEach(discId => {
                const discHabs = habilidadesMap[discId] || []
                habs = [...habs, ...discHabs]
            })

            // Remove duplicatas (caso uma habilidade esteja em múltiplas disciplinas selecionadas)
            const seen = new Set()
            const uniqueHabs = habs.filter(h => {
                const duplicate = seen.has(h.id)
                seen.add(h.id)
                return !duplicate
            })

            setAvailableHabilidades(uniqueHabs)
        } else {
            setAvailableHabilidades([])
        }
    }, [pdtsSelecionados, atribuicoes, habilidadesMap])

    const loadData = async () => {
        setLoading(true)
        setError(null)
        try {
            // Carrega choices (atribuições do professor)
            const choicesRes = await evaluationAPI.avaliacoes.choices()
            const choices = choicesRes.data

            setAtribuicoes(choices.atribuicoes || [])
            setValorMaximo(choices.config?.VALOR_MAXIMO || 10)
            setAnoLetivo(choices.ano_letivo)
            setDatasLiberadas(choices.datasLiberadas || [])
            setDataAtual(choices.data_atual)
            setMultiDisciplinas(choices.multi_disciplinas ?? true)
            setAvaliacaoConfig(choices.config || {})
            setHabilidadesMap(choices.habilidades_por_disciplina || {})

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
                setSelectedHabilidades(avaliacao.habilidades?.map(h => h.id) || [])

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
        const valorNumerico = parseFloat(String(valor).replace(',', '.'))

        if (!valor || isNaN(valorNumerico) || valorNumerico <= 0) {
            toast.error('Valor deve ser maior que zero.')
            return
        }
        if (valorNumerico > valorMaximo) {
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
                valor: parseFloat(String(valor).replace(',', '.')),
                data_inicio: dataInicio,
                data_fim: dataFim,
                professores_disciplinas_turmas_ids: pdtsSelecionados,
                habilidades_ids: selectedHabilidades,
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
                <Card hover={false}>
                    <div className="space-y-5">
                        {/* Título */}
                        <Input
                            label="Título da Avaliação *"
                            placeholder="Ex: Prova 1, Trabalho em Grupo, etc."
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            maxLength={255}
                        />

                        {/* Descrição */}
                        <div className="w-full">
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
                            <Select
                                label="Tipo de Avaliação *"
                                options={TIPOS}
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                                placeholder="Selecione o tipo..."
                            />

                            <div className="space-y-1">
                                <Input
                                    label={`Valor Máximo * (até ${valorMaximo})`}
                                    type="text"
                                    placeholder="Ex: 10,0"
                                    value={valor}
                                    onChange={(e) => {
                                        let val = e.target.value.replace('.', ',')
                                        if (/[^0-9,]/.test(val)) return
                                        if ((val.match(/,/g) || []).length > 1) return

                                        if (val.includes(',')) {
                                            const parts = val.split(',')
                                            const maxCasas = avaliacaoConfig.CASAS_DECIMAIS_AVALIACAO || 2
                                            if (parts[1].length > maxCasas) return
                                        }

                                        if (val !== '' && val !== ',') {
                                            const numVal = parseFloat(val.replace(',', '.'))
                                            if (!isNaN(numVal) && numVal > valorMaximo) return
                                        }

                                        setValor(val)
                                    }}
                                    onBlur={() => {
                                        if (!valor) return
                                        let valFloat = parseFloat(valor.replace(',', '.'))
                                        if (isNaN(valFloat)) { setValor(''); return }

                                        const casas = avaliacaoConfig.CASAS_DECIMAIS_AVALIACAO || 2
                                        setValor(valFloat.toFixed(casas).replace('.', ','))
                                    }}
                                />
                                <p className="text-xs text-slate-500">
                                    {`Máximo de ${avaliacaoConfig.CASAS_DECIMAIS_AVALIACAO || 2} casas decimais`}
                                </p>
                            </div>
                        </div>

                        {/* Datas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <DateInputAnoLetivo
                                label="Data de Início *"
                                value={dataInicio}
                                onChange={(e) => {
                                    setDataInicio(e.target.value)
                                    if (!dataFim) setDataFim(e.target.value)
                                }}
                                datasLiberadas={datasLiberadas}
                                dataAtual={dataAtual}
                                placeholder="dd/mm/aaaa"
                            />

                            <DateInputAnoLetivo
                                label="Data de Fim *"
                                value={dataFim}
                                onChange={(e) => setDataFim(e.target.value)}
                                min={dataInicio}
                                datasLiberadas={datasLiberadas}
                                dataAtual={dataAtual}
                                placeholder="dd/mm/aaaa"
                            />
                        </div>

                        {/* Turmas/Disciplinas */}
                        <div className="space-y-3">
                            <label className="label">Turmas e Disciplinas *</label>

                            <TurmaDisciplinaSelector
                                atribuicoes={atribuicoes}
                                selectedIds={pdtsSelecionados}
                                onChange={setPdtsSelecionados}
                                multiDisciplinas={multiDisciplinas}
                                label=""
                            />
                        </div>

                        {/* Habilidades */}
                        {availableHabilidades.length > 0 && (
                            <div
                                className="mt-6"
                                ref={habilidadesRef}
                                onFocusCapture={() => {
                                    setTimeout(() => {
                                        habilidadesRef.current?.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'center'
                                        });
                                    }, 150);
                                }}
                                onClickCapture={() => {
                                    setTimeout(() => {
                                        habilidadesRef.current?.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'center'
                                        });
                                    }, 150);
                                }}
                            >
                                <MultiCombobox
                                    label="Habilidades Avaliadas"
                                    placeholder="Selecione as habilidades..."
                                    options={availableHabilidades.map(h => ({
                                        value: h.id,
                                        label: h.descricao,
                                        subLabel: h.codigo
                                    }))}
                                    value={selectedHabilidades}
                                    onChange={setSelectedHabilidades}
                                />
                            </div>
                        )}
                    </div>
                </Card>

                <FormActionsProfessor
                    saving={submitting}
                />
            </form>
        </div>
    )
}
