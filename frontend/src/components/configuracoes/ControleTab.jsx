import { useState, useEffect, useCallback } from 'react'
import { HiChevronDown, HiChevronRight, HiInformationCircle } from 'react-icons/hi'
import { coreAPI } from '../../services/api'
import { Loading, Badge, FormActions } from '../ui'
import ControleForm from '../../pages/ControleForm'
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

export default function ControleTab() {
    const [controles, setControles] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeAno, setActiveAno] = useState(null)
    const [hasChanges, setHasChanges] = useState(false)

    const [expandedBimestres, setExpandedBimestres] = useState([1])
    const { anosLetivos } = useReferences()

    useEffect(() => {
        if (anosLetivos && anosLetivos.length > 0) {
            const ativo = anosLetivos.find(a => a.is_active) || anosLetivos[0]
            setActiveAno(ativo)
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
        const dirtyControles = controles.filter(c => c._dirty)
        if (dirtyControles.length === 0) return

        setSaving(true)
        try {
            const payload = dirtyControles.map(c => ({
                ano_letivo: c.ano_letivo || activeAno?.id,
                bimestre: c.bimestre,
                tipo: c.tipo,
                data_inicio: c.data_inicio || null,
                data_fim: c.data_fim || null,
                digitacao_futura: c.digitacao_futura
            }))

            await coreAPI.controleRegistros.salvarLote({ controles: payload })

            // Recarregar para pegar status atualizado
            const { data } = await coreAPI.controleRegistros.porAno(activeAno?.ano)
            setControles(Array.isArray(data) ? data : [])
            setHasChanges(false)

            toast.success('Alterações salvas com sucesso!')
        } catch (error) {
            console.error('Erro ao salvar:', error)
            toast.error('Erro ao salvar alterações')
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        if (hasChanges) {
            loadControles()
            setHasChanges(false)
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
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                Não há um ano letivo ativo para configurar controles.
            </div>
        )
    }

    return (
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

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
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
                disabled={!hasChanges}
                className="mt-6"
            />
        </div>
    )
}
