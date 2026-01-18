import { useState, useEffect, useMemo } from 'react'
import { Card, Button } from '../ui'
import { HiPlus, HiSave } from 'react-icons/hi'
import { toast } from 'react-hot-toast'
import { pedagogicalAPI } from '../../services/api'
import { useReferences } from '../../contexts/ReferenceContext'
import CreatableCombobox from '../ui/CreatableCombobox'
import DragDropList from '../ui/DragDropList'

export default function DescritoresTab() {
    const { anosLetivos } = useReferences()
    const [activeAno, setActiveAno] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // Dados crus do backend
    const [descritoresExistentes, setDescritoresExistentes] = useState([])
    const [descritoresAnoLetivo, setDescritoresAnoLetivo] = useState([])

    // Estado local da lista (o que o usuário vê e edita)
    const [listaDescritores, setListaDescritores] = useState([])

    // Formulário - mantemos apenas para controle de reset
    const [textoDescritor, setTextoDescritor] = useState('')

    // Define ano ativo
    useEffect(() => {
        if (anosLetivos && anosLetivos.length > 0) {
            const ativo = anosLetivos.find(a => a.is_active) || anosLetivos[0]
            setActiveAno(ativo)
        }
    }, [anosLetivos])

    // Carrega dados iniciais
    useEffect(() => {
        if (activeAno?.id) {
            loadData()
        }
    }, [activeAno?.id])

    const loadData = async () => {
        setLoading(true)
        try {
            const [descResponse, descAnoResponse] = await Promise.all([
                pedagogicalAPI.descritoresOcorrencia.list({ page_size: 1000 }),
                pedagogicalAPI.descritoresOcorrenciaAno.list({
                    ano_letivo: activeAno.id,
                    page_size: 1000
                })
            ])

            setDescritoresExistentes(descResponse.data.results || [])
            setDescritoresAnoLetivo(descAnoResponse.data.results || [])

            // Filtra apenas ativos para a lista de trabalho
            const ativos = (descAnoResponse.data.results || [])
                .filter(item => item.is_active)
                .sort((a, b) => a.posicao - b.posicao)
                .map(item => ({
                    id: item.id,
                    descritorId: item.descritor,
                    texto: item.descritor_texto,
                    posicao: item.posicao,
                    isNew: false
                }))

            setListaDescritores(ativos)
            setHasChanges(false)

        } catch (error) {
            console.error('Erro ao carregar descritores:', error)
            toast.error('Erro ao carregar dados.')
        } finally {
            setLoading(false)
        }
    }

    // Opções para o combobox (excluindo os já adicionados na lista visível)
    const opcoesDescritores = useMemo(() => {
        const adicionados = new Set(
            listaDescritores.map(d => d.texto.toLowerCase().trim())
        )

        return descritoresExistentes
            .filter(d => !adicionados.has(d.texto.toLowerCase().trim()))
            .map(d => ({
                value: d.texto,
                label: d.texto
            }))
    }, [descritoresExistentes, listaDescritores])


    const handleInserir = (valor) => {
        const texto = valor?.trim()
        if (!texto) {
            setTextoDescritor('')
            return
        }

        // Verifica duplicidade
        const naLista = listaDescritores.some(d => d.texto.toLowerCase() === texto.toLowerCase())
        if (naLista) {
            toast.error('Esta ocorrência já está na lista')
            setTextoDescritor('')
            return
        }

        // Verifica status no backend para reativar/vincular
        const inativo = descritoresAnoLetivo.find(d =>
            !d.is_active && d.descritor_texto?.toLowerCase().trim() === texto.toLowerCase()
        )
        const existenteBase = descritoresExistentes.find(d =>
            d.texto.toLowerCase().trim() === texto.toLowerCase()
        )

        setListaDescritores(prev => {
            // Dupla verificação
            const jaExiste = prev.some(d =>
                d.texto.toLowerCase() === texto.toLowerCase()
            )
            if (jaExiste) return prev

            const novoItem = {
                id: inativo?.id || crypto.randomUUID(),
                descritorId: inativo?.descritor || existenteBase?.id || null,
                texto: texto,
                posicao: prev.length + 1,
                isNew: !inativo
            }

            return [...prev, novoItem]
        })

        // Se reativou, atualiza estado local dos dados vindos do backend
        if (inativo) {
            setDescritoresAnoLetivo(prev =>
                prev.map(d => d.id === inativo.id ? { ...d, is_active: true } : d)
            )
            toast.success('Ocorrência reativada')
        }
        // Não mostramos toast de sucesso para adição simples para ser mais fluido, ou mostramos?
        // O usuário pediu "já vai para a lista". Feedback visual na lista é suficiente, ou toast para confirmação.
        // Vou manter o toast para feedback claro.
        else {
            toast.success('Ocorrência adicionada')
        }

        setHasChanges(true)
        setTextoDescritor('') // Limpa input
    }

    const handleRemover = (itemId) => {
        setListaDescritores(prev => prev.filter(d => d.id !== itemId))
        setHasChanges(true)
    }

    const handleReorder = (newItems) => {
        // Atualiza posições visuais
        const listaAtualizada = newItems.map((item, index) => ({
            ...item,
            posicao: index + 1
        }))
        setListaDescritores(listaAtualizada)
        setHasChanges(true)
    }

    const handleSalvar = async () => {
        if (!activeAno) return
        setSaving(true)

        try {
            const payload = {
                descritores: listaDescritores.map((item, index) => ({
                    descritor_id: item.descritorId,
                    texto: item.texto,
                    posicao: index + 1,
                    is_active: true
                }))
            }

            const response = await pedagogicalAPI.descritoresOcorrenciaAno.salvarLote(payload)

            if (response.data.status === 'ok') {
                toast.success('Alterações salvas com sucesso!')
                loadData()
            }
        } catch (error) {
            console.error('Erro ao salvar:', error)
            toast.error('Erro ao salvar alterações.')
        } finally {
            setSaving(false)
        }
    }

    if (loading && !listaDescritores.length) {
        return <div className="p-8 text-center text-slate-500">Carregando...</div>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                        Tipos de Ocorrência
                    </h2>
                    <p className="text-slate-500 text-sm">
                        Configure os tipos de ocorrência pedagógica disponíveis para registro - {activeAno?.ano}
                    </p>
                </div>
                <Button
                    onClick={handleSalvar}
                    loading={saving}
                    disabled={!hasChanges}
                    className="w-full md:w-auto"
                >
                    <HiSave className="h-5 w-5 mr-1" />
                    Salvar
                </Button>
            </div>

            {hasChanges && (
                <div className="p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
                    <p className="text-sm text-warning-700 dark:text-warning-300">
                        ⚠️ Você tem alterações não salvas. Clique em "Salvar" para persistir as mudanças.
                    </p>
                </div>
            )}

            {/* Inserção Simplificada */}
            <Card hover={false} className="border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                        <HiPlus className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                            Adicionar Tipo de Ocorrência
                        </h3>
                        <p className="text-sm text-slate-500">
                            Selecione uma opção existente ou digite para criar uma nova.
                        </p>
                    </div>
                </div>

                <div className="w-full">
                    <CreatableCombobox
                        label="Descrição da Ocorrência"
                        value={textoDescritor}
                        onChange={handleInserir} // Ao selecionar ou dar enter, insere direto
                        options={opcoesDescritores}
                        placeholder="Digite para buscar ou criar..."
                        createLabel='Adicionar "'
                    />
                </div>
            </Card>

            {/* Lista com Drag and Drop */}
            <div className="space-y-4">
                <DragDropList
                    items={listaDescritores}
                    onReorder={handleReorder}
                    itemClassName="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
                    showDragHandle={true}
                    renderItem={(item, index) => {
                        const originalItem = descritoresAnoLetivo.find(d => d.id === item.id)
                        const mudouPosicao = !item.isNew && originalItem && originalItem.posicao !== (index + 1)

                        return (
                            <div className={`flex items-center justify-between gap-4 w-full p-1 rounded-lg border-2 transition-all ${mudouPosicao
                                    ? 'border-blue-500/50 dark:border-blue-400/50'
                                    : 'border-transparent'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-mono font-bold min-w-[28px] ${mudouPosicao ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                                        }`}>
                                        {String(index + 1).padStart(2, '0')}.
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-700 dark:text-slate-200">
                                            {item.texto}
                                        </span>
                                        {item.isNew && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                                                Novo
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemover(item.id)
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Remover (será desativado)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        )
                    }}
                />

                {hasChanges && listaDescritores.length > 0 && (
                    <div className="p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
                        <p className="text-sm text-warning-700 dark:text-warning-300">
                            ⚠️ Você tem alterações não salvas. Clique em "Salvar" para persistir as mudanças.
                        </p>
                    </div>
                )}

                {listaDescritores.length === 0 && !loading && (
                    <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                        <div className="w-16 h-16 mx-auto bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Nenhum descritor configurado</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                            Use o formulário acima para adicionar tipos de ocorrências pedagógicas para este ano letivo.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
