import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Loading } from '../../components/ui'
import { HiCog, HiSave } from 'react-icons/hi'
import { evaluationAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function AvaliacaoConfigProfessor() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [config, setConfig] = useState(null)

    useEffect(() => {
        loadConfig()
    }, [])

    const loadConfig = async () => {
        try {
            const res = await evaluationAPI.configuracaoProfessor.mine()
            setConfig(res.data)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar configurações')
        }
        setLoading(false)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            await evaluationAPI.configuracaoProfessor.updateMine(config)
            toast.success('Configurações salvas com sucesso!')
            navigate('/avaliacoes')
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar configurações')
        }
        setSaving(false)
    }

    if (loading) return <Loading />

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <HiCog className="text-primary-600" />
                        Configurações de Avaliação
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Defina como suas notas serão calculadas no ano letivo {config?.ano_letivo_ano}
                    </p>
                </div>
            </div>

            <Card>
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="label text-lg font-semibold mb-2">Forma de Cálculo das Notas</label>
                        <p className="text-sm text-slate-500 mb-4">
                            Escolha como o sistema deve consolidar as notas do bimestre para suas turmas.
                        </p>

                        {config && !config.pode_alterar && (
                            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start gap-3">
                                <span className="text-amber-600 dark:text-amber-400 mt-0.5">⚠️</span>
                                <div className="text-amber-800 dark:text-amber-300 text-sm">
                                    <p className="font-bold">Configuração Travada</p>
                                    <p>A forma de cálculo foi definida pela gestão para este ano letivo e não pode ser alterada pelo professor.</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className={`
                                relative flex flex-col p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200
                                ${config?.forma_calculo === 'SOMA'
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-4 ring-primary-500/10'
                                    : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'}
                                ${!config?.pode_alterar ? 'opacity-70 cursor-not-allowed grayscale-[0.5]' : ''}
                            `}>
                                <input
                                    type="radio"
                                    className="sr-only"
                                    name="forma_calculo"
                                    value="SOMA"
                                    checked={config?.forma_calculo === 'SOMA'}
                                    onChange={(e) => config?.pode_alterar && setConfig({ ...config, forma_calculo: e.target.value })}
                                    disabled={!config?.pode_alterar}
                                />
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-slate-800 dark:text-white text-lg">Soma Simples</span>
                                    {config?.forma_calculo === 'SOMA' && (
                                        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-white"></div>
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Todas as avaliações do bimestre são somadas. O valor total deve respeitar o limite definido (geralmente 10.0).
                                    <br /><strong>Exemplo:</strong> P1(4.0) + P2(6.0) = 10.0
                                </span>
                            </label>

                            <label className={`
                                relative flex flex-col p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200
                                ${config?.forma_calculo === 'MEDIA_PONDERADA'
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-4 ring-primary-500/10'
                                    : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'}
                                ${!config?.pode_alterar ? 'opacity-70 cursor-not-allowed grayscale-[0.5]' : ''}
                            `}>
                                <input
                                    type="radio"
                                    className="sr-only"
                                    name="forma_calculo"
                                    value="MEDIA_PONDERADA"
                                    checked={config?.forma_calculo === 'MEDIA_PONDERADA'}
                                    onChange={(e) => config?.pode_alterar && setConfig({ ...config, forma_calculo: e.target.value })}
                                    disabled={!config?.pode_alterar}
                                />
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-slate-800 dark:text-white text-lg">Média Ponderada</span>
                                    {config?.forma_calculo === 'MEDIA_PONDERADA' && (
                                        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-white"></div>
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    As notas são calculadas através da média ponderada. O valor de cada avaliação atua como seu peso.
                                    <br /><strong>Exemplo:</strong> (P1*Peso1 + P2*Peso2) / (Peso1+Peso2)
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row gap-3 sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/avaliacoes')}
                            className="w-full sm:w-auto order-2 sm:order-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={saving}
                            disabled={!config?.pode_alterar}
                            className="w-full sm:w-auto order-1 sm:order-2 shadow-lg shadow-primary-500/30"
                        >
                            <HiSave className="mr-2" />
                            Salvar Alterações
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
