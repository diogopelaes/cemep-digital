import { useState, useEffect } from 'react'
import { HiInformationCircle } from 'react-icons/hi'
import { evaluationAPI } from '../../services/api'
import { Loading, FormActions, Card, CardHeader, CardTitle, CardDescription, CardContent, Select, Switch } from '../ui'
import toast from 'react-hot-toast'
import { useReferences } from '../../contexts/ReferenceContext'

export default function AvaliacaoTab() {
    const [config, setConfig] = useState(null)
    const [choices, setChoices] = useState({
        regra_arredondamento: [],
        forma_calculo: []
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [isNew, setIsNew] = useState(false)

    const { anosLetivos, loading: loadingContext } = useReferences()
    const anoLetivoAtual = anosLetivos?.find(a => a.is_active) || anosLetivos?.[0]

    useEffect(() => {
        loadData()
    }, [anoLetivoAtual])

    const loadData = async () => {
        try {
            setLoading(true)

            // Carregar choices
            const { data: choicesData } = await evaluationAPI.configGeral.choices()
            setChoices(choicesData)

            // Carregar config atual
            try {
                const { data } = await evaluationAPI.configGeral.atual()
                setConfig(data)
                setIsNew(false)
            } catch (error) {
                if (error.response?.status === 404) {
                    // Não existe config, criar nova
                    setConfig({
                        ano_letivo: anoLetivoAtual?.id,
                        livre_escolha_professor: true,
                        forma_calculo: 'SOMA',
                        numero_casas_decimais_bimestral: 1,
                        numero_casas_decimais_avaliacao: 2,
                        regra_arredondamento: 'MATEMATICO_CLASSICO',
                    })
                    setIsNew(true)
                } else {
                    throw error
                }
            }
        } catch (error) {
            console.error('Erro ao carregar configuração:', error)
            toast.error('Erro ao carregar configuração de avaliação')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }))
        setHasChanges(true)
    }

    const handleSave = async () => {
        if (!config) return

        setSaving(true)
        try {
            if (isNew) {
                const { data } = await evaluationAPI.configGeral.create({
                    ...config,
                    ano_letivo: anoLetivoAtual?.id
                })
                setConfig(data)
                setIsNew(false)
                toast.success('Configuração criada com sucesso!')
            } else {
                const { data } = await evaluationAPI.configGeral.update(config.id, config)
                setConfig(data)
                toast.success('Configuração salva com sucesso!')
            }
            setHasChanges(false)
        } catch (error) {
            console.error('Erro ao salvar:', error)
            const msg = error.response?.data?.detail || 'Erro ao salvar configuração'
            toast.error(msg)
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        loadData()
        setHasChanges(false)
    }

    if (loading || loadingContext) return <Loading />

    if (!anoLetivoAtual && !loadingContext) {
        return (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                Selecione um ano letivo para configurar avaliações.
            </div>
        )
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>
                    Configuração de Avaliação - {anoLetivoAtual?.ano}
                </CardTitle>
                <CardDescription>
                    Configure as regras gerais de avaliação para o ano letivo.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">

                {/* Info Box - Valores Fixos */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <HiInformationCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                        <p className="font-medium mb-1">Valores fixos do sistema:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
                            <li><strong>Valor máximo por bimestre:</strong> {config?.valor_maximo?.toString().replace('.', ',') || '10,0'} pontos</li>
                            <li><strong>Média de aprovação:</strong> {config?.media_aprovacao?.toString().replace('.', ',') || '6,0'} pontos</li>
                        </ul>
                    </div>
                </div>

                {/* Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                    {/* Seção 1: Regras de Cálculo */}
                    <div className="col-span-full">
                        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <span className="font-semibold text-slate-800 dark:text-slate-100 block">
                                        Livre escolha do professor
                                    </span>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Se ativado, cada professor define individualmente se usará Soma ou Média Ponderada em seus diários.
                                    </p>
                                </div>
                                <Switch
                                    checked={config?.livre_escolha_professor}
                                    onChange={(e) => handleChange('livre_escolha_professor', e.target.checked)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Select
                            label="Forma de Cálculo Padrão"
                            value={config?.forma_calculo || 'SOMA'}
                            onChange={(e) => handleChange('forma_calculo', e.target.value)}
                            options={choices.forma_calculo}
                            placeholder="Selecione a forma de cálculo..."
                        />
                        <p className="text-xs text-slate-500 px-1">
                            {config?.livre_escolha_professor
                                ? "Sugestão inicial para novos diários (editável pelo professor)."
                                : "Regra mandatória aplicada a todos os lançamentos do ano."}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Select
                            label="Regra de Arredondamento"
                            value={config?.regra_arredondamento || 'MATEMATICO_CLASSICO'}
                            onChange={(e) => handleChange('regra_arredondamento', e.target.value)}
                            options={choices.regra_arredondamento}
                            placeholder="Selecione a regra..."
                        />
                        <p className="text-xs text-slate-500 px-1">
                            Define como o sistema trata as dízimas e frações nas notas.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Select
                            label="Nota do Bimestre"
                            value={config?.numero_casas_decimais_bimestral ?? 1}
                            onChange={(e) => handleChange('numero_casas_decimais_bimestral', parseInt(e.target.value))}
                            options={[0, 1, 2, 3, 4].map(n => ({
                                value: n,
                                label: `${n} casa${n !== 1 ? 's' : ''} decimal${n !== 1 ? 'is' : ''}`
                            }))}
                            placeholder="Selecione..."
                        />
                        <p className="text-xs text-slate-500 px-1">
                            Arredondamento aplicado ao resultado final consolidado do bimestre.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Select
                            label="Notas de Avaliações"
                            value={config?.numero_casas_decimais_avaliacao ?? 2}
                            onChange={(e) => handleChange('numero_casas_decimais_avaliacao', parseInt(e.target.value))}
                            options={[0, 1, 2, 3, 4].map(n => ({
                                value: n,
                                label: `${n} casa${n !== 1 ? 's' : ''} decimal${n !== 1 ? 'is' : ''}`
                            }))}
                            placeholder="Selecione..."
                        />
                        <p className="text-xs text-slate-500 px-1">
                            Arredondamento aplicado em cada atividade ou prova individual.
                        </p>
                    </div>
                </div>
            </CardContent>

            <div className="p-6 pt-0">
                <FormActions
                    onSave={handleSave}
                    onCancel={handleCancel}
                    saving={saving}
                    isEditing={true}
                    saveLabel={isNew ? 'Criar Configuração' : 'Salvar Configuração'}
                    disabled={!hasChanges}
                />
            </div>
        </Card>
    )
}
