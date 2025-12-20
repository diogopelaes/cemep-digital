import { useState, useEffect } from 'react'
import { 
  Card, Button, Input, Table, TableHead, TableBody, TableRow, 
  TableHeader, TableCell, TableEmpty, Loading, Badge
} from '../components/ui'
import { HiPlus, HiPencil, HiTrash, HiBookOpen, HiAcademicCap, HiX, HiCheck, HiChevronDown, HiChevronUp } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function Disciplinas() {
  const [loading, setLoading] = useState(true)
  const [disciplinas, setDisciplinas] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [formData, setFormData] = useState({ nome: '', sigla: '' })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Habilidades
  const [expandedDisciplina, setExpandedDisciplina] = useState(null)
  const [habilidades, setHabilidades] = useState([])
  const [loadingHabilidades, setLoadingHabilidades] = useState(false)
  const [novaHabilidade, setNovaHabilidade] = useState({ codigo: '', descricao: '' })
  const [editandoHabilidade, setEditandoHabilidade] = useState(null)

  useEffect(() => {
    loadDisciplinas()
  }, [])

  const loadDisciplinas = async () => {
    try {
      const response = await coreAPI.disciplinas.list()
      setDisciplinas(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao carregar disciplinas')
    }
    setLoading(false)
  }

  const handleShowForm = () => {
    setShowForm(true)
    setEditandoId(null)
    setFormData({ nome: '', sigla: '' })
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditandoId(null)
    setFormData({ nome: '', sigla: '' })
  }

  const handleEdit = (disciplina) => {
    setEditandoId(disciplina.id)
    setFormData({ nome: disciplina.nome, sigla: disciplina.sigla })
    setShowForm(false)
  }

  const handleCancelEdit = () => {
    setEditandoId(null)
    setFormData({ nome: '', sigla: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.nome.trim() || !formData.sigla.trim()) {
      toast.error('Preencha todos os campos')
      return
    }

    setSaving(true)
    try {
      if (editandoId) {
        await coreAPI.disciplinas.update(editandoId, formData)
        toast.success('Disciplina atualizada com sucesso!')
        setEditandoId(null)
      } else {
        await coreAPI.disciplinas.create(formData)
        toast.success('Disciplina criada com sucesso!')
        setShowForm(false)
      }
      setFormData({ nome: '', sigla: '' })
      loadDisciplinas()
    } catch (error) {
      const msg = error.response?.data?.detail || 
                  error.response?.data?.nome?.[0] ||
                  error.response?.data?.sigla?.[0] ||
                  'Erro ao salvar disciplina'
      toast.error(msg)
    }
    setSaving(false)
  }

  const handleDelete = async (disciplina) => {
    try {
      await coreAPI.disciplinas.delete(disciplina.id)
      toast.success('Disciplina excluída com sucesso!')
      setConfirmDelete(null)
      loadDisciplinas()
    } catch (error) {
      const msg = error.response?.data?.detail || 'Erro ao excluir disciplina'
      toast.error(msg)
    }
  }

  // Habilidades
  const toggleHabilidades = async (disciplina) => {
    if (expandedDisciplina === disciplina.id) {
      setExpandedDisciplina(null)
      setHabilidades([])
      return
    }
    
    setExpandedDisciplina(disciplina.id)
    setLoadingHabilidades(true)
    try {
      const response = await coreAPI.habilidades.list({ disciplina: disciplina.id })
      setHabilidades(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao carregar habilidades')
    }
    setLoadingHabilidades(false)
  }

  const handleAddHabilidade = async (e) => {
    e.preventDefault()
    
    if (!novaHabilidade.codigo.trim() || !novaHabilidade.descricao.trim()) {
      toast.error('Preencha código e descrição')
      return
    }

    try {
      await coreAPI.habilidades.create({
        ...novaHabilidade,
        disciplina_id: expandedDisciplina
      })
      toast.success('Habilidade adicionada!')
      setNovaHabilidade({ codigo: '', descricao: '' })
      const response = await coreAPI.habilidades.list({ disciplina: expandedDisciplina })
      setHabilidades(response.data.results || response.data)
    } catch (error) {
      const msg = error.response?.data?.codigo?.[0] || 'Erro ao adicionar habilidade'
      toast.error(msg)
    }
  }

  const handleDeleteHabilidade = async (id) => {
    try {
      await coreAPI.habilidades.delete(id)
      toast.success('Habilidade removida!')
      const response = await coreAPI.habilidades.list({ disciplina: expandedDisciplina })
      setHabilidades(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao remover habilidade')
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            Disciplinas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie as disciplinas e suas habilidades (BNCC)
          </p>
        </div>
        {!showForm && (
          <Button icon={HiPlus} onClick={handleShowForm}>
            Nova Disciplina
          </Button>
        )}
      </div>

      {/* Formulário de Criação Inline */}
      {showForm && (
        <Card hover={false}>
          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
              Nova Disciplina
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Nome da Disciplina"
                  placeholder="Ex: Matemática"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <Input
                  label="Sigla"
                  placeholder="Ex: MAT"
                  value={formData.sigla}
                  onChange={(e) => setFormData({ ...formData, sigla: e.target.value.toUpperCase() })}
                  maxLength={10}
                  autoComplete="off"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="secondary" onClick={handleCancelForm}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Criar Disciplina
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de Disciplinas */}
      <div className="space-y-3">
        {disciplinas.length > 0 ? (
          disciplinas.map((disciplina) => (
            <Card key={disciplina.id} hover={false} className="overflow-hidden">
              {/* Linha da Disciplina */}
              <div className="flex items-center justify-between">
                {editandoId === disciplina.id ? (
                  // Modo Edição
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Nome da disciplina"
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={formData.sigla}
                        onChange={(e) => setFormData({ ...formData, sigla: e.target.value.toUpperCase() })}
                        placeholder="Sigla"
                        maxLength={10}
                        autoComplete="off"
                      />
                      <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="p-3 rounded-xl bg-success-500/10 hover:bg-success-500/20 text-success-600 transition-colors"
                        title="Salvar"
                      >
                        <HiCheck className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Cancelar"
                      >
                        <HiX className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : confirmDelete?.id === disciplina.id ? (
                  // Modo Confirmação de Exclusão
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-danger-600 dark:text-danger-400 font-medium">
                      Confirma exclusão de "{disciplina.nome}"?
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(disciplina)}
                        className="p-2 rounded-lg bg-danger-500/10 hover:bg-danger-500/20 text-danger-600 transition-colors"
                        title="Confirmar exclusão"
                      >
                        <HiCheck className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Cancelar"
                      >
                        <HiX className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // Modo Normal
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center">
                        <HiBookOpen className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-white">
                          {disciplina.nome}
                        </h3>
                        <span className="text-sm text-slate-500 font-mono">
                          {disciplina.sigla}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleHabilidades(disciplina)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/10 text-primary-600 hover:bg-primary-500/20 transition-colors"
                      >
                        <HiAcademicCap className="h-5 w-5" />
                        Habilidades
                        {expandedDisciplina === disciplina.id ? (
                          <HiChevronUp className="h-4 w-4" />
                        ) : (
                          <HiChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(disciplina)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-primary-600 transition-colors"
                        title="Editar"
                      >
                        <HiPencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(disciplina)}
                        className="p-2 rounded-lg hover:bg-danger-500/10 text-danger-600 transition-colors"
                        title="Excluir"
                      >
                        <HiTrash className="h-5 w-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Seção de Habilidades Expandida */}
              {expandedDisciplina === disciplina.id && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-4">
                    Habilidades BNCC
                  </h4>

                  {/* Formulário Nova Habilidade */}
                  <form onSubmit={handleAddHabilidade} className="flex gap-3 mb-4">
                    <div className="w-32">
                      <Input
                        placeholder="Código"
                        value={novaHabilidade.codigo}
                        onChange={(e) => setNovaHabilidade({ ...novaHabilidade, codigo: e.target.value.toUpperCase() })}
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Descrição da habilidade"
                        value={novaHabilidade.descricao}
                        onChange={(e) => setNovaHabilidade({ ...novaHabilidade, descricao: e.target.value })}
                        autoComplete="off"
                      />
                    </div>
                    <Button type="submit" size="sm">
                      <HiPlus className="h-5 w-5" />
                    </Button>
                  </form>

                  {/* Lista de Habilidades */}
                  {loadingHabilidades ? (
                    <div className="flex justify-center py-8">
                      <Loading size="md" />
                    </div>
                  ) : habilidades.length > 0 ? (
                    <div className="space-y-2">
                      {habilidades.map((hab) => (
                        <div 
                          key={hab.id}
                          className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                        >
                          <div className="flex items-start gap-3">
                            <Badge variant="primary">{hab.codigo}</Badge>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {hab.descricao}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteHabilidade(hab.id)}
                            className="p-1.5 rounded-lg hover:bg-danger-500/10 text-danger-600 transition-colors"
                          >
                            <HiTrash className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-6">
                      Nenhuma habilidade cadastrada para esta disciplina
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))
        ) : (
          <Card hover={false}>
            <p className="text-center text-slate-500 py-8">
              Nenhuma disciplina cadastrada
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
