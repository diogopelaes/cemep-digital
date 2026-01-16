import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    Card, Button, Loading, FormActionsProfessor,
    Input, Select, DateInputAnoLetivo,
    TurmaDisciplinaSelector, MultiCombobox, InputValor
} from '../../components/ui'
import { evaluationAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { HiCalculator, HiScale, HiCog } from 'react-icons/hi'

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
    const [peso, setPeso] = useState('')
    const [dataInicio, setDataInicio] = useState('')
    const [dataFim, setDataFim] = useState('')
    const [pdtsSelecionados, setPdtsSelecionados] = useState([])
    const [selectedHabilidades, setSelectedHabilidades] = useState([])
    const [metodoAtual, setMetodoAtual] = useState(null) // 'SOMA' ou 'MEDIA_PONDERADA'

    // Dados auxiliares
    const [todasAtribuicoes, setTodasAtribuicoes] = useState([]) // Todas as atribuições do professor
    const [grupoSoma, setGrupoSoma] = useState([])
    const [grupoMediaPonderada, setGrupoMediaPonderada] = useState([])
    const [valorMaximo, setValorMaximo] = useState(10)
    const [anoLetivo, setAnoLetivo] = useState(null)
    const [datasLiberadas, setDatasLiberadas] = useState([])
    const [dataAtual, setDataAtual] = useState(null)
    const [multiDisciplinas, setMultiDisciplinas] = useState(true)
    const [avaliacaoConfig, setAvaliacaoConfig] = useState({})
    const [habilidadesMap, setHabilidadesMap] = useState({})
    const [availableHabilidades, setAvailableHabilidades] = useState([])

    // Verifica se é tipo especial (recuperação ou extra) - mostra todas as turmas
    const isTipoEspecial = tipo === 'AVALIACAO_RECUPERACAO' || tipo === 'AVALIACAO_EXTRA'

    useEffect(() => {
        loadData()
    }, [id])

    // Filtra habilidades disponíveis com base nas disciplinas das turmas selecionadas
    useEffect(() => {
        const atribuicoesParaFiltrar = isTipoEspecial ? todasAtribuicoes : (
            metodoAtual === 'SOMA' ? grupoSoma : grupoMediaPonderada
        )

        if (pdtsSelecionados.length > 0 && atribuicoesParaFiltrar.length > 0) {
            const selectedPdts = atribuicoesParaFiltrar.filter(a => pdtsSelecionados.includes(a.id))
            const uniqueDisciplinaIds = [...new Set(selectedPdts.map(a => a.disciplina_id))]

            let habs = []
            uniqueDisciplinaIds.forEach(discId => {
                const discHabs = habilidadesMap[discId] || []
                habs = [...habs, ...discHabs]
            })

            // Remove duplicatas
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
    }, [pdtsSelecionados, todasAtribuicoes, grupoSoma, grupoMediaPonderada, habilidadesMap, isTipoEspecial, metodoAtual])

    // Quando muda o tipo de avaliação
    useEffect(() => {
        if (isTipoEspecial) {
            // Recuperação/Extra: valor fixo como máximo
            setValor(String(valorMaximo).replace('.', ','))
            setPeso('')
            setMetodoAtual(null)
            // Limpa seleção de turmas e habilidades quando muda para tipo especial
            setPdtsSelecionados([])
            setSelectedHabilidades([])
        }
    }, [tipo, valorMaximo, isTipoEspecial])

    // Quando muda o método (clicando em um grupo diferente)
    const handleMetodoChange = (novoMetodo) => {
        if (novoMetodo === metodoAtual) return

        setMetodoAtual(novoMetodo)
        setPdtsSelecionados([])
        setValor('')
        setPeso('')
        setSelectedHabilidades([])
    }

    // Quando seleciona turmas de um grupo
    const handleSelecaoTurmas = (ids, metodo) => {
        // Se não é tipo especial
        if (!isTipoEspecial) {
            if (ids.length === 0) {
                // Se deselecionou tudo, libera ambas as seções e limpa habilidades
                setMetodoAtual(null)
                setValor('')
                setPeso('')
                setSelectedHabilidades([])
            } else if (metodo !== metodoAtual) {
                // Se está selecionando de um grupo diferente do atual
                setMetodoAtual(metodo)
                setValor('')
                setPeso('')
                setSelectedHabilidades([])
            }
        }
        setPdtsSelecionados(ids)
    }

    const loadData = async () => {
        setLoading(true)
        setError(null)
        try {
            const choicesRes = await evaluationAPI.avaliacoes.choices()
            const choices = choicesRes.data

            // Se houver configurações pendentes, redireciona para a página de configuração
            if (choices.has_pending_configs && !isEditing) {
                navigate('/avaliacoes/configuracao', {
                    replace: true,
                    state: { returnTo: '/avaliacoes/nova' }
                })
                return
            }

            const atribuicoes = choices.atribuicoes || []
            setTodasAtribuicoes(atribuicoes)

            // Agrupa por forma de cálculo
            const soma = atribuicoes.filter(a => a.forma_calculo === 'SOMA')
            const ponderada = atribuicoes.filter(a => a.forma_calculo === 'MEDIA_PONDERADA')
            setGrupoSoma(soma)
            setGrupoMediaPonderada(ponderada)

            // Se só tem um método, define como padrão
            if (soma.length > 0 && ponderada.length === 0) {
                setMetodoAtual('SOMA')
            } else if (ponderada.length > 0 && soma.length === 0) {
                setMetodoAtual('MEDIA_PONDERADA')
            }

            setValorMaximo(choices.config?.VALOR_MAXIMO || 10)
            setAnoLetivo(choices.ano_letivo)
            setDatasLiberadas(choices.datasLiberadas || [])
            setDataAtual(choices.data_atual)
            setMultiDisciplinas(choices.multi_disciplinas ?? true)
            setAvaliacaoConfig(choices.config || {})
            setHabilidadesMap(choices.habilidades_por_disciplina || {})

            if (!isEditing && choices.config && choices.config.PODE_CRIAR === false) {
                setError('A criação de novas avaliações está temporariamente bloqueada pela gestão.')
            }

            if (isEditing) {
                const avaliacaoRes = await evaluationAPI.avaliacoes.get(id)
                const avaliacao = avaliacaoRes.data

                setTitulo(avaliacao.titulo || '')
                setDescricao(avaliacao.descricao || '')
                setTipo(avaliacao.tipo || 'AVALIACAO_REGULAR')
                setValor(avaliacao.valor ? parseFloat(avaliacao.valor).toString().replace('.', ',') : '')
                setPeso(avaliacao.peso ? parseFloat(avaliacao.peso).toString().replace('.', ',') : '')
                setDataInicio(avaliacao.data_inicio || '')
                setDataFim(avaliacao.data_fim || '')
                setSelectedHabilidades(avaliacao.habilidades?.map(h => h.id) || [])

                if (avaliacao.turmas_info) {
                    const pdtIds = avaliacao.turmas_info.map(t => t.pdt_id)
                    setPdtsSelecionados(pdtIds)

                    // Determina o método baseado nas turmas da avaliação
                    const pdtsDetails = atribuicoes.filter(a => pdtIds.includes(a.id))
                    if (pdtsDetails.some(a => a.forma_calculo === 'MEDIA_PONDERADA')) {
                        setMetodoAtual('MEDIA_PONDERADA')
                    } else {
                        setMetodoAtual('SOMA')
                    }
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

        if (!titulo.trim()) {
            toast.error('Título é obrigatório.')
            return
        }

        const valorNumerico = parseFloat(String(valor).replace(',', '.'))
        const pesoNumerico = parseFloat(String(peso).replace(',', '.'))

        // Validação de turmas (obrigatório)
        if (pdtsSelecionados.length === 0) {
            toast.error('Selecione ao menos uma turma/disciplina.')
            return
        }

        // Validação de valor (quando visível: EXTRA ou REGULAR+SOMA)
        const mostraValor = tipo === 'AVALIACAO_EXTRA' || (tipo === 'AVALIACAO_REGULAR' && metodoAtual === 'SOMA')
        if (mostraValor) {
            if (!valor || isNaN(valorNumerico) || valorNumerico <= 0) {
                toast.error('Valor deve ser maior que zero.')
                return
            }
            if (valorNumerico > valorMaximo) {
                toast.error(`Valor não pode exceder ${valorMaximo}.`)
                return
            }
        }

        // Validação de peso (quando visível: REGULAR+MEDIA_PONDERADA)
        const mostraPeso = tipo === 'AVALIACAO_REGULAR' && metodoAtual === 'MEDIA_PONDERADA'
        if (mostraPeso) {
            if (!peso || isNaN(pesoNumerico) || pesoNumerico <= 0) {
                toast.error('Peso deve ser maior que zero.')
                return
            }
        }

        // Validação de datas (obrigatório)
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

        setSubmitting(true)

        try {
            const payload = {
                titulo: titulo.trim(),
                descricao: descricao.trim() || null,
                tipo,
                valor: isTipoEspecial || metodoAtual === 'SOMA' ? valorNumerico : valorMaximo,
                peso: !isTipoEspecial && metodoAtual === 'MEDIA_PONDERADA' ? pesoNumerico : 1,
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

    // Componente de grupo de turmas
    const GrupoTurmas = ({ metodo, atribuicoes, label, icon: Icon }) => {
        const isDesabilitado = !isTipoEspecial && metodoAtual && metodoAtual !== metodo

        return (
            <div
                className={`
                    rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
                    ${isDesabilitado ? 'opacity-40 pointer-events-none' : ''}
                `}
            >
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">{label}</span>
                    </div>
                    <span className="text-xs text-slate-400">{atribuicoes.length} turma{atribuicoes.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="p-4">
                    <TurmaDisciplinaSelector
                        atribuicoes={atribuicoes}
                        selectedIds={isTipoEspecial ? pdtsSelecionados : (metodoAtual === metodo ? pdtsSelecionados : [])}
                        onChange={(ids) => handleSelecaoTurmas(ids, metodo)}
                        multiDisciplinas={multiDisciplinas}
                        label=""
                    />
                </div>
            </div>
        )
    }

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

                    {!isEditing && (
                        <Button
                            variant="secondary"
                            icon={HiCog}
                            responsive
                            onClick={() => navigate('/avaliacoes/configuracao', { state: { returnTo: window.location.pathname } })}
                            title="Configurações"
                            type="button"
                        >
                            Configurações
                        </Button>
                    )}
                </div>

                <Card hover={false}>
                    <div className="space-y-5">
                        {/* Tipo de Avaliação (primeiro para determinar comportamento) */}
                        <Select
                            label="Tipo de Avaliação *"
                            options={TIPOS}
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                            placeholder="Selecione o tipo..."
                        />

                        {/* Turmas/Disciplinas agrupadas por método */}
                        {isTipoEspecial ? (
                            // Recuperação/Extra: mostra todas as turmas juntas
                            <div className="space-y-3">
                                <label className="label">Turmas e Disciplinas *</label>
                                <TurmaDisciplinaSelector
                                    atribuicoes={todasAtribuicoes}
                                    selectedIds={pdtsSelecionados}
                                    onChange={setPdtsSelecionados}
                                    multiDisciplinas={multiDisciplinas}
                                    label=""
                                />
                            </div>
                        ) : (
                            // Regular: mostra turmas separadas por método de cálculo
                            <div className="space-y-3">
                                <label className="label">Turmas e Disciplinas *</label>
                                <p className="text-xs text-slate-500 mb-3">
                                    Selecione turmas de apenas um grupo por vez. As turmas estão agrupadas pela forma de cálculo configurada.
                                </p>
                                <div className="grid grid-cols-1 gap-4">
                                    {grupoSoma.length > 0 && (
                                        <GrupoTurmas
                                            metodo="SOMA"
                                            atribuicoes={grupoSoma}
                                            label="Soma Simples"
                                            icon={HiCalculator}
                                        />
                                    )}
                                    {grupoMediaPonderada.length > 0 && (
                                        <GrupoTurmas
                                            metodo="MEDIA_PONDERADA"
                                            atribuicoes={grupoMediaPonderada}
                                            label="Média Ponderada"
                                            icon={HiScale}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

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

                        {/* Habilidades */}
                        {availableHabilidades.length > 0 && (
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
                        )}

                        {/* Valor ou Peso (condicional) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* RECUPERAÇÃO: Valor readonly com máximo */}
                            {tipo === 'AVALIACAO_RECUPERACAO' && (
                                <InputValor
                                    label={`Valor Máximo (${valorMaximo})`}
                                    value={String(valorMaximo).replace('.', ',')}
                                    onChange={() => { }}
                                    disabled
                                    className="bg-slate-100 dark:bg-slate-800"
                                />
                            )}

                            {/* EXTRA: Valor editável */}
                            {tipo === 'AVALIACAO_EXTRA' && (
                                <InputValor
                                    label={`Valor Máximo * (até ${valorMaximo})`}
                                    placeholder="Ex: 10,0"
                                    value={valor}
                                    onChange={setValor}
                                    maxValor={valorMaximo}
                                    casasDecimais={Number(avaliacaoConfig.CASAS_DECIMAIS_AVALIACAO ?? 2)}
                                    required
                                />
                            )}

                            {/* REGULAR com SOMA: Valor editável */}
                            {tipo === 'AVALIACAO_REGULAR' && metodoAtual === 'SOMA' && (
                                <InputValor
                                    label={`Valor Máximo * (até ${valorMaximo})`}
                                    placeholder="Ex: 10,0"
                                    value={valor}
                                    onChange={setValor}
                                    maxValor={valorMaximo}
                                    casasDecimais={Number(avaliacaoConfig.CASAS_DECIMAIS_AVALIACAO ?? 2)}
                                    required
                                />
                            )}

                            {/* REGULAR com MEDIA_PONDERADA: Peso editável */}
                            {tipo === 'AVALIACAO_REGULAR' && metodoAtual === 'MEDIA_PONDERADA' && (
                                <div>
                                    <label className="label">
                                        Peso <span className="text-violet-500 font-bold">*</span>
                                    </label>
                                    <InputValor
                                        value={peso}
                                        onChange={setPeso}
                                        placeholder="1,0"
                                        className="font-bold text-violet-600 border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                                        casasDecimais={Number(avaliacaoConfig.CASAS_DECIMAIS_AVALIACAO ?? 2)}
                                        maxValor={100} // Peso geralmente é livre, mas coloquei um teto seguro
                                        required
                                    />
                                </div>
                            )}
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
                    </div>
                </Card>

                <FormActionsProfessor
                    saving={submitting}
                />
            </form >
        </div >
    )
}
