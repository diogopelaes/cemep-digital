import { useState, useEffect, useCallback } from 'react'
import { HiChevronDown, HiChevronRight, HiInformationCircle } from 'react-icons/hi'
import { coreAPI } from '../../services/api'
import { Loading, Badge, FormActions, Card, Switch, Input, Select } from '../ui'
import ControleForm from '../../pages/gestao-secretaria/ControleForm'
import toast from 'react-hot-toast'
import { useReferences } from '../../contexts/ReferenceContext'

const BIMESTRES = [
    { value: 1, label: '1º Bimestre' },
    { value: 2, label: '2º Bimestre' },
    { value: 3, label: '3º Bimestre' },
    { value: 4, label: '4º Bimestre' },
    { value: 5, label: 'Resultado Final' },
]

const TIPOS = [
    { value: 'AULA', label: 'Registro de Aula (falta e conteúdo)', bimestres: [1, 2, 3, 4] },
    { value: 'NOTA', label: 'Registro de Nota final do bimestre', bimestres: [1, 2, 3, 4, 5] },
    { value: 'BOLETIM', label: 'Visualização do boletim', bimestres: [1, 2, 3, 4, 5] },
]

const FORMA_CALCULO_OPTIONS = [
    { value: 'SOMA', label: 'Soma Simples (acumulativo)' },
    { value: 'MEDIA_PONDERADA', label: 'Média Ponderada' },
    { value: 'LIVRE_ESCOLHA', label: 'Livre Escolha (Professor define)' },
]

