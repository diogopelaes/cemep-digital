import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, Button, Loading, Badge, TurmaPrimaryBadge, DisciplinaBadge, FormActionsProfessor } from '../../components/ui'
import { evaluationAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { HiCheck, HiScale, HiCalculator, HiLightningBolt } from 'react-icons/hi'

const OPCOES = [
    {
        value: 'SOMA',
        label: 'Soma Simples',
        description: 'As notas das avaliações são somadas diretamente para compor a média bimestral.',
        icon: HiCalculator
    },
    {
        value: 'MEDIA_PONDERADA',
        label: 'Média Ponderada',
        description: 'Cada avaliação tem um peso, e a média é calculada proporcionalmente aos pesos.',
        icon: HiScale
    }
]

export default function AvaliacaoConfigDisciplinaTurma() {
    const navigate = useNavigate()
    const location = useLocation()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [configs, setConfigs] = useState([])
    const [form, setForm] = useState({})

    useEffect(() => {
        loadConfigs()
    }, [])

    const loadConfigs = async () => {
        setLoading(true)
        try {
            // Agora busca TODAS as configurações (com flag pode_alterar)
            const res = await evaluationAPI.configDisciplinaTurma.myConfigs()
            const data = res.data || []
            setConfigs(data)

            // Inicializa form com os valores atuais ou padrão SOMA
            const initialForm = {}
            data.forEach(p => {
                initialForm[p.disciplina_turma_id] = p.forma_calculo || 'SOMA'
            })
            setForm(initialForm)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar configurações.')
        } finally {
            setLoading(false)
        }
    }

    const handleSelectOption = (dtId, value, podeAlterar) => {
        if (!podeAlterar) return
        setForm(prev => ({ ...prev, [dtId]: value }))
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            // Envia apenas o que pode ser alterado ou tudo (backend filtra quem não pode)
            // Mas o ideal é mandar tudo para garantir consistência
            const configsToSend = Object.entries(form).map(([dtId, forma]) => ({
                disciplina_turma_id: dtId,
                forma_calculo: forma
            }))

            await evaluationAPI.configDisciplinaTurma.bulkCreate({ configs: configsToSend })
            toast.success('Configurações salvas!')

            // Redireciona de volta para onde veio ou para lista de avaliações
            const returnPath = location.state?.returnTo || '/avaliacoes'
            navigate(returnPath)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <Loading />

    return (
        <div className="max-w-5xl mx-auto p-4 lg:p-10 space-y-10 animate-fade-in">
            <header>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
                        <HiLightningBolt className="w-5 h-5" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                        Configuração de Avaliação
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                    Escolha o método de cálculo das notas para cada disciplina.
                    <span className="text-amber-600 dark:text-amber-500 font-bold ml-1">
                        Esta ação será definitiva para o bimestre após a primeira avaliação.
                    </span>
                </p>
            </header>

            <div className="grid grid-cols-1 gap-6">
                {configs.map(item => (
                    <Card key={item.disciplina_turma_id} className="overflow-hidden border-none shadow-sm dark:bg-slate-800/50 ring-1 ring-slate-100 dark:ring-slate-700/50">
                        <div className="p-1 sm:p-2 bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">
                            <div className="px-5 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <TurmaPrimaryBadge
                                        numero={item.turma_numero}
                                        letra={item.turma_letra}
                                        nome={item.turma_nome}
                                        showFullName={false}
                                    />
                                    {!item.pode_alterar && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                            Definitivo
                                        </Badge>
                                    )}
                                </div>
                                <DisciplinaBadge sigla={item.disciplina_sigla} />
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="flex justify-center">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                                    {OPCOES.map(opcao => {
                                        const isSelected = form[item.disciplina_turma_id] === opcao.value
                                        const Icon = opcao.icon
                                        const isDisabled = !item.pode_alterar

                                        return (
                                            <button
                                                key={opcao.value}
                                                onClick={() => handleSelectOption(item.disciplina_turma_id, opcao.value, item.pode_alterar)}
                                                disabled={isDisabled}
                                                className={`
                                                    relative p-4 rounded-2xl border-2 text-left transition-all duration-200 group
                                                    ${isSelected
                                                        ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-900/10 shadow-lg shadow-primary-500/5'
                                                        : 'border-slate-100 dark:border-slate-800'}
                                                    ${!isDisabled && !isSelected ? 'hover:border-slate-200 dark:hover:border-slate-700' : ''}
                                                    ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                                                `}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className={`
                                                        mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors
                                                        ${isSelected ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}
                                                        ${!isDisabled && !isSelected ? 'group-hover:text-slate-600' : ''}
                                                    `}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={`font-bold text-sm ${isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {opcao.label}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 mt-1 leading-snug opacity-80">
                                                            {opcao.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white dark:border-slate-800">
                                                        <HiCheck className="w-3 h-3" />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}

            </div>

            <FormActionsProfessor
                onCancel={() => navigate(location.state?.returnTo || '/avaliacoes')}
                onSubmit={handleSubmit}
                loading={submitting}
                saveLabel="Salvar"
                cancelLabel="Voltar"
            />
        </div>
    )
}
