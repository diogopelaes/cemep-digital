import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Button, Input, Select, Loading, Badge } from '../components/ui'
import { HiArrowLeft, HiSave, HiPlus, HiTrash, HiAcademicCap } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

const AREAS_CONHECIMENTO = [
  { value: 'LINGUAGENS', label: 'Linguagens e suas Tecnologias' },
  { value: 'MATEMATICA', label: 'Matemática e suas Tecnologias' },
  { value: 'CIENCIAS_NATUREZA', label: 'Ciências da Natureza e suas Tecnologias' },
  { value: 'CIENCIAS_HUMANAS', label: 'Ciências Humanas e Sociais Aplicadas' },
  { value: 'TEC_INFORMATICA', label: 'Técnico em Informática' },
  { value: 'TEC_QUIMICA', label: 'Técnico em Química' },
  { value: 'TEC_ENFERMAGEM', label: 'Técnico em Enfermagem' },
]

export default function DisciplinaForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    sigla: '',
    area_conhecimento: '',
    descontinuada: false,
  })

  // Habilidades (apenas para edição)
  const [habilidades, setHabilidades] = useState([])
  const [loadingHabilidades, setLoadingHabilidades] = useState(false)
  const [novaHabilidade, setNovaHabilidade] = useState({ codigo: '', descricao: '' })
  const [savingHabilidade, setSavingHabilidade] = useState(false)

  useEffect(() => {
    if (isEditing) {
      loadDisciplina()
      loadHabilidades()
    }
  }, [id])

  const loadDisciplina = async () => {
    try {
      const response = await coreAPI.disciplinas.get(id)
      const disciplina = response.data
      setFormData({
        nome: disciplina.nome || '',
        sigla: disciplina.sigla || '',
        area_conhecimento: disciplina.area_conhecimento || '',
        descontinuada: disciplina.descontinuada || false,
      })
    } catch (error) {
      toast.error('Erro ao carregar disciplina')
      navigate('/disciplinas')
    }
    setLoading(false)
  }

  const loadHabilidades = async () => {
    setLoadingHabilidades(true)
    try {
      const response = await coreAPI.habilidades.list({ disciplina: id })
      setHabilidades(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao carregar habilidades')
    }
    setLoadingHabilidades(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nome.trim() || !formData.sigla.trim() || !formData.area_conhecimento) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setSaving(true)
    try {
      if (isEditing) {
        await coreAPI.disciplinas.update(id, formData)
        toast.success('Disciplina atualizada com sucesso!')
        navigate('/disciplinas')
      } else {
        const response = await coreAPI.disciplinas.create(formData)
        toast.success('Disciplina criada! Agora adicione as habilidades.')
        // Redireciona para edição para adicionar habilidades
        navigate(`/disciplinas/${response.data.id}/editar`, { replace: true })
      }
    } catch (error) {
      const msg = error.response?.data?.detail ||
        error.response?.data?.nome?.[0] ||
        error.response?.data?.sigla?.[0] ||
        'Erro ao salvar disciplina'
      toast.error(msg)
    }
    setSaving(false)
  }

  const handleAddHabilidade = async (e) => {
    e.preventDefault()

    if (!novaHabilidade.codigo.trim() || !novaHabilidade.descricao.trim()) {
      toast.error('Preencha código e descrição')
      return
    }

    setSavingHabilidade(true)
    try {
      await coreAPI.habilidades.create({
        ...novaHabilidade,
        disciplina_id: id
      })
      toast.success('Habilidade adicionada!')
      setNovaHabilidade({ codigo: '', descricao: '' })
      loadHabilidades()
    } catch (error) {
      const msg = error.response?.data?.codigo?.[0] || 'Erro ao adicionar habilidade'
      toast.error(msg)
    }
    setSavingHabilidade(false)
  }

  const handleDeleteHabilidade = async (habId) => {
    try {
      await coreAPI.habilidades.delete(habId)
      toast.success('Habilidade removida!')
      loadHabilidades()
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
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/disciplinas')}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <HiArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            {isEditing ? 'Editar Disciplina' : 'Nova Disciplina'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isEditing ? 'Atualize os dados da disciplina' : 'Preencha os dados para criar uma nova disciplina'}
          </p>
        </div>
      </div>

      {/* Formulário Principal */}
      <Card hover={false}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nome da Disciplina *"
                placeholder="Ex: Matemática"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                autoComplete="off"
                required
              />
            </div>
            <div>
              <Input
                label="Sigla *"
                placeholder="Ex: MAT"
                value={formData.sigla}
                onChange={(e) => setFormData({ ...formData, sigla: e.target.value.toUpperCase() })}
                maxLength={10}
                autoComplete="off"
                required
              />
            </div>
          </div>

          <Select
            label="Área de Conhecimento *"
            value={formData.area_conhecimento}
            onChange={(e) => setFormData({ ...formData, area_conhecimento: e.target.value })}
            placeholder="Selecione a área..."
            options={AREAS_CONHECIMENTO}
          />

          {/* Switch Descontinuada */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Disciplina Descontinuada
              </span>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Marque se esta disciplina não está mais em uso
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, descontinuada: !formData.descontinuada })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.descontinuada
                  ? 'bg-amber-500'
                  : 'bg-slate-300 dark:bg-slate-600'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.descontinuada ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="secondary" onClick={() => navigate('/disciplinas')}>
              Cancelar
            </Button>
            <Button type="submit" icon={HiSave} loading={saving}>
              {isEditing ? 'Salvar Alterações' : 'Criar Disciplina'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Habilidades - Apenas na edição */}
      {isEditing && (
        <Card hover={false}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center">
              <HiAcademicCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                Habilidades BNCC
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Gerencie as habilidades vinculadas a esta disciplina
              </p>
            </div>
          </div>

          {/* Formulário Nova Habilidade */}
          <form onSubmit={handleAddHabilidade} className="flex gap-3 mb-6">
            <div className="w-36">
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
            <Button type="submit" loading={savingHabilidade}>
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
                  className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-start gap-3">
                    <Badge variant="primary">{hab.codigo}</Badge>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {hab.descricao}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteHabilidade(hab.id)}
                    className="p-2 rounded-lg hover:bg-danger-500/10 text-danger-600 transition-colors"
                    title="Remover habilidade"
                  >
                    <HiTrash className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <HiAcademicCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma habilidade cadastrada</p>
              <p className="text-sm">Adicione habilidades BNCC usando o formulário acima</p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

