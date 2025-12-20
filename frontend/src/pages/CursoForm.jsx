import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Button, Input, Loading } from '../components/ui'
import { HiArrowLeft, HiSave } from 'react-icons/hi'
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
        <button
          onClick={() => navigate('/cursos')}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <HiArrowLeft className="h-6 w-6" />
        </button>
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

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="secondary" onClick={() => navigate('/cursos')}>
              Cancelar
            </Button>
            <Button type="submit" icon={HiSave} loading={saving}>
              {isEditing ? 'Salvar Alterações' : 'Criar Curso'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

