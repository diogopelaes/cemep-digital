import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  Card, Button, Input, Select, Loading
} from '../components/ui'
import { HiArrowLeft, HiRefresh, HiSave, HiEye, HiEyeOff } from 'react-icons/hi'
import { coreAPI, usersAPI } from '../services/api'
import { generatePassword, generateUsername } from '../utils/password'
import toast from 'react-hot-toast'

const TIPOS_USUARIO = [
  { value: 'GESTAO', label: 'Gestão' },
  { value: 'SECRETARIA', label: 'Secretaria' },
  { value: 'PROFESSOR', label: 'Professor' },
  { value: 'MONITOR', label: 'Monitor' },
]

export default function FuncionarioForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [funcionario, setFuncionario] = useState(null)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    nome: '',
    telefone: '',
    tipo_usuario: 'PROFESSOR',
    funcao: '',
  })

  useEffect(() => {
    if (isEditing) {
      loadFuncionario()
    } else {
      // Gerar senha automática para novo funcionário
      setFormData(prev => ({
        ...prev,
        password: generatePassword()
      }))
    }
  }, [id])

  useEffect(() => {
    // Auto-gerar username quando nome muda (apenas para novo)
    if (!isEditing && formData.nome) {
      const partes = formData.nome.trim().split(' ')
      const primeiro = partes[0] || ''
      const ultimo = partes.length > 1 ? partes[partes.length - 1] : ''
      setFormData(prev => ({
        ...prev,
        username: generateUsername(primeiro, ultimo)
      }))
    }
  }, [formData.nome, isEditing])

  const loadFuncionario = async () => {
    try {
      const response = await coreAPI.funcionarios.get(id)
      const func = response.data
      setFuncionario(func)
      setFormData({
        username: func.usuario?.username || '',
        email: func.usuario?.email || '',
        password: '',
        nome: func.usuario?.first_name || '',
        telefone: func.usuario?.telefone || '',
        tipo_usuario: func.usuario?.tipo_usuario || 'PROFESSOR',
        funcao: func.funcao || '',
      })
    } catch (error) {
      toast.error('Erro ao carregar funcionário')
      navigate('/funcionarios')
    }
    setLoading(false)
  }

  const handleGeneratePassword = () => {
    setFormData(prev => ({
      ...prev,
      password: generatePassword()
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.nome.trim() || !formData.funcao.trim()) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    if (!isEditing && (!formData.username.trim() || !formData.password)) {
      toast.error('Usuário e senha são obrigatórios')
      return
    }

    setSaving(true)
    try {
      if (isEditing) {
        // Atualizar usuário
        await usersAPI.update(funcionario.usuario.id, {
          first_name: formData.nome,
          email: formData.email,
          telefone: formData.telefone,
        })
        // Atualizar funcionário
        await coreAPI.funcionarios.update(id, {
          funcao: formData.funcao,
        })
        toast.success('Funcionário atualizado com sucesso!')
        navigate('/funcionarios')
      } else {
        // Criar usuário
        const userRes = await usersAPI.create({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          password_confirm: formData.password,
          first_name: formData.nome,
          telefone: formData.telefone,
          tipo_usuario: formData.tipo_usuario,
        })
        // Criar funcionário
        await coreAPI.funcionarios.create({
          usuario: userRes.data.id,
          funcao: formData.funcao,
          ativo: true,
        })
        
        // Redirecionar para página de credenciais
        navigate('/funcionarios/credenciais', { 
          state: { 
            funcionario: {
              nome: formData.nome,
              username: formData.username,
              email: formData.email,
              password: formData.password,
              funcao: formData.funcao,
              tipo_usuario: formData.tipo_usuario,
            }
          }
        })
      }
    } catch (error) {
      console.error(error.response?.data)
      const msg = error.response?.data?.detail ||
                  error.response?.data?.username?.[0] ||
                  error.response?.data?.email?.[0] ||
                  error.response?.data?.password?.[0] ||
                  'Erro ao salvar funcionário'
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
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/funcionarios')}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <HiArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            {isEditing ? 'Editar Funcionário' : 'Novo Funcionário'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isEditing ? 'Atualize os dados do funcionário' : 'Preencha os dados para criar um novo funcionário'}
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card hover={false}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Pessoais */}
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
              Dados Pessoais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome Completo *"
                placeholder="João da Silva"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                autoComplete="off"
                required
              />
              <Input
                label="E-mail"
                type="email"
                placeholder="joao.silva@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                autoComplete="off"
              />
              <Input
                label="Telefone"
                placeholder="(19) 99999-9999"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Dados Profissionais */}
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
              Dados Profissionais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Tipo de Usuário *"
                value={formData.tipo_usuario}
                onChange={(e) => setFormData({ ...formData, tipo_usuario: e.target.value })}
                options={TIPOS_USUARIO}
                disabled={isEditing}
              />
              <Input
                label="Função/Cargo *"
                placeholder="Professor de Matemática"
                value={formData.funcao}
                onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                autoComplete="off"
                required
              />
            </div>
          </div>

          {/* Credenciais de Acesso */}
          {!isEditing && (
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                Credenciais de Acesso
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome de Usuário *"
                  placeholder="joao.silva"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '.') })}
                  autoComplete="off"
                  required
                />
                <div>
                  <label className="label">Senha *</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input pr-10"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Gerar nova senha"
                    >
                      <HiRefresh className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Senha gerada automaticamente. Clique no ícone para gerar outra.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="secondary" onClick={() => navigate('/funcionarios')}>
              Cancelar
            </Button>
            <Button type="submit" icon={HiSave} loading={saving}>
              {isEditing ? 'Salvar Alterações' : 'Criar Funcionário'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