export default function ControleTab() {
    const [controles, setControles] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeAno, setActiveAno] = useState(null)
    const [hasChanges, setHasChanges] = useState(false)
    const [podeCriarAvaliacao, setPodeCriarAvaliacao] = useState(false)
    const [formaCalculo, setFormaCalculo] = useState('LIVRE_ESCOLHA')
    const [casasDecimaisAvaliacao, setCasasDecimaisAvaliacao] = useState(2)
    const [casasDecimaisBimestral, setCasasDecimaisBimestral] = useState(1)
    const [valorMaximo, setValorMaximo] = useState(15.00)
    const [mediaAprovacao, setMediaAprovacao] = useState(6.00)
    const [hasConfigChanges, setHasConfigChanges] = useState(false)

    const [expandedBimestres, setExpandedBimestres] = useState([1])
    const { anosLetivos } = useReferences()

    useEffect(() => {
        if (anosLetivos && anosLetivos.length > 0) {
            const ativo = anosLetivos.find(a => a.is_active) || anosLetivos[0]
            setActiveAno(ativo)
            const avConfig = ativo?.controles?.avaliacao || {}
            setPodeCriarAvaliacao(avConfig.pode_criar || false)
            setFormaCalculo(avConfig.forma_calculo || 'LIVRE_ESCOLHA')
            setCasasDecimaisAvaliacao(avConfig.casas_decimais_avaliacao ?? 2)
            setCasasDecimaisBimestral(avConfig.casas_decimais_bimestral ?? 1)
            setValorMaximo(avConfig.valor_maximo ?? 15.00)
            setMediaAprovacao(avConfig.media_aprovacao ?? 6.00)
        }
    }, [anosLetivos])

    useEffect(() => {
        if (activeAno) {
            loadControles()
        }
    }, [activeAno])

    const loadControles = async () => {
        try {
            setLoading(true)
            const { data } = await coreAPI.controleRegistros.porAno(activeAno?.ano)
            setControles(Array.isArray(data) ? data : [])
            setHasChanges(false)
        } catch (error) {
            console.error('Erro ao carregar controles:', error)
            toast.error('Erro ao carregar controles')
        } finally {
            setLoading(false)
        }
    }

    const getControle = (bimestre, tipo) => {
        return controles.find(c => c.bimestre === bimestre && c.tipo === tipo)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // Salva controles por lote se houver mudanças nos períodos
            const dirtyControles = controles.filter(c => c._dirty)
            if (dirtyControles.length > 0) {
                const payload = dirtyControles.map(c => ({
                    ano_letivo: c.ano_letivo || activeAno?.id,
                    bimestre: c.bimestre,
                    tipo: c.tipo,
                    data_inicio: c.data_inicio || null,
                    data_fim: c.data_fim || null,
                    digitacao_futura: c.digitacao_futura
                }))
                await coreAPI.controleRegistros.salvarLote({ controles: payload })
            }

            // Salva configuração de avaliação no AnoLetivo se houver mudanças
            if (hasConfigChanges) {
                const newControles = {
                    ...activeAno.controles,
                    avaliacao: {
                        ...(activeAno.controles?.avaliacao || {}),
                        pode_criar: podeCriarAvaliacao,
                        forma_calculo: formaCalculo,
                        casas_decimais_avaliacao: parseInt(casasDecimaisAvaliacao),
                        casas_decimais_bimestral: parseInt(casasDecimaisBimestral),
                        valor_maximo: parseFloat(String(valorMaximo).replace(',', '.')),
                        media_aprovacao: parseFloat(String(mediaAprovacao).replace(',', '.'))
                    }
                }
                await coreAPI.anosLetivos.update(activeAno.ano, { controles: newControles })

                // Atualiza o objeto no estado local para refletir a mudança salva
                setActiveAno(prev => ({ ...prev, controles: newControles }))
            }

            // Recarregar para pegar status atualizado
            const { data } = await coreAPI.controleRegistros.porAno(activeAno?.ano)
            setControles(Array.isArray(data) ? data : [])
            setHasChanges(false)
            setHasConfigChanges(false)

            toast.success('Alterações salvas com sucesso!')
        } catch (error) {
            console.error('Erro ao salvar:', error)
            toast.error('Erro ao salvar alterações')
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        if (hasChanges || hasConfigChanges) {
            loadControles()
            const avConfig = activeAno?.controles?.avaliacao || {}
            setPodeCriarAvaliacao(avConfig.pode_criar || false)
            setFormaCalculo(avConfig.forma_calculo || 'LIVRE_ESCOLHA')
            setCasasDecimaisAvaliacao(avConfig.casas_decimais_avaliacao ?? 2)
            setCasasDecimaisBimestral(avConfig.casas_decimais_bimestral ?? 1)
            setValorMaximo(avConfig.valor_maximo ?? 15.00)
            setMediaAprovacao(avConfig.media_aprovacao ?? 6.00)
            setHasChanges(false)
            setHasConfigChanges(false)
            toast('Alterações descartadas', { icon: 'ℹ️' })
        }
    }

    const handleChange = useCallback((bimestre, tipo, field, value) => {
        setControles(prev => {
            const existing = prev.find(c => c.bimestre === bimestre && c.tipo === tipo)

            let updated
            if (existing) {
                updated = prev.map(c =>
                    c.bimestre === bimestre && c.tipo === tipo
                        ? { ...c, [field]: value, _dirty: true }
                        : c
                )
            } else {
                // Criar novo controle local
                updated = [...prev, {
                    ano_letivo: activeAno?.id,
                    bimestre,
                    tipo,
                    data_inicio: null,
                    data_fim: null,
                    [field]: value,
                    _dirty: true,
                    _isNew: true
                }]
            }

            return updated
        })
        setHasChanges(true)
    }, [activeAno])

    const toggleBimestre = (bimestre) => {
        setExpandedBimestres(prev =>
            prev.includes(bimestre)
                ? prev.filter(b => b !== bimestre)
                : [...prev, bimestre]
        )
    }

    const getStatusBadge = (status) => {
        if (!status || status === 'Bloqueado') return 'default'
        if (status === 'Liberado') return 'success'
        if (status === 'Aguardando início') return 'warning'
        return 'danger' // Encerrado
    }

    if (loading) return <Loading />

    if (!activeAno) {
        return (
            <Card hover={false} className="w-full">
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    Não há um ano letivo ativo para configurar controles.
                </div>
            </Card>
        )
    }

    return (
        <Card className="w-full">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                            Controle de Registros - {activeAno.ano}
                        </h2>
                        <p className="text-slate-500 text-sm">
                            Defina os períodos para registro de aulas, notas e visualização de boletins.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                    </div>
                </div>

                {/* Configurações Globais de Avaliação */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                        <div>
                            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="text-primary-600 dark:text-primary-400">⚙️</span>
                                Configurações de Avaliação
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Regras aplicadas a todas as avaliações deste ano letivo.</p>
                        </div>
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pode criar Avaliação</span>
                            <Switch
                                checked={podeCriarAvaliacao}
                                onChange={(e) => {
                                    setPodeCriarAvaliacao(e.target.checked)
                                    setHasConfigChanges(true)
                                }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Select
                            label="Forma de Cálculo"
                            value={formaCalculo}
                            options={FORMA_CALCULO_OPTIONS}
                            onChange={(e) => {
                                setFormaCalculo(e.target.value)
                                setHasConfigChanges(true)
                            }}
                            help="Define como a nota bimestral é calculada."
                        />

                        <Input
                            label="Valor Máximo"
                            type="number"
                            step="0.5"
                            value={valorMaximo}
                            onChange={(e) => {
                                setValorMaximo(e.target.value)
                                setHasConfigChanges(true)
                            }}
                            help="Valor máximo de pontos no bimestre."
                        />

                        <Input
                            label="Média para Aprovação"
                            type="number"
                            step="0.1"
                            value={mediaAprovacao}
                            onChange={(e) => {
                                setMediaAprovacao(e.target.value)
                                setHasConfigChanges(true)
                            }}
                            help="Nota mínima para ser aprovado no bimestre."
                        />

                        <Input
                            label="Casas Decimais (Avaliação)"
                            type="number"
                            min="0"
                            max="4"
                            value={casasDecimaisAvaliacao}
                            onChange={(e) => {
                                setCasasDecimaisAvaliacao(e.target.value)
                                setHasConfigChanges(true)
                            }}
                        />

                        <Input
                            label="Casas Decimais (Média Bimestral)"
                            type="number"
                            min="0"
                            max="4"
                            value={casasDecimaisBimestral}
                            onChange={(e) => {
                                setCasasDecimaisBimestral(e.target.value)
                                setHasConfigChanges(true)
                            }}
                        />
                    </div>
                </div>

                {/* Info Box */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <HiInformationCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                            <p className="font-medium mb-1">Como funciona a liberação:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
                                <li><strong>Com data início e fim:</strong> Liberado no período definido</li>
                                <li><strong>Só data início:</strong> Liberado dessa data em diante</li>
                                <li><strong>Só data fim:</strong> Liberado até essa data</li>
                                <li><strong>Sem datas:</strong> Não liberado</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Accordions por Bimestre */}
                <div className="space-y-3">
                    {BIMESTRES.map(bim => {
                        const isExpanded = expandedBimestres.includes(bim.value)
                        const tiposDisponiveis = TIPOS.filter(t => t.bimestres.includes(bim.value))

                        return (
                            <div
                                key={bim.value}
                                className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800"
                            >
                                {/* Accordion Header */}
                                <button
                                    onClick={() => toggleBimestre(bim.value)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? (
                                            <HiChevronDown className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <HiChevronRight className="w-5 h-5 text-slate-400" />
                                        )}
                                        <span className="font-semibold text-slate-800 dark:text-white">
                                            {bim.label}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {tiposDisponiveis.map(tipo => {
                                            const controle = getControle(bim.value, tipo.value)
                                            const status = controle?.status_liberacao || 'Não configurado'
                                            return (
                                                <Badge
                                                    key={tipo.value}
                                                    variant={getStatusBadge(status)}
                                                    className="text-xs"
                                                >
                                                    {tipo.value === 'AULA' ? 'Aula' : tipo.value === 'NOTA' ? 'Nota' : 'Boletim'}
                                                </Badge>
                                            )
                                        })}
                                    </div>
                                </button>

                                {/* Accordion Content */}
                                {isExpanded && (
                                    <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-4">
                                        {tiposDisponiveis.map(tipo => {
                                            const controle = getControle(bim.value, tipo.value)

                                            return (
                                                <ControleForm
                                                    key={tipo.value}
                                                    tipo={tipo}
                                                    controle={controle}
                                                    onChange={(field, value) => handleChange(bim.value, tipo.value, field, value)}
                                                />
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <FormActions
                    onSave={handleSave}
                    onCancel={handleCancel}
                    saving={saving}
                    isEditing={true}
                    saveLabel="Salvar Configurações"
                    disabled={!hasChanges && !hasConfigChanges}
                    className="mt-6"
                />
            </div>
        </Card>
    )
}
