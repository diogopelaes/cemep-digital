import { useState, useEffect } from 'react'
import { HiPlus, HiTrash, HiPencil, HiSearch, HiAcademicCap } from 'react-icons/hi'
import { coreAPI } from '../../services/api'
import { Loading, Badge, Button, Input, PopConfirm, Card, MultiCombobox, Pagination } from '../ui'
import toast from 'react-hot-toast'

export default function HabilidadesTab() {
    const [habilidades, setHabilidades] = useState([])
    const [disciplinas, setDisciplinas] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Paginação
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 20

    // Form states
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [formData, setFormData] = useState({ codigo: '', descricao: '', disciplinas: [] })

    // Carrega disciplinas uma vez
    useEffect(() => {
        loadDisciplinas()
    }, [])

    // Debounce para busca automática
    useEffect(() => {
        const timer = setTimeout(() => {
            loadHabilidades()
        }, 400)
        return () => clearTimeout(timer)
    }, [searchTerm, currentPage])

    const loadDisciplinas = async () => {
        try {
            const res = await coreAPI.disciplinas.list({ is_active: true })
            setDisciplinas(res.data.results || res.data)
        } catch (error) {
            console.error('Erro ao carregar disciplinas:', error)
        }
    }

    const loadHabilidades = async () => {
        try {
            setLoading(true)
            const { data } = await coreAPI.habilidades.list({
                search: searchTerm,
                page: currentPage
            })
            setHabilidades(data.results || data)
            setTotalCount(data.count || (data.results || data).length)
            setTotalPages(Math.ceil((data.count || (data.results || data).length) / pageSize))
        } catch (error) {
            console.error('Erro ao carregar habilidades:', error)
            toast.error('Erro ao carregar habilidades')
        } finally {
            setLoading(false)
        }
    }

    const handlePageChange = (page) => {
        setCurrentPage(page)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.codigo.trim() || !formData.descricao.trim()) {
            toast.error('Preencha código e descrição')
            return
        }

        setSaving(true)
        try {
            if (editingId) {
                await coreAPI.habilidades.update(editingId, formData)
                toast.success('Habilidade atualizada!')
            } else {
                await coreAPI.habilidades.create(formData)
                toast.success('Habilidade criada!')
            }
            resetForm()
            loadHabilidades()
        } catch (error) {
            const msg = error.response?.data?.codigo?.[0] ||
                error.response?.data?.detail ||
                'Erro ao salvar habilidade'
            toast.error(msg)
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (hab) => {
        setEditingId(hab.id)
        setFormData({
            codigo: hab.codigo,
            descricao: hab.descricao,
            disciplinas: hab.disciplinas_detalhes?.map(d => d.id) || []
        })
        setShowForm(true)
    }

    const handleDelete = async (id) => {
        try {
            await coreAPI.habilidades.delete(id)
            toast.success('Habilidade removida!')
            loadHabilidades()
        } catch (error) {
            toast.error('Erro ao remover habilidade')
        }
    }

    const resetForm = () => {
        setFormData({ codigo: '', descricao: '', disciplinas: [] })
        setEditingId(null)
        setShowForm(false)
    }

    // Opções para o MultiCombobox
    const disciplinaOptions = disciplinas.map(d => ({
        value: d.id,
        label: d.nome,
        subLabel: d.sigla
    }))

    if (loading && habilidades.length === 0) return <Loading />

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                        Habilidades BNCC
                    </h2>
                    <p className="text-slate-500 text-sm">
                        Gerencie as habilidades da Base Nacional Comum Curricular
                    </p>
                </div>
                <Button onClick={() => setShowForm(true)} disabled={showForm}>
                    <HiPlus className="h-5 w-5 mr-1" />
                    Nova Habilidade
                </Button>
            </div>

            {/* Form */}
            {showForm && (
                <Card hover={false} className="border-2 border-primary-200 dark:border-primary-800">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center">
                                <HiAcademicCap className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                                {editingId ? 'Editar Habilidade' : 'Nova Habilidade'}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <Input
                                    label="Código *"
                                    placeholder="Ex: EM13LP01"
                                    value={formData.codigo}
                                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                                    autoComplete="off"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Descrição *
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="Descreva a habilidade..."
                                    value={formData.descricao}
                                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                    autoComplete="off"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 
                                               bg-white dark:bg-slate-800 text-slate-800 dark:text-white
                                               placeholder:text-slate-400 resize-none
                                               focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <MultiCombobox
                            label="Disciplinas vinculadas"
                            placeholder="Selecione as disciplinas..."
                            options={disciplinaOptions}
                            value={formData.disciplinas}
                            onChange={(newValues) => setFormData({ ...formData, disciplinas: newValues })}
                        />

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={resetForm}>
                                Cancelar
                            </Button>
                            <Button type="submit" loading={saving}>
                                {editingId ? 'Atualizar' : 'Adicionar'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Search */}
            <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Buscar por código ou descrição..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1) // Reset para página 1 ao buscar
                    }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 
                               bg-white dark:bg-slate-800 text-slate-800 dark:text-white
                               focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
            </div>

            {/* Lista */}
            {habilidades.length > 0 ? (
                <div className="space-y-2">
                    {habilidades.map((hab) => (
                        <div
                            key={hab.id}
                            className="flex items-start justify-between gap-4 p-4 rounded-xl 
                                       bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                                       hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="primary" className="shrink-0">{hab.codigo}</Badge>
                                    {hab.disciplinas_detalhes?.length > 0 && (
                                        <div className="flex gap-1 flex-wrap">
                                            {hab.disciplinas_detalhes.slice(0, 3).map(d => (
                                                <Badge key={d.id} variant="default" className="text-xs">
                                                    {d.sigla}
                                                </Badge>
                                            ))}
                                            {hab.disciplinas_detalhes.length > 3 && (
                                                <span className="text-xs text-slate-400">
                                                    +{hab.disciplinas_detalhes.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                                    {hab.descricao}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => handleEdit(hab)}
                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 
                                               text-slate-500 hover:text-primary-600 transition-colors"
                                    title="Editar"
                                >
                                    <HiPencil className="h-4 w-4" />
                                </button>
                                <PopConfirm onConfirm={() => handleDelete(hab.id)}>
                                    <button
                                        className="p-2 rounded-lg hover:bg-danger-500/10 text-danger-600 transition-colors"
                                        title="Remover"
                                    >
                                        <HiTrash className="h-4 w-4" />
                                    </button>
                                </PopConfirm>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <HiAcademicCap className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Nenhuma habilidade encontrada</p>
                    <p className="text-sm mt-1">
                        {searchTerm ? 'Tente outra busca' : 'Clique em "Nova Habilidade" para começar'}
                    </p>
                </div>
            )}

            {/* Paginação */}
            {habilidades.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalCount}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                />
            )}
        </div>
    )
}
