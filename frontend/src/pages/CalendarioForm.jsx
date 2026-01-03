import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    Card, Button, DateInput, Checkbox, Loading, Input, Select
} from '../components/ui'
import { HiSave, HiTrash } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import { formatDateBR } from '../utils/date'
import toast from 'react-hot-toast'

const TIPOS_DIA_NAO_LETIVO = [
    { value: 'FERIADO', label: 'Feriado' },
    { value: 'PONTO_FACULTATIVO', label: 'Ponto facultativo' },
    { value: 'RECESSO', label: 'Recesso escolar' },
    { value: 'FERIAS', label: 'Férias escolares' },
    { value: 'SUSPENSO', label: 'Dia letivo suspenso' },
    { value: 'PLANEJAMENTO', label: 'Planejamento' },
    { value: 'OUTROS', label: 'Outros' },
]

export default function CalendarioForm() {
    const navigate = useNavigate()
    const { ano } = useParams()

    // Restrições de data para o ano do calendário
    const minDate = `${ano}-01-01`
    const maxDate = `${ano}-12-31`

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        data_inicio_1bim: '',
        data_fim_1bim: '',
        data_inicio_2bim: '',
        data_fim_2bim: '',
        data_inicio_3bim: '',
        data_fim_3bim: '',
        data_inicio_4bim: '',
        data_fim_4bim: '',
        is_active: true
    })

    // Eventos do calendário
    const [diasNaoLetivos, setDiasNaoLetivos] = useState([])
    const [diasExtras, setDiasExtras] = useState([])

    useEffect(() => {
        loadData()
    }, [ano])

    const loadData = async () => {
        try {
            const [anoRes, calRes] = await Promise.all([
                coreAPI.anosLetivos.get(ano),
                coreAPI.anosLetivos.getCalendario(ano)
            ])
            const data = anoRes.data
            setFormData({
                data_inicio_1bim: data.data_inicio_1bim || '',
                data_fim_1bim: data.data_fim_1bim || '',
                data_inicio_2bim: data.data_inicio_2bim || '',
                data_fim_2bim: data.data_fim_2bim || '',
                data_inicio_3bim: data.data_inicio_3bim || '',
                data_fim_3bim: data.data_fim_3bim || '',
                data_inicio_4bim: data.data_inicio_4bim || '',
                data_fim_4bim: data.data_fim_4bim || '',
                is_active: data.is_active
            })
            setDiasNaoLetivos(calRes.data.dias_nao_letivos || [])
            setDiasExtras(calRes.data.dias_letivos_extras || [])
        } catch (error) {
            console.error('Erro ao carregar ano letivo:', error)
            toast.error('Erro ao carregar dados.')
            navigate('/configuracoes')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    // Helper: retorna o dia seguinte a uma data (para restrições estritas)
    const nextDay = (dateStr) => {
        if (!dateStr) return null
        const date = new Date(dateStr + 'T00:00:00')
        date.setDate(date.getDate() + 1)
        return date.toISOString().split('T')[0]
    }

    // Calcula dias letivos de um bimestre
    const calcDiasLetivosBim = (inicio, fim) => {
        if (!inicio || !fim) return null

        let weekdays = 0
        const current = new Date(inicio + 'T00:00:00')
        const endDate = new Date(fim + 'T00:00:00')

        // Conta dias úteis (seg-sex)
        while (current <= endDate) {
            const day = current.getDay()
            if (day !== 0 && day !== 6) weekdays++
            current.setDate(current.getDate() + 1)
        }

        // Dias extras dentro do período
        const extras = diasExtras.filter(d => d.data >= inicio && d.data <= fim).length

        // Dias não letivos dentro do período
        const naoLetivos = diasNaoLetivos.filter(d => d.data >= inicio && d.data <= fim).length

        return weekdays + extras - naoLetivos
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // Convert empty strings to null for date fields
            const dataToSend = { ...formData }
            Object.keys(dataToSend).forEach(key => {
                if (key.startsWith('data_') && dataToSend[key] === '') {
                    dataToSend[key] = null
                }
            })
            await coreAPI.anosLetivos.update(ano, dataToSend)
            toast.success('Calendário salvo com sucesso!')
            navigate('/configuracoes?tab=calendario')
        } catch (error) {
            console.error('Erro ao salvar:', error)
            toast.error('Erro ao salvar alterações')
        } finally {
            setSaving(false)
        }
    }

    // ====== Dias Não Letivos - Inline ======
    const addDiaNaoLetivo = () => {
        setDiasNaoLetivos(prev => [{ id: null, data: '', tipo: 'FERIADO', descricao: '', isNew: true }, ...prev])
    }

    const updateDiaNaoLetivo = (index, field, value) => {
        setDiasNaoLetivos(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d))
    }

    const removeDiaNaoLetivo = async (index) => {
        const dia = diasNaoLetivos[index]
        if (dia.id && !dia.isNew) {
            try {
                await coreAPI.anosLetivos.removeDia(ano, dia.id, 'nao_letivo')
                toast.success('Removido!')
            } catch (error) {
                toast.error('Erro ao remover')
                return
            }
        }
        setDiasNaoLetivos(prev => prev.filter((_, i) => i !== index))
    }

    const saveDiaNaoLetivo = async (index) => {
        const dia = diasNaoLetivos[index]
        if (!dia.data) {
            toast.error('Data é obrigatória')
            return
        }

        // Validar: não pode ser sábado ou domingo
        const date = new Date(dia.data + 'T00:00:00')
        const dayOfWeek = date.getDay()
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            toast.error('Não é necessário cadastrar sábados ou domingos como dia não letivo')
            return
        }

        try {
            const { data: saved } = await coreAPI.anosLetivos.addDiaNaoLetivo(ano, {
                data: dia.data,
                tipo: dia.tipo,
                descricao: dia.descricao
            })
            setDiasNaoLetivos(prev => prev.map((d, i) => i === index ? { ...saved, isNew: false } : d))
            toast.success('Dia não letivo adicionado!')
        } catch (error) {
            const msg = error.response?.data?.data?.[0] || 'Erro ao salvar'
            toast.error(msg)
        }
    }

    // ====== Dias Letivos Extras - Inline ======
    const addDiaExtra = () => {
        setDiasExtras(prev => [{ id: null, data: '', descricao: '', isNew: true }, ...prev])
    }

    const updateDiaExtra = (index, field, value) => {
        setDiasExtras(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d))
    }

    const removeDiaExtra = async (index) => {
        const dia = diasExtras[index]
        if (dia.id && !dia.isNew) {
            try {
                await coreAPI.anosLetivos.removeDia(ano, dia.id, 'extra')
                toast.success('Removido!')
            } catch (error) {
                toast.error('Erro ao remover')
                return
            }
        }
        setDiasExtras(prev => prev.filter((_, i) => i !== index))
    }

    const saveDiaExtra = async (index) => {
        const dia = diasExtras[index]
        if (!dia.data) {
            toast.error('Data é obrigatória')
            return
        }

        // Validar: só pode ser sábado ou domingo
        const date = new Date(dia.data + 'T00:00:00')
        const dayOfWeek = date.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            toast.error('Dias extras devem ser sábados ou domingos')
            return
        }

        try {
            const { data: saved } = await coreAPI.anosLetivos.addDiaLetivoExtra(ano, {
                data: dia.data,
                descricao: dia.descricao
            })
            setDiasExtras(prev => prev.map((d, i) => i === index ? { ...saved, isNew: false } : d))
            toast.success('Dia extra adicionado!')
        } catch (error) {
            const msg = error.response?.data?.data?.[0] || 'Erro ao salvar'
            toast.error(msg)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loading size="lg" />
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">

                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        Editar Ano Letivo {ano}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Configure bimestres, feriados e dias letivos extras.
                    </p>
                </div>
            </div>

            {/* Bimestres e Status */}
            <Card hover={false}>
                <div className="space-y-8">
                    {/* Seção Bimestres */}
                    <div>
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                                Datas dos Bimestres
                            </h2>
                            <p className="text-sm text-slate-500">
                                Defina o período de duração de cada bimestre escolar.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* 1º Bimestre */}
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                                <span className="text-sm font-semibold text-slate-800 dark:text-white block">
                                    1º Bimestre
                                </span>
                                <DateInput
                                    label="Início"
                                    value={formData.data_inicio_1bim}
                                    onChange={(e) => handleChange('data_inicio_1bim', e.target.value)}
                                    min={minDate}
                                    max={formData.data_fim_1bim || maxDate}
                                />
                                <DateInput
                                    label="Fim"
                                    value={formData.data_fim_1bim}
                                    onChange={(e) => handleChange('data_fim_1bim', e.target.value)}
                                    min={formData.data_inicio_1bim || minDate}
                                    max={formData.data_inicio_2bim || maxDate}
                                />
                                {calcDiasLetivosBim(formData.data_inicio_1bim, formData.data_fim_1bim) !== null && (
                                    <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <span className="text-lg font-bold text-brand-600">{calcDiasLetivosBim(formData.data_inicio_1bim, formData.data_fim_1bim)}</span>
                                        <span className="text-xs text-slate-500 ml-1">dias letivos</span>
                                    </div>
                                )}
                            </div>

                            {/* 2º Bimestre */}
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                                <span className="text-sm font-semibold text-slate-800 dark:text-white block">
                                    2º Bimestre
                                </span>
                                <DateInput
                                    label="Início"
                                    value={formData.data_inicio_2bim}
                                    onChange={(e) => handleChange('data_inicio_2bim', e.target.value)}
                                    min={nextDay(formData.data_fim_1bim) || minDate}
                                    max={formData.data_fim_2bim || maxDate}
                                />
                                <DateInput
                                    label="Fim"
                                    value={formData.data_fim_2bim}
                                    onChange={(e) => handleChange('data_fim_2bim', e.target.value)}
                                    min={formData.data_inicio_2bim || minDate}
                                    max={formData.data_inicio_3bim || maxDate}
                                />
                                {calcDiasLetivosBim(formData.data_inicio_2bim, formData.data_fim_2bim) !== null && (
                                    <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <span className="text-lg font-bold text-brand-600">{calcDiasLetivosBim(formData.data_inicio_2bim, formData.data_fim_2bim)}</span>
                                        <span className="text-xs text-slate-500 ml-1">dias letivos</span>
                                    </div>
                                )}
                            </div>

                            {/* 3º Bimestre */}
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                                <span className="text-sm font-semibold text-slate-800 dark:text-white block">
                                    3º Bimestre
                                </span>
                                <DateInput
                                    label="Início"
                                    value={formData.data_inicio_3bim}
                                    onChange={(e) => handleChange('data_inicio_3bim', e.target.value)}
                                    min={nextDay(formData.data_fim_2bim) || minDate}
                                    max={formData.data_fim_3bim || maxDate}
                                />
                                <DateInput
                                    label="Fim"
                                    value={formData.data_fim_3bim}
                                    onChange={(e) => handleChange('data_fim_3bim', e.target.value)}
                                    min={formData.data_inicio_3bim || minDate}
                                    max={formData.data_inicio_4bim || maxDate}
                                />
                                {calcDiasLetivosBim(formData.data_inicio_3bim, formData.data_fim_3bim) !== null && (
                                    <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <span className="text-lg font-bold text-brand-600">{calcDiasLetivosBim(formData.data_inicio_3bim, formData.data_fim_3bim)}</span>
                                        <span className="text-xs text-slate-500 ml-1">dias letivos</span>
                                    </div>
                                )}
                            </div>

                            {/* 4º Bimestre */}
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                                <span className="text-sm font-semibold text-slate-800 dark:text-white block">
                                    4º Bimestre
                                </span>
                                <DateInput
                                    label="Início"
                                    value={formData.data_inicio_4bim}
                                    onChange={(e) => handleChange('data_inicio_4bim', e.target.value)}
                                    min={nextDay(formData.data_fim_3bim) || minDate}
                                    max={formData.data_fim_4bim || maxDate}
                                />
                                <DateInput
                                    label="Fim"
                                    value={formData.data_fim_4bim}
                                    onChange={(e) => handleChange('data_fim_4bim', e.target.value)}
                                    min={formData.data_inicio_4bim || minDate}
                                    max={maxDate}
                                />
                                {calcDiasLetivosBim(formData.data_inicio_4bim, formData.data_fim_4bim) !== null && (
                                    <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <span className="text-lg font-bold text-brand-600">{calcDiasLetivosBim(formData.data_inicio_4bim, formData.data_fim_4bim)}</span>
                                        <span className="text-xs text-slate-500 ml-1">dias letivos</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Seção Status */}
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                                Configurações do Ano
                            </h2>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <Checkbox
                                label="Ano Letivo Ativo (Corrente)"
                                checked={formData.is_active}
                                onChange={(checked) => handleChange('is_active', checked)}
                            />
                            <p className="text-sm text-slate-500 mt-2 ml-8">
                                Ao marcar este ano como ativo, ele se tornará o ano padrão para matrículas e visualizações.
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* SEÇÃO: Dias Não Letivos */}
            <Card hover={false}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                            Feriados e Dias Não Letivos
                        </h2>
                        <p className="text-sm text-slate-500">Cadastre feriados, recessos e suspensões.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addDiaNaoLetivo}>
                        + Adicionar Dia
                    </Button>
                </div>

                <div className="space-y-6">
                    {[...diasNaoLetivos]
                        .sort((a, b) => {
                            // Novos (sem data) ficam no topo
                            if (!a.data && !b.data) return 0
                            if (!a.data) return -1
                            if (!b.data) return 1
                            return a.data.localeCompare(b.data)
                        })
                        .map((dia, index) => {
                            const originalIndex = diasNaoLetivos.findIndex(d => d === dia)
                            return (
                                <div
                                    key={dia.id || `new-${originalIndex}`}
                                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {dia.isNew ? 'Novo dia não letivo' : (dia.data ? formatDateBR(dia.data) : `Dia ${index + 1}`)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeDiaNaoLetivo(originalIndex)}
                                            className="p-1 text-danger-500 hover:text-danger-700 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded"
                                        >
                                            <HiTrash className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <DateInput
                                            label="Data *"
                                            value={dia.data}
                                            onChange={(e) => updateDiaNaoLetivo(originalIndex, 'data', e.target.value)}
                                            disabled={!dia.isNew}
                                            min={minDate}
                                            max={maxDate}
                                        />
                                        <Select
                                            label="Tipo *"
                                            value={dia.tipo}
                                            onChange={(e) => updateDiaNaoLetivo(originalIndex, 'tipo', e.target.value)}
                                            options={TIPOS_DIA_NAO_LETIVO}
                                            disabled={!dia.isNew}
                                        />
                                        <Input
                                            label="Descrição"
                                            placeholder="Ex: Feriado Nacional"
                                            value={dia.descricao}
                                            onChange={(e) => updateDiaNaoLetivo(originalIndex, 'descricao', e.target.value)}
                                            disabled={!dia.isNew}
                                        />
                                    </div>

                                    {dia.isNew && (
                                        <div className="mt-4 flex justify-end">
                                            <Button size="sm" onClick={() => saveDiaNaoLetivo(originalIndex)}>
                                                Salvar Dia
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                    {diasNaoLetivos.length === 0 && (
                        <p className="text-center text-slate-500 py-6">Nenhum dia não letivo cadastrado.</p>
                    )}
                </div>
            </Card>

            {/* SEÇÃO: Dias Letivos Extras */}
            <Card hover={false}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                            Sábados Letivos e Dias Extras
                        </h2>
                        <p className="text-sm text-slate-500">Cadastre sábados ou feriados que terão aula.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addDiaExtra}>
                        + Adicionar Dia
                    </Button>
                </div>

                <div className="space-y-6">
                    {[...diasExtras]
                        .sort((a, b) => {
                            if (!a.data && !b.data) return 0
                            if (!a.data) return -1
                            if (!b.data) return 1
                            return a.data.localeCompare(b.data)
                        })
                        .map((dia, index) => {
                            const originalIndex = diasExtras.findIndex(d => d === dia)
                            return (
                                <div
                                    key={dia.id || `new-extra-${originalIndex}`}
                                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {dia.isNew ? 'Novo dia extra' : (dia.data ? formatDateBR(dia.data) : `Dia ${index + 1}`)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeDiaExtra(originalIndex)}
                                            className="p-1 text-danger-500 hover:text-danger-700 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded"
                                        >
                                            <HiTrash className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <DateInput
                                            label="Data *"
                                            value={dia.data}
                                            onChange={(e) => updateDiaExtra(originalIndex, 'data', e.target.value)}
                                            disabled={!dia.isNew}
                                            min={minDate}
                                            max={maxDate}
                                        />
                                        <Input
                                            label="Descrição"
                                            placeholder="Ex: Sábado letivo - reposição"
                                            value={dia.descricao}
                                            onChange={(e) => updateDiaExtra(originalIndex, 'descricao', e.target.value)}
                                            disabled={!dia.isNew}
                                        />
                                    </div>

                                    {dia.isNew && (
                                        <div className="mt-4 flex justify-end">
                                            <Button size="sm" onClick={() => saveDiaExtra(originalIndex)}>
                                                Salvar Dia
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                    {diasExtras.length === 0 && (
                        <p className="text-center text-slate-500 py-6">Nenhum dia extra cadastrado.</p>
                    )}
                </div>
            </Card>

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={() => navigate('/configuracoes?tab=calendario')}>
                    Cancelar
                </Button>
                <Button icon={HiSave} onClick={handleSave} loading={saving}>
                    Salvar Alterações
                </Button>
            </div>
        </div>
    )
}
