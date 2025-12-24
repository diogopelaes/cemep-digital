import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Card, Button, Input, DateInput, Select, Loading
} from '../components/ui'
import { HiArrowLeft, HiRefresh, HiSave, HiEye, HiEyeOff, HiSearch } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import { generatePassword } from '../utils/password'
import { validateCPF } from '../utils/validators'
import toast from 'react-hot-toast'

// Máscara de telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
const formatTelefone = (value) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11)

  if (numbers.length <= 2) {
    return numbers.length ? `(${numbers}` : ''
  }
  if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  }
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
}

// Máscara de CPF: XXX.XXX.XXX-XX
const formatCPF = (value) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11)

  if (numbers.length <= 3) return numbers
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
}

// Máscara de CEP: XX.XXX-XXX
const formatCEP = (value) => {
  const numbers = value.replace(/\D/g, '').slice(0, 8)

  if (numbers.length <= 2) return numbers
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}-${numbers.slice(5)}`
}

const ESTADOS = [
  { value: 'SP', label: 'São Paulo' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'PR', label: 'Paraná' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'GO', label: 'Goiás' },
  { value: 'DF', label: 'Distrito Federal' },
]

const TIPOS_USUARIO = [
  { value: 'GESTAO', label: 'Gestão' },
  { value: 'SECRETARIA', label: 'Secretaria' },
  { value: 'PROFESSOR', label: 'Professor' },
  { value: 'MONITOR', label: 'Monitor' },
]

// Função para obter a data atual no formato YYYY-MM-DD
const getDataAtual = () => {
  const hoje = new Date()
  return hoje.toISOString().split('T')[0]
}

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
    data_entrada: getDataAtual(),
    data_admissao: getDataAtual(),
    matricula: '',
    area_atuacao: '',
    apelido: '',

    // Novos campos
    cpf: '',
    cin: '',
    nome_social: '',
    data_nascimento: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
  })

  const [cepLoading, setCepLoading] = useState(false)
  const [cpfError, setCpfError] = useState('')

  // Efeito para validar CPF em tempo real
  useEffect(() => {
    if (formData.cpf && formData.cpf.length === 14) {
      const isValid = validateCPF(formData.cpf)
      setCpfError(isValid ? '' : 'CPF Inválido')
    } else {
      setCpfError('')
    }
  }, [formData.cpf])

  const fetchCep = async (cleanCep) => {
    if (cleanCep.length !== 8) return

    setCepLoading(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await response.json()

      if (data.erro) {
        toast.error('CEP não encontrado')
        // Limpa campos se CEP inválido
        setFormData(prev => ({
          ...prev,
          logradouro: '',
          bairro: '',
          cidade: '',
          estado: ''
        }))
        return
      }

      setFormData(prev => ({
        ...prev,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
        complemento: data.complemento || prev.complemento
      }))
      toast.success('Endereço encontrado!')
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
      toast.error('Erro ao buscar o CEP')
    } finally {
      setCepLoading(false)
    }
  }

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
    // Auto-gerar username com o número de matrícula (apenas para novo)
    if (!isEditing && formData.matricula) {
      setFormData(prev => ({
        ...prev,
        username: formData.matricula
      }))
    }
  }, [formData.matricula, isEditing])

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
        matricula: func.matricula?.toString() || '',
        area_atuacao: func.area_atuacao || '',
        apelido: func.apelido || '',
        data_entrada: func.data_entrada || '',
        // Novos campos
        cpf: func.cpf ? formatCPF(func.cpf) : '',
        cin: func.cin || '',
        nome_social: func.nome_social || '',
        data_nascimento: func.data_nascimento || '',
        logradouro: func.logradouro || '',
        numero: func.numero || '',
        complemento: func.complemento || '',
        bairro: func.bairro || '',
        cidade: func.cidade || 'Paulínia',
        estado: func.estado || 'SP',
        cep: func.cep ? formatCEP(func.cep) : '',
        data_admissao: func.data_admissao || '',
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

    if (!formData.nome.trim() || !formData.matricula) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    const matriculaNum = parseInt(formData.matricula)
    if (isNaN(matriculaNum) || matriculaNum <= 0) {
      toast.error('Número de matrícula inválido')
      return
    }

    if (!isEditing && (!formData.username.trim() || !formData.password)) {
      toast.error('Usuário e senha são obrigatórios')
      return
    }

    setSaving(true)
    try {
      if (isEditing) {
        // Atualizar funcionário, usuário e período de trabalho em uma única transação atômica
        await coreAPI.funcionarios.atualizarCompleto(id, {
          nome: formData.nome,
          email: formData.email || '',
          telefone: formData.telefone || '',
          tipo_usuario: formData.tipo_usuario,
          matricula: matriculaNum,
          area_atuacao: formData.area_atuacao || null,
          apelido: formData.apelido || null,
          data_entrada: formData.data_entrada,

          // Novos campos
          cpf: formData.cpf.replace(/\D/g, ''),
          cin: formData.cin,
          nome_social: formData.nome_social,
          data_nascimento: formData.data_nascimento,
          logradouro: formData.logradouro,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado,
          cep: formData.cep.replace(/\D/g, ''),
          data_admissao: formData.data_admissao || null,
        })
        toast.success('Funcionário atualizado com sucesso!')
        navigate('/funcionarios')
      } else {
        // Criar usuário e funcionário em uma única transação atômica
        const response = await coreAPI.funcionarios.criarCompleto({
          username: formData.username,
          password: formData.password,
          email: formData.email || '',
          nome: formData.nome,
          telefone: formData.telefone || '',
          tipo_usuario: formData.tipo_usuario,
          matricula: matriculaNum,
          area_atuacao: formData.area_atuacao || null,
          apelido: formData.apelido || null,
          data_entrada: formData.data_entrada,

          // Novos campos
          cpf: formData.cpf.replace(/\D/g, ''),
          cin: formData.cin,
          nome_social: formData.nome_social,
          data_nascimento: formData.data_nascimento,
          logradouro: formData.logradouro,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado,
          cep: formData.cep.replace(/\D/g, ''),
          data_admissao: formData.data_admissao || null,
        })

        // Redirecionar para página de credenciais
        navigate('/funcionarios/credenciais', {
          state: {
            funcionario: {
              id: response.data.id,
              nome: formData.nome,
              matricula: formData.matricula,
              username: formData.username,
              email: formData.email,
              password: formData.password,
              area_atuacao: formData.area_atuacao || null,
              tipo_usuario: formData.tipo_usuario,
              data_entrada: formData.data_entrada,
            }
          }
        })
      }
    } catch (error) {
      console.error('Erro completo:', error.response?.data)
      const data = error.response?.data
      const msg = data?.detail ||
        data?.username?.[0] ||
        data?.email?.[0] ||
        data?.password?.[0] ||
        data?.matricula?.[0] ||
        data?.usuario?.[0] ||
        data?.area_atuacao?.[0] ||
        (typeof data === 'object' ? Object.values(data).flat()[0] : null) ||
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Nome Completo *"
                  placeholder="João da Silva"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  autoComplete="off"
                  required
                />
              </div>
              <Input
                label="Nome Social"
                placeholder="Opcional"
                value={formData.nome_social}
                onChange={(e) => setFormData({ ...formData, nome_social: e.target.value })}
                autoComplete="off"
              />
              <Input
                label="CPF"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                onKeyDown={(e) => {
                  const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                  if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                    e.preventDefault()
                  }
                }}
                maxLength={14}
                autoComplete="off"
                error={cpfError}
              />
              <Input
                label="CIN"
                placeholder="Número do CIN"
                value={formData.cin}
                onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                autoComplete="off"
              />
              <DateInput
                label="Data de Nascimento"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })}
                inputMode="tel"
                maxLength={15}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Endereço */}
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
              Endereço
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CEP + Botão */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative min-w-[140px]">
                  <Input
                    label="CEP"
                    placeholder="00.000-000"
                    value={formData.cep}
                    onChange={(e) => {
                      const val = formatCEP(e.target.value)
                      setFormData({ ...formData, cep: val })
                    }}
                    maxLength={10}
                    autoComplete="off"
                  />
                  {cepLoading && (
                    <div className="absolute right-3 top-[38px]">
                      <Loading size="sm" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const cleanCep = formData.cep.replace(/\D/g, '')
                    if (cleanCep.length === 8) {
                      fetchCep(cleanCep)
                    } else {
                      toast.error('CEP deve ter 8 dígitos')
                    }
                  }}
                  disabled={cepLoading}
                  className="p-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Buscar CEP"
                >
                  <HiSearch className="h-5 w-5" />
                </button>
              </div>

              {/* Quebra de linha para separar CEP dos outros campos */}
              <div className="col-span-1 md:col-span-2 lg:col-span-4 h-0" />

              {/* Logradouro - mais largo */}
              <div className="lg:col-span-2">
                <Input
                  label="Logradouro"
                  placeholder="Rua, Avenida..."
                  value={formData.logradouro}
                  onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                  autoComplete="off"
                />
              </div>

              {/* Número - pequeno */}
              <Input
                label="Número"
                placeholder="123"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                autoComplete="off"
              />

              {/* Complemento */}
              <Input
                label="Complemento"
                placeholder="Apto 101"
                value={formData.complemento}
                onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                autoComplete="off"
              />

              {/* Bairro - mais largo */}
              <div className="lg:col-span-2">
                <Input
                  label="Bairro"
                  placeholder="Centro"
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  autoComplete="off"
                />
              </div>

              {/* Cidade */}
              <Input
                label="Cidade"
                placeholder="Paulínia"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                autoComplete="off"
              />

              {/* Estado - pequeno */}
              <Select
                label="Estado"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                options={ESTADOS}
              />
            </div>
          </div>

          {/* Dados Profissionais */}
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
              Dados Profissionais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Nº Matrícula *"
                type="text"
                placeholder="123456"
                value={formData.matricula}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '') // Remove tudo que não é dígito
                  if (val.length <= 6) {
                    setFormData({ ...formData, matricula: val })
                  }
                }}
                onKeyDown={(e) => {
                  // Permite apenas: números, backspace, delete, tab, arrows, home, end
                  const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                  if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                    e.preventDefault()
                  }
                }}
                onPaste={(e) => {
                  // Ao colar, filtra apenas números
                  e.preventDefault()
                  const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                  setFormData({ ...formData, matricula: paste })
                }}
                inputMode="numeric"
                maxLength={6}
                autoComplete="off"
                required
              />
              <Select
                label="Tipo de Usuário *"
                value={formData.tipo_usuario}
                onChange={(e) => setFormData({ ...formData, tipo_usuario: e.target.value })}
                options={TIPOS_USUARIO}
              />
              <Input
                label="Área de Atuação"
                placeholder="Matemática"
                value={formData.area_atuacao}
                onChange={(e) => setFormData({ ...formData, area_atuacao: e.target.value })}
                autoComplete="off"
              />
              <DateInput
                label="Início na escola*"
                value={formData.data_entrada}
                onChange={(e) => setFormData({ ...formData, data_entrada: e.target.value })}
                required
              />
              <DateInput
                label="Data de Admissão"
                value={formData.data_admissao}
                onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
              />
            </div>
          </div>

          {/* Credenciais de Acesso do Funcionário */}
          {!isEditing && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                  Credenciais de Acesso
                </h2>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  Do funcionário
                </span>
              </div>

              {/* Campos ocultos para confundir o autocomplete do navegador */}
              <input type="text" name="fakeuser" autoComplete="username" style={{ display: 'none' }} />
              <input type="password" name="fakepass" autoComplete="current-password" style={{ display: 'none' }} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Login do Funcionário *</label>
                  <input
                    type="text"
                    name="func_login"
                    placeholder="123456"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '.') })}
                    className="input"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-form-type="other"
                    data-lpignore="true"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Preenchido automaticamente com o nº de matrícula
                  </p>
                </div>
                <div>
                  <label className="label">Senha do Funcionário *</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="func_senha"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input pr-10"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        data-form-type="other"
                        data-lpignore="true"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
                    Gerada automaticamente. Clique em <HiRefresh className="inline h-3 w-3" /> para outra.
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

