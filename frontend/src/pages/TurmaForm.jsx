import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { HiArrowLeft, HiSave, HiTrash } from 'react-icons/hi'
import { Button, Card, Input, Loading, Select, MultiCombobox, Modal, ModalFooter } from '../components/ui'
import { coreAPI } from '../services/api'
import { useReferences } from '../contexts/ReferenceContext'

const NOMENCLATURAS = [
  { value: 'SERIE', label: 'Série' },
  { value: 'ANO', label: 'Ano' },
  { value: 'MODULO', label: 'Módulo' },
  { value: 'SEMESTRE', label: 'Semestre' }
]

export default function TurmaForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const { cursos } = useReferences() // Cache global

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  // cursos state removido pois vem do context
  const [professores, setProfessores] = useState([])
  const [formData, setFormData] = useState({
    numero: '',
    letra: '',
    ano_letivo: new Date().getFullYear().toString(),
    nomenclatura: 'SERIE',
    curso_id: '',
    professores_representantes: [],
  })

  useEffect(() => {
    // loadCursos removido (ReferenceContext)
    loadProfessores()
    if (isEditing) {
      loadTurma()
    }

    // Auto-select curso if only one available
    if (cursos.length === 1 && !isEditing) {
      setFormData(prev => ({ ...prev, curso_id: cursos[0].id.toString() }))
    }
  }, [id, isEditing, cursos.length]) // Added dependencies

  const loadProfessores = async () => {
    try {
      const response = await coreAPI.funcionarios.list({ usuario__tipo_usuario: 'PROFESSOR', page_size: 100 })
      const professoresData = response.data.results || response.data
      setProfessores(professoresData)
    } catch (error) {
      console.error('Erro ao carregar professores')
    }
  }

  const loadTurma = async () => {
    try {
      const response = await coreAPI.turmas.get(id)
      const turma = response.data
      setFormData({
        numero: turma.numero?.toString() || '',
        letra: turma.letra || '',
        ano_letivo: turma.ano_letivo?.toString() || new Date().getFullYear().toString(),
        nomenclatura: turma.nomenclatura || 'SERIE',
        curso_id: turma.curso?.id?.toString() || '',
        professores_representantes: turma.professores_representantes || [],
      })
    } catch (error) {
      toast.error('Erro ao carregar turma')
      navigate('/turmas')
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validações
    // Validações
    const numero = parseInt(formData.numero)
    const anoLetivo = parseInt(formData.ano_letivo)
    const cursoId = formData.curso_id

    if (!numero || isNaN(numero)) {
      toast.error('Informe o número da turma')
      return
    }

    if (!formData.letra.trim()) {
      toast.error('Informe a letra da turma')
      return
    }

    if (!anoLetivo || isNaN(anoLetivo) || anoLetivo < 2020 || anoLetivo > 2099) {
      toast.error('Informe um ano letivo válido (ex: 2025)')
      return
    }

    if (!cursoId) {
      toast.error('Selecione um curso')
      return
    }

    const letra = formData.letra.toUpperCase().trim()

    setSaving(true)
    try {
      // Verifica se já existe turma com mesma combinação (apenas ao criar)
      if (!isEditing) {
        const existentes = await coreAPI.turmas.list({
          numero: numero,
          letra: letra,
          ano_letivo: anoLetivo,
          curso: cursoId,
        })
        const turmasExistentes = existentes.data.results || existentes.data

        if (turmasExistentes.length > 0) {
          const turmaExistente = turmasExistentes[0]
          setSaving(false)

          // Pergunta se quer editar a existente
          const confirmar = window.confirm(
            `Já existe a turma "${turmaExistente.nome}" para este curso e ano.\n\nDeseja abrir a turma existente?`
          )

          if (confirmar) {
            navigate(`/turmas/${turmaExistente.id}`)
          }
          return
        }
      }

      const payload = {
        numero: numero,
        letra: letra,
        ano_letivo: anoLetivo,
        nomenclatura: formData.nomenclatura,
        curso_id: cursoId,
        professores_representantes: formData.professores_representantes,
      }

      if (isEditing) {
        await coreAPI.turmas.update(id, payload)
        toast.success('Turma atualizada com sucesso!')
      } else {
        const response = await coreAPI.turmas.create(payload)
        toast.success('Turma criada com sucesso!')
        // Redireciona para a página de detalhes da turma criada
        navigate(`/turmas/${response.data.id}`)
        return
      }
      navigate('/turmas')
    } catch (error) {
      console.error('Erro ao salvar turma:', error.response?.data)
      const data = error.response?.data
      let msg = 'Erro ao salvar turma'

      if (data) {
        if (data.detail) {
          msg = data.detail
        } else if (data.non_field_errors) {
          // Traduz mensagem comum de unicidade
          const errorMsg = data.non_field_errors[0]
          if (errorMsg.includes('unique') || errorMsg.includes('already exists') || errorMsg.includes('must make a unique set')) {
            msg = 'Já existe uma turma com este número, letra, ano e curso.'
          } else {
            msg = errorMsg
          }
        } else if (data.numero) {
          msg = `Número: ${data.numero[0]}`
        } else if (data.letra) {
          msg = `Letra: ${data.letra[0]}`
        } else if (data.ano_letivo) {
          msg = `Ano Letivo: ${data.ano_letivo[0]}`
        } else if (data.curso_id) {
          msg = `Curso: ${data.curso_id[0]}`
        } else if (typeof data === 'object') {
          const firstKey = Object.keys(data)[0]
          const firstError = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey]
          if (firstError) msg = firstError
        }
      }
      toast.error(msg)
    }
    setSaving(false)
  }

  const handleDelete = () => {
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    setSaving(true)
    try {
      await coreAPI.turmas.delete(id)
      toast.success('Turma excluída com sucesso!')
      navigate('/turmas')
    } catch (error) {
      const msg = error.response?.data?.detail || 'Erro ao excluir turma. Verifique se não há alunos ou disciplinas vinculadas.'
      toast.error(msg)
      setShowDeleteModal(false)
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
          onClick={() => navigate('/turmas')}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <HiArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            {isEditing ? 'Editar Turma' : 'Nova Turma'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isEditing ? 'Atualize os dados da turma' : 'Preencha os dados para criar uma nova turma'}
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card hover={false}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Número *"
              type="text"
              placeholder="1"
              maxLength={1}
              value={formData.numero}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 9)) {
                  setFormData({ ...formData, numero: val })
                }
              }}
              onKeyDown={(e) => {
                const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                if (!allowed.includes(e.key) && !/^[1-9]$/.test(e.key)) {
                  e.preventDefault()
                }
              }}
              onPaste={(e) => {
                e.preventDefault()
                const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 1)
                if (paste && parseInt(paste) >= 1 && parseInt(paste) <= 99) {
                  setFormData({ ...formData, numero: paste })
                }
              }}
              inputMode="numeric"
              autoComplete="off"
              required
            />
            <Input
              label="Letra *"
              placeholder="A"
              maxLength={1}
              value={formData.letra}
              onChange={(e) => setFormData({ ...formData, letra: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Nomenclatura *"
              value={formData.nomenclatura}
              onChange={(e) => setFormData({ ...formData, nomenclatura: e.target.value })}
              options={NOMENCLATURAS}
            />
            <Input
              label="Ano Letivo *"
              type="text"
              placeholder={new Date().getFullYear().toString()}
              maxLength={4}
              value={formData.ano_letivo}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                setFormData({ ...formData, ano_letivo: val })
              }}
              onKeyDown={(e) => {
                const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                  e.preventDefault()
                }
              }}
              onPaste={(e) => {
                e.preventDefault()
                const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
                setFormData({ ...formData, ano_letivo: paste })
              }}
              inputMode="numeric"
              autoComplete="off"
              required
            />
          </div>

          <Select
            label="Curso *"
            value={formData.curso_id}
            onChange={(e) => setFormData({ ...formData, curso_id: e.target.value })}
            placeholder="Selecione um curso..."
            options={cursos.map(c => ({ value: c.id, label: `${c.nome} (${c.sigla})` }))}
          />

          <MultiCombobox
            label="Professores Representantes"
            value={formData.professores_representantes}
            onChange={(val) => setFormData({ ...formData, professores_representantes: val })}
            options={professores.map(p => ({
              value: p.id,
              label: p.nome_completo,
              subLabel: p.apelido
            }))}
            placeholder="Pesquise por nome ou apelido..."
          />

          {/* Preview */}
          {formData.numero && formData.letra && formData.curso_id && formData.ano_letivo.length === 4 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Prévia da turma:</p>
              <p className="text-lg font-semibold text-slate-800 dark:text-white">
                {formData.numero}º {NOMENCLATURAS.find(n => n.value === formData.nomenclatura)?.label} {formData.letra} - {cursos.find(c => String(c.id) === String(formData.curso_id))?.sigla || '?'} ({formData.ano_letivo})
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
            {isEditing ? (
              <Button
                type="button"
                variant="danger"
                icon={HiTrash}
                onClick={handleDelete}
              >
                Excluir Turma
              </Button>
            ) : (
              <div></div> // Spacer
            )}
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => navigate('/turmas')}>
                Cancelar
              </Button>
              <Button type="submit" icon={HiSave} loading={saving}>
                {isEditing ? 'Salvar Alterações' : 'Criar Turma'}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Excluir Turma"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <HiTrash className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-300">
              Tem certeza que deseja excluir esta turma?
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Esta ação não pode ser desfeita e removerá permanentemente o vínculo com alunos e disciplinas.
            </p>
          </div>
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            loading={saving}
          >
            Confirmar Exclusão
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

