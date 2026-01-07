import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Input, Loading, Switch, FormActions } from '../components/ui'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function CursoForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    sigla: '',
    is_active: true,
  })

  useEffect(() => {
    if (isEditing) {
      loadCurso()
    }
  }, [id])

  const loadCurso = async () => {
    try {
      const response = await coreAPI.cursos.get(id)
      const curso = response.data
      setFormData({
        nome: curso.nome || '',
        sigla: curso.sigla || '',
        is_active: curso.is_active ?? true,
      })
    } catch (error) {
      toast.error('Erro ao carregar curso')
      navigate('/cursos')
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nome.trim() || !formData.sigla.trim()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setSaving(true)
    try {
      if (isEditing) {
        await coreAPI.cursos.update(id, formData)
        toast.success('Curso atualizado com sucesso!')
      } else {
        await coreAPI.cursos.create(formData)
        toast.success('Curso criado com sucesso!')
      }
      navigate('/cursos')
    } catch (error) {
      const msg = error.response?.data?.detail ||
        error.response?.data?.nome?.[0] ||
        error.response?.data?.sigla?.[0] ||
        'Erro ao salvar curso'
      toast.error(msg)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">

        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            {isEditing ? 'Editar Curso' : 'Novo Curso'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isEditing ? 'Atualize os dados do curso' : 'Preencha os dados para criar um novo curso'}
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card hover={false}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nome do Curso *"
                placeholder="Ex: Técnico em Informática"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                autoComplete="off"
                required
              />
            </div>
            <div>
              <Input
                label="Sigla *"
                placeholder="Ex: TI"
                value={formData.sigla}
                onChange={(e) => setFormData({ ...formData, sigla: e.target.value.toUpperCase() })}
                maxLength={10}
                autoComplete="off"
                required
              />
            </div>
          </div>

          {/* Switch Ativa */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Curso Ativo
              </span>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Desative para impedir novos cadastros neste curso
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              labelTrue="Ativo"
              labelFalse="Inativo"
            />
          </div>

          {/* Botões */}
          <FormActions
            cancelTo="/cursos"
            saving={saving}
            isEditing={isEditing}
            entityName="Curso"
          />
        </form>
      </Card>
    </div>
  )
}

