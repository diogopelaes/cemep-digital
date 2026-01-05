import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    Card, Button, Loading, Select,
    DateInput, TurmaSelector, MultiCombobox
} from '../../components/ui'
import { HiSave, HiInformationCircle } from 'react-icons/hi'
import { pedagogicalAPI, coreAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function PlanoAulaForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEditing = !!id

    const [loading, setLoading] = useState(isEditing)
    const [submitting, setSubmitting] = useState(false)
    const [disciplinas, setDisciplinas] = useState([])
    const [turmasDisponiveis, setTurmasDisponiveis] = useState([]) // Turmas exibidas no seletor
    const [turmasMap, setTurmasMap] = useState({}) // Mapa completo { disciplinaId: [turmas] }
    const [habilidades, setHabilidades] = useState([])

    const [formData, setFormData] = useState({
        disciplina: '',
        turmas: [],
        data_inicio: '',
        data_fim: '',
        conteudo: '',
        habilidades: [],
    })

    useEffect(() => {
        loadInitialData()
        if (isEditing) {
            loadPlano()
        }
    }, [id])

    useEffect(() => {
        if (formData.disciplina) {
            // Atualiza turmas disponíveis
            const turmasDisc = turmasMap[formData.disciplina] || []
            setTurmasDisponiveis(turmasDisc)

            // Carrega habilidades
            loadHabilidades(formData.disciplina)
        } else {
            setTurmasDisponiveis([])
        }
    }, [formData.disciplina, turmasMap])

    const loadInitialData = async () => {
        try {
            // Busca contexto do formulário (disciplinas e turmas do professor)
            const res = await pedagogicalAPI.planosAula.getContextoFormulario()

            const loadedDisciplinas = res.data.disciplinas || []
            setDisciplinas(loadedDisciplinas)
            setTurmasMap(res.data.turmas_por_disciplina || {})

            // Se houver apenas uma disciplina, seleciona automaticamente se não estiver editando
            if (loadedDisciplinas.length === 1 && !isEditing) {
                setFormData(prev => ({ ...prev, disciplina: loadedDisciplinas[0].id }))
            }

        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar dados iniciais.')
        }
    }

    const loadPlano = async () => {
        setLoading(true)
        try {
            const res = await pedagogicalAPI.planosAula.get(id)
            const plano = res.data
            setFormData({
                disciplina: plano.disciplina?.id || plano.disciplina,
                turmas: plano.turmas?.map(t => t.id || t) || [],
                data_inicio: plano.data_inicio,
                data_fim: plano.data_fim,
                conteudo: plano.conteudo,
                habilidades: plano.habilidades?.map(h => h.id || h) || [],
            })
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar plano')
            navigate('/plano-aula')
        }
        setLoading(false)
    }

    const loadHabilidades = async (disciplinaId) => {
        try {
            const res = await coreAPI.habilidades.list({ disciplina: disciplinaId, page_size: 1000 })
            setHabilidades(res.data.results || [])
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar habilidades')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.disciplina || !formData.data_inicio || !formData.data_fim || !formData.conteudo) {
            return toast.error('Preencha os campos obrigatórios')
        }

        if (new Date(formData.data_inicio) > new Date(formData.data_fim)) {
            return toast.error('Data final deve ser maior que data inicial')
        }

        setSubmitting(true)
        try {
            const payload = {
                ...formData,
                turmas: formData.turmas.map(t => typeof t === 'object' ? t.id : t),
                habilidades: formData.habilidades.map(h => typeof h === 'object' ? h.id : h),
            }

            if (isEditing) {
                await pedagogicalAPI.planosAula.update(id, payload)
                toast.success('Plano atualizado!')
            } else {
                await pedagogicalAPI.planosAula.create(payload)
                toast.success('Plano criado!')
            }
            navigate('/plano-aula')
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar plano')
        }
        setSubmitting(false)
    }

    if (loading) return <Loading />

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 lg:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {isEditing ? 'Editar Plano de Aula' : 'Novo Plano de Aula'}
                    </h1>
                    <p className="text-slate-500 text-sm">
                        {isEditing ? 'Atualize o planejamento pedagógico' : 'Crie um novo planejamento para suas turmas'}
                    </p>
                </div>
            </div>

            <Card hover={false}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Select
                                label="Disciplina"
                                value={formData.disciplina}
                                options={disciplinas.map(d => ({ value: d.id, label: d.nome }))}
                                onChange={(e) => setFormData({ ...formData, disciplina: e.target.value })}
                                required
                                placeholder="Selecione a disciplina..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                                Data Início
                                <div className="group relative">
                                    <HiInformationCircle className="text-slate-400 hover:text-primary-500 cursor-help" />
                                    <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity w-48 text-center z-10 pointer-events-none">
                                        Define quando este plano aparecerá disponível para registro no Diário de Classe.
                                    </span>
                                </div>
                            </label>
                            <DateInput
                                value={formData.data_inicio}
                                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                                Data Fim
                                <div className="group relative">
                                    <HiInformationCircle className="text-slate-400 hover:text-primary-500 cursor-help" />
                                    <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity w-48 text-center z-10 pointer-events-none">
                                        Data limite para uso deste plano.
                                    </span>
                                </div>
                            </label>
                            <DateInput
                                value={formData.data_fim}
                                onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {formData.disciplina ? (
                        <TurmaSelector
                            label="Selecione as Turmas"
                            turmas={turmasDisponiveis}
                            selectedIds={formData.turmas}
                            onChange={(newIds) => setFormData({ ...formData, turmas: newIds })}
                        />
                    ) : (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-700">
                            Selecione uma disciplina para visualizar as turmas disponíveis.
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Conteúdo
                        </label>
                        <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                            <textarea
                                className="w-full h-40 p-4 resize-none focus:outline-none dark:bg-slate-800 dark:text-white"
                                placeholder="Descreva o conteúdo do plano de aula..."
                                value={formData.conteudo}
                                onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                            />
                        </div>
                    </div>

                    {formData.disciplina && (
                        <div className="mt-8">
                            <MultiCombobox
                                label="Habilidades BNCC da Disciplina"
                                placeholder="Selecione as habilidades..."
                                options={habilidades.map(h => ({
                                    value: h.id,
                                    label: h.descricao,
                                    subLabel: h.codigo
                                }))}
                                value={formData.habilidades}
                                onChange={(newValues) => setFormData({ ...formData, habilidades: newValues })}
                            />
                            {habilidades.length === 0 && (
                                <p className="text-sm text-slate-500 mt-2">Nenhuma habilidade cadastrada para esta disciplina.</p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button type="button" variant="ghost" onClick={() => navigate('/plano-aula')}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitting} icon={HiSave}>
                            {submitting ? <Loading size="sm" /> : 'Salvar Plano'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
