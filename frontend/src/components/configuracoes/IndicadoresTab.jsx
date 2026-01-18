import { useState, useEffect, useMemo } from 'react'
import { HiPlus, HiX, HiSave, HiClipboardList } from 'react-icons/hi'
import { coreAPI } from '../../services/api'
import { Loading, Button, Card } from '../ui'
import CreatableCombobox from '../ui/CreatableCombobox'
import { DragDropGroups } from '../ui/DragDropList'
import toast from 'react-hot-toast'

export default function IndicadoresTab() {
    // Ano letivo selecionado pelo usuário
    const [activeAno, setActiveAno] = useState(null)

    // Dados do servidor
    const [indicadoresExistentes, setIndicadoresExistentes] = useState([]) // IndicadorBimestre (todos)
    const [indicadoresAnoLetivo, setIndicadoresAnoLetivo] = useState([]) // IndicadorBimestreAnoLetivo

    // Estado local (lista de trabalho)
    const [grupos, setGrupos] = useState([]) // [{ id, name, items: [{ id, nome, categoria, isNew, isActive }] }]

    // Form de inserção
    const [nomeIndicador, setNomeIndicador] = useState('')
    const [categoriaIndicador, setCategoriaIndicador] = useState('')
    const [mostrarCategoria, setMostrarCategoria] = useState(false)

    // UI states
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // Carrega ano letivo selecionado e dados iniciais
    useEffect(() => {
        loadInitialData()
    }, [])

    const loadInitialData = async () => {
        try {
            setLoading(true)

            // Obtém o ano letivo selecionado pelo usuário
            const { data: selecData } = await coreAPI.anoLetivoSelecionado.get()
            if (selecData.ano_letivo_details) {
                setActiveAno(selecData.ano_letivo_details)
                await loadIndicadores(selecData.ano_letivo_details.id)
            }
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error)
            toast.error('Erro ao carregar dados')
        } finally {
            setLoading(false)
        }
    }

    const loadIndicadores = async (anoId) => {
        try {
            // Carrega todos os IndicadorBimestre (para sugestões)
            const { data: indicadores } = await coreAPI.indicadoresBimestre.list()
            setIndicadoresExistentes(indicadores.results || indicadores)

            // Carrega IndicadorBimestreAnoLetivo do ano selecionado
            const { data: indicadoresAno } = await coreAPI.indicadoresBimestreAnoLetivo.list({
                ano_letivo: anoId
            })
            const listaAno = indicadoresAno.results || indicadoresAno
            setIndicadoresAnoLetivo(listaAno)

            // Converte para estrutura de grupos
            const gruposConvertidos = convertToGroups(listaAno)
            setGrupos(gruposConvertidos)
            setHasChanges(false)
        } catch (error) {
            console.error('Erro ao carregar indicadores:', error)
            toast.error('Erro ao carregar indicadores')
        }
    }



    // Converte lista flat para grupos por categoria (apenas ativos)
    const convertToGroups = (lista) => {
        const groupMap = new Map()

        // Filtra apenas ativos para a lista de trabalho
        const ativos = lista.filter(item => item.is_active)

        ativos.forEach(item => {
            const categoria = item.indicador_categoria
            const posCategoria = item.posicao_categoria

            if (!groupMap.has(categoria)) {
                groupMap.set(categoria, {
                    id: categoria,
                    name: categoria,
                    posicao: posCategoria,
                    items: []
                })
            }

            groupMap.get(categoria).items.push({
                id: item.id,
                indicadorId: item.indicador,
                nome: item.indicador_nome,
                categoria: categoria,
                posicao: item.posicao,
                isNew: false
            })
        })

        // Ordena grupos por posição e itens por posição
        const gruposOrdenados = Array.from(groupMap.values())
            .sort((a, b) => a.posicao - b.posicao)
            .map(g => ({
                ...g,
                items: g.items.sort((a, b) => a.posicao - b.posicao)
            }))
            .filter(g => g.items.length > 0) // Remove grupos vazios

        return gruposOrdenados
    }

    // Opções de nomes de indicadores (excluindo os já adicionados no ano)
    const opcoesNome = useMemo(() => {
        const adicionados = new Set(
            grupos.flatMap(g => g.items.map(i => i.nome.toLowerCase()))
        )

        return indicadoresExistentes
            .filter(ind => !adicionados.has(ind.nome.toLowerCase()))
            .map(ind => ({
                value: ind.id,
                label: ind.nome,
                categoria: ind.categoria
            }))
    }, [indicadoresExistentes, grupos])

    // Opções de categorias (do servidor + categorias criadas localmente)
    const opcoesCategorias = useMemo(() => {
        // Categorias do servidor
        const categoriasServidor = new Set(indicadoresExistentes.map(ind => ind.categoria))
        // Categorias criadas localmente (grupos atuais)
        grupos.forEach(g => categoriasServidor.add(g.name))

        return Array.from(categoriasServidor).map(cat => ({
            value: cat,
            label: cat
        }))
    }, [indicadoresExistentes, grupos])

    // Verifica se o nome digitado existe nos indicadores do servidor
    const indicadorExistente = useMemo(() => {
        if (!nomeIndicador.trim()) return null
        return indicadoresExistentes.find(
            ind => ind.nome.toLowerCase() === nomeIndicador.toLowerCase().trim()
        )
    }, [nomeIndicador, indicadoresExistentes])

    // Verifica se o indicador já está na lista local (ativos visíveis)
    const indicadorNaLista = useMemo(() => {
        if (!nomeIndicador.trim()) return false
        return grupos.some(g =>
            g.items.some(i => i.nome.toLowerCase() === nomeIndicador.toLowerCase().trim())
        )
    }, [nomeIndicador, grupos])

    // Verifica se o indicador está inativo no ano letivo (para reativar)
    const indicadorInativo = useMemo(() => {
        if (!nomeIndicador.trim()) return null
        return indicadoresAnoLetivo.find(item =>
            !item.is_active && item.indicador_nome?.toLowerCase() === nomeIndicador.toLowerCase().trim()
        )
    }, [nomeIndicador, indicadoresAnoLetivo])

    // Atualiza mostrarCategoria quando muda o nome
    useEffect(() => {
        if (indicadorExistente) {
            // Se existe, usa a categoria dele automaticamente
            setCategoriaIndicador(indicadorExistente.categoria)
            setMostrarCategoria(false)
        } else if (nomeIndicador.trim()) {
            // Se não existe, mostra campo de categoria
            setMostrarCategoria(true)
        } else {
            setMostrarCategoria(false)
            setCategoriaIndicador('')
        }
    }, [nomeIndicador, indicadorExistente])

    // Handler para selecionar nome do indicador
    const handleNomeChange = (value) => {
        setNomeIndicador(value)
    }

    // Handler para Enter - insere se possível
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            // Só insere se o botão estaria habilitado
            const podeInserir = nomeIndicador.trim() && !indicadorNaLista && (indicadorExistente || categoriaIndicador.trim())
            if (podeInserir) {
                handleInserir()
            }
        }
    }

    // Insere indicador na lista
    const handleInserir = () => {
        const nome = nomeIndicador.trim()
        const categoria = indicadorExistente?.categoria || categoriaIndicador.trim()

        if (!nome) {
            toast.error('Digite o nome do indicador')
            return
        }

        if (!categoria) {
            toast.error('Selecione ou digite uma categoria')
            return
        }

        // Verifica se já está na lista (usa o memo já calculado)
        if (indicadorNaLista) {
            toast.error('Este indicador já está na lista')
            return
        }

        // Adiciona ao grupo correspondente ou cria novo grupo
        setGrupos(prevGrupos => {
            // Verifica novamente dentro do setGrupos para garantir atomicidade
            const jaExiste = prevGrupos.some(g =>
                g.items.some(i =>
                    i.nome.toLowerCase() === nome.toLowerCase() ||
                    (indicadorInativo && i.id === indicadorInativo.id)
                )
            )

            if (jaExiste) {
                // Não adiciona se já existe
                return prevGrupos
            }

            const novoGrupos = [...prevGrupos]
            let grupo = novoGrupos.find(g => g.name.toLowerCase() === categoria.toLowerCase())

            // Se é reativação de indicador inativo, usa o ID existente
            const novoItem = {
                id: indicadorInativo?.id || crypto.randomUUID(),
                indicadorId: indicadorInativo?.indicador || indicadorExistente?.id || null,
                nome: nome,
                categoria: categoria,
                posicao: 0,
                isNew: !indicadorInativo // Não é "novo" se está reativando
            }

            if (grupo) {
                // Adiciona ao grupo existente
                grupo.items = [...grupo.items, novoItem]
            } else {
                // Cria novo grupo
                novoGrupos.push({
                    id: categoria,
                    name: categoria,
                    items: [novoItem]
                })
            }

            return novoGrupos
        })

        // Se reativou um inativo, atualiza o estado local para evitar duplicação
        if (indicadorInativo) {
            setIndicadoresAnoLetivo(prev =>
                prev.map(item =>
                    item.id === indicadorInativo.id
                        ? { ...item, is_active: true }
                        : item
                )
            )
            toast.success('Indicador reativado')
        } else {
            toast.success('Indicador adicionado à lista')
        }

        // Limpa form
        setNomeIndicador('')
        setCategoriaIndicador('')
        setMostrarCategoria(false)
        setHasChanges(true)
    }

    // Remove indicador da lista
    const handleRemover = (grupoId, itemId) => {
        setGrupos(prevGrupos => {
            return prevGrupos
                .map(g => {
                    if (g.id === grupoId) {
                        return {
                            ...g,
                            items: g.items.filter(i => i.id !== itemId)
                        }
                    }
                    return g
                })
                .filter(g => g.items.length > 0) // Remove grupos vazios
        })
        setHasChanges(true)
    }

    // Reordena grupos (categorias)
    const handleReorderGroups = (newGroups) => {
        setGrupos(newGroups)
        setHasChanges(true)
    }

    // Reordena itens dentro de grupos
    const handleReorderItems = (newGroups) => {
        setGrupos(newGroups)
        setHasChanges(true)
    }

    // Salva tudo no backend
    const handleSalvar = async () => {
        if (!activeAno?.id) {
            toast.error('Nenhum ano letivo selecionado')
            return
        }

        try {
            setSaving(true)

            // Monta lista de indicadores com posições
            const indicadores = []
            grupos.forEach((grupo, grupoIndex) => {
                grupo.items.forEach((item, itemIndex) => {
                    indicadores.push({
                        indicador_id: item.indicadorId,
                        nome: item.nome,
                        categoria: grupo.name,
                        posicao_categoria: grupoIndex + 1,
                        posicao: itemIndex + 1,
                        is_active: item.isActive !== false
                    })
                })
            })

            await coreAPI.indicadoresBimestreAnoLetivo.salvarLote({ indicadores })

            toast.success('Indicadores salvos com sucesso!')
            setHasChanges(false)

            // Recarrega para sincronizar IDs
            await loadIndicadores(activeAno.id)
        } catch (error) {
            console.error('Erro ao salvar:', error)
            toast.error(error.response?.data?.error || 'Erro ao salvar indicadores')
        } finally {
            setSaving(false)
        }
    }

    // Render do header do grupo
    const renderGroupHeader = (group, groupIndex) => (
        <div className="flex items-center gap-2">
            <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-bold">
                {groupIndex + 1}
            </span>
            <span className="font-semibold text-slate-800 dark:text-white">
                {group.name}
            </span>
            <span className="text-sm text-slate-400">
                ({group.items.length} {group.items.length === 1 ? 'indicador' : 'indicadores'})
            </span>
        </div>
    )

    // Render do item
    const renderItem = (item, itemIndex, group, groupIndex) => (
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-medium text-slate-400 w-8">
                    {groupIndex + 1}.{itemIndex + 1}
                </span>
                <span className={`text-sm truncate ${item.isActive === false ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                    {item.nome}
                </span>
                {item.isNew && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300">
                        novo
                    </span>
                )}
            </div>
            <button
                type="button"
                onClick={() => handleRemover(group.id, item.id)}
                className="p-1 rounded-lg hover:bg-danger-100 dark:hover:bg-danger-900/30 text-slate-400 hover:text-danger-600 transition-colors"
                title="Remover"
            >
                <HiX className="w-4 h-4" />
            </button>
        </div>
    )

    if (loading) return <Loading />

    if (!activeAno) {
        return (
            <Card className="text-center py-12">
                <HiClipboardList className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nenhum ano letivo ativo para configurar os indicadores</p>
            </Card>
        )
    }

    return (
        <Card className="w-full">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                            Indicadores Bimestrais
                        </h2>
                        <p className="text-slate-500 text-sm">
                            Configure os indicadores para avaliação bimestral - {activeAno?.ano}
                        </p>
                    </div>
                    <Button
                        onClick={handleSalvar}
                        loading={saving}
                        disabled={!hasChanges}
                    >
                        <HiSave className="h-5 w-5 mr-1" />
                        Salvar
                    </Button>
                </div>

                {/* Aviso de alterações não salvas */}
                {hasChanges && (
                    <div className="p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
                        <p className="text-sm text-warning-700 dark:text-warning-300">
                            ⚠️ Você tem alterações não salvas. Clique em "Salvar" para persistir as mudanças.
                        </p>
                    </div>
                )}

                {/* Form de Inserção */}
                <Card hover={false} className="border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center">
                            <HiPlus className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                                Adicionar Indicador
                            </h3>
                            <p className="text-sm text-slate-500">
                                Digite o nome do indicador. Se não existir, informe a categoria.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className={mostrarCategoria ? 'md:col-span-5' : 'md:col-span-10'}>
                            <CreatableCombobox
                                label="Nome do Indicador"
                                placeholder="Ex: Apresentou baixa assiduidade..."
                                value={nomeIndicador}
                                onChange={handleNomeChange}
                                options={opcoesNome}
                                allowCreate={true}
                                createLabel="Novo:"
                                onKeyDown={handleKeyDown}
                            />
                        </div>

                        {mostrarCategoria && (
                            <div className="md:col-span-5">
                                <CreatableCombobox
                                    label="Categoria"
                                    placeholder="Ex: Participação e Assiduidade"
                                    value={categoriaIndicador}
                                    onChange={setCategoriaIndicador}
                                    options={opcoesCategorias}
                                    allowCreate={true}
                                    createLabel="Nova:"
                                    onKeyDown={handleKeyDown}
                                />
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <Button
                                onClick={handleInserir}
                                className="w-full"
                                disabled={!nomeIndicador.trim() || indicadorNaLista || (!indicadorExistente && !categoriaIndicador.trim())}
                            >
                                <HiPlus className="h-5 w-5 mr-1" />
                                Inserir
                            </Button>
                        </div>
                    </div>

                    {indicadorNaLista && (
                        <p className="mt-2 text-sm text-warning-600">
                            ⚠️ Este indicador já está na lista abaixo
                        </p>
                    )}

                    {indicadorExistente && !indicadorNaLista && (
                        <p className="mt-2 text-sm text-slate-500">
                            <span className="text-success-600">✓</span> Indicador existente - Categoria: <strong>{indicadorExistente.categoria}</strong>
                        </p>
                    )}
                </Card>

                {/* Lista de Indicadores */}
                {grupos.length > 0 ? (
                    <div>
                        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                            Indicadores configurados ({grupos.reduce((acc, g) => acc + g.items.length, 0)} total)
                        </h3>

                        <DragDropGroups
                            groups={grupos}
                            onReorderGroups={handleReorderGroups}
                            onReorderItems={handleReorderItems}
                            renderGroupHeader={renderGroupHeader}
                            renderItem={renderItem}
                            groupKeyExtractor={(g) => g.id}
                            itemKeyExtractor={(i) => i.id}
                        />

                        {hasChanges && (
                            <div className="mt-4 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
                                <p className="text-sm text-warning-700 dark:text-warning-300">
                                    ⚠️ Você tem alterações não salvas. Clique em "Salvar" para persistir as mudanças.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                        <HiClipboardList className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">Nenhum indicador configurado</p>
                        <p className="text-sm mt-1">
                            Use o formulário acima para adicionar indicadores
                        </p>
                    </div>
                )}
            </div>
        </Card>
    )
}
