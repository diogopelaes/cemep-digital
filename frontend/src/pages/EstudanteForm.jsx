import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    Card, Button, Input, DateInput, Select, Loading, ImageCropper, Combobox
} from '../components/ui'
import { HiArrowLeft, HiRefresh, HiSave, HiEye, HiEyeOff, HiCamera, HiSearch } from 'react-icons/hi'
import { academicAPI, coreAPI } from '../services/api'
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

// Máscara de Matrícula: XXX.XXX.XXX-X (10 dígitos)
const formatMatricula = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 10)

    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
}

// Opções de status da matrícula
const STATUS_MATRICULA = [
    { value: 'MATRICULADO', label: 'Matriculado' },
    { value: 'CONCLUIDO', label: 'Concluído' },
    { value: 'ABANDONO', label: 'Abandono' },
    { value: 'TRANSFERIDO', label: 'Transferido' },
    { value: 'OUTRO', label: 'Outro' },
]

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

export default function EstudanteForm() {
    const navigate = useNavigate()
    const { cpf: cpfParam } = useParams()
    const isEditing = !!cpfParam

    const [loading, setLoading] = useState(isEditing)
    const [saving, setSaving] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [fotoBlob, setFotoBlob] = useState(null)     // Foto recortada (blob)
    const [fotoPreview, setFotoPreview] = useState(null) // URL da foto atual
    const [cursos, setCursos] = useState([])

    const [formData, setFormData] = useState({
        // Dados do usuário
        username: '',
        email: '',
        password: '',
        first_name: '',

        // Dados do estudante
        cpf: '',
        cin: '',
        nome_social: '',
        data_nascimento: '',
        telefone: '',

        // Benefícios e Transporte
        bolsa_familia: false,
        pe_de_meia: true,
        usa_onibus: true,
        linha_onibus: '',
        permissao_sair_sozinho: false,

        // Endereço
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
    })

    useEffect(() => {
        if (isEditing) {
            loadEstudante()
        } else {
            // Gerar senha automática para novo estudante
            setFormData(prev => ({
                ...prev,
                password: generatePassword()
            }))
        }
    }, [cpfParam])

    // Estado para responsáveis (array de objetos)
    const [responsaveis, setResponsaveis] = useState([
        { nome: '', cpf: '', telefone: '', email: '', parentesco: '' }
    ])

    // Estado para matrículas (array de objetos)
    const [matriculas, setMatriculas] = useState([
        { numero_matricula: '', curso_id: '', data_entrada: new Date().toISOString().split('T')[0], data_saida: '', status: 'MATRICULADO' }
    ])

    // Carregar cursos
    useEffect(() => {
        loadCursos()
    }, [])

    const loadCursos = async () => {
        try {
            const response = await coreAPI.cursos.list()
            const cursosData = response.data.results || response.data
            setCursos(cursosData)
        } catch (error) {
            console.error('Erro ao carregar cursos:', error)
        }
    }

    const addMatricula = () => {
        setMatriculas([...matriculas, {
            numero_matricula: '',
            curso_id: '',
            data_entrada: new Date().toISOString().split('T')[0],
            data_saida: '',
            status: 'MATRICULADO'
        }])
    }

    const removeMatricula = (index) => {
        if (matriculas.length > 1) {
            setMatriculas(matriculas.filter((_, i) => i !== index))
        }
    }

    const updateMatricula = (index, field, value) => {
        const newMatriculas = [...matriculas]
        newMatriculas[index] = { ...newMatriculas[index], [field]: value }
        setMatriculas(newMatriculas)
    }

    const addResponsavel = () => {
        setResponsaveis([...responsaveis, { nome: '', cpf: '', telefone: '', email: '', parentesco: '' }])
    }

    const removeResponsavel = (index) => {
        if (responsaveis.length > 1) {
            setResponsaveis(responsaveis.filter((_, i) => i !== index))
        }
    }

    const updateResponsavel = (index, field, value) => {
        const newResp = [...responsaveis]
        newResp[index] = { ...newResp[index], [field]: value }
        setResponsaveis(newResp)
    }

    useEffect(() => {
        // Auto-gerar username com base no CPF (apenas para novo)
        if (!isEditing && formData.cpf) {
            const cpfNumbers = formData.cpf.replace(/\D/g, '')
            if (cpfNumbers.length === 11) {
                setFormData(prev => ({
                    ...prev,
                    username: cpfNumbers
                }))
            }
        }
    }, [formData.cpf, isEditing])

    const isMenor = useMemo(() => {
        if (!formData.data_nascimento) return false
        const hoje = new Date()
        const [ano, mes, dia] = formData.data_nascimento.split('-').map(Number)
        // Ajuste para data (mês em JS é 0-indexed)
        const nasc = new Date(ano, mes - 1, dia)
        let idade = hoje.getFullYear() - nasc.getFullYear()
        const m = hoje.getMonth() - nasc.getMonth()
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
            idade--
        }
        return idade < 18
    }, [formData.data_nascimento])

    // Força permissão de sair sozinho se for maior de idade
    useEffect(() => {
        if (!isMenor) {
            setFormData(prev => ({ ...prev, permissao_sair_sozinho: true }))
        }
    }, [isMenor])

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
                complemento: data.complemento || prev.complemento // Mantém se o usuário já digitou algo ou usa da API
            }))
            toast.success('Endereço encontrado!')
        } catch (error) {
            console.error('Erro ao buscar CEP:', error)
            toast.error('Erro ao buscar o CEP')
        } finally {
            setCepLoading(false)
        }
    }

    const loadEstudante = async () => {
        try {
            // Carrega dados básicos e prontuário
            const [respEstudante, respProntuario] = await Promise.all([
                academicAPI.estudantes.get(cpfParam),
                academicAPI.estudantes.prontuario(cpfParam)
            ])
            const est = respEstudante.data
            const prontuario = respProntuario.data

            setFormData({
                username: est.usuario?.username || '',
                email: est.usuario?.email || '',
                password: '',
                first_name: est.usuario?.first_name || '',
                cpf: est.cpf_formatado || est.cpf || '',
                cin: est.cin || '',
                nome_social: est.nome_social || '',
                data_nascimento: est.data_nascimento || '',
                telefone: est.telefone_formatado || est.telefone || '',
                bolsa_familia: est.bolsa_familia || false,
                pe_de_meia: est.pe_de_meia ?? true,
                usa_onibus: est.usa_onibus ?? true,
                linha_onibus: est.linha_onibus || '',
                permissao_sair_sozinho: est.permissao_sair_sozinho || false,
                logradouro: est.logradouro || '',
                numero: est.numero || '',
                complemento: est.complemento || '',
                bairro: est.bairro || '',
                cidade: est.cidade || 'Paulínia',
                estado: est.estado || 'SP',
                cep: formatCEP(est.cep || ''),
            })

            // Carrega responsáveis se existirem
            if (est.responsaveis && est.responsaveis.length > 0) {
                const respArray = est.responsaveis.map(r => ({
                    nome: r.usuario?.first_name || '',
                    cpf: r.cpf_formatado || r.cpf || '',
                    telefone: r.telefone_formatado || r.telefone || '',
                    email: r.usuario?.email || '',
                    parentesco: r.parentesco || ''
                }))
                setResponsaveis(respArray)
            }

            // Carrega matrículas se existirem
            if (prontuario.matriculas_cemep && prontuario.matriculas_cemep.length > 0) {
                const matArray = prontuario.matriculas_cemep.map(m => ({
                    numero_matricula: formatMatricula(m.numero_matricula || ''),
                    curso_id: m.curso?.id?.toString() || '',
                    data_entrada: m.data_entrada || '',
                    data_saida: m.data_saida || '',
                    status: m.status || 'MATRICULADO'
                }))
                setMatriculas(matArray)
            }

            // Carrega foto se existir
            if (est.usuario?.foto) {
                setFotoPreview(est.usuario.foto)
            }
        } catch (error) {
            toast.error('Erro ao carregar estudante')
            navigate('/estudantes')
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

        // Validações
        if (!formData.first_name.trim()) {
            toast.error('Nome completo é obrigatório')
            return
        }

        const cpfNumbers = formData.cpf.replace(/\D/g, '')
        if (cpfNumbers.length !== 11) {
            toast.error('CPF deve ter 11 dígitos')
            return
        }
        if (!validateCPF(formData.cpf)) {
            toast.error('CPF Inválido')
            return
        }



        if (!formData.data_nascimento) {
            toast.error('Data de nascimento é obrigatória')
            return
        }

        const cepNumbers = formData.cep.replace(/\D/g, '')
        if (cepNumbers.length !== 8) {
            toast.error('CEP deve ter 8 dígitos')
            return
        }

        if (!isEditing && (!formData.username.trim() || !formData.password)) {
            toast.error('Usuário e senha são obrigatórios')
            return
        }

        // Validação de responsáveis (obrigatório para menores)
        if (isMenor) {
            // Pelo menos um responsável deve estar preenchido
            const temResponsavel = responsaveis.some(r => r.nome.trim() && r.cpf.trim())
            if (!temResponsavel) {
                toast.error('Menores de idade precisam de pelo menos um responsável')
                return
            }
        }

        // Valida cada responsável preenchido
        for (let i = 0; i < responsaveis.length; i++) {
            const resp = responsaveis[i]
            // Se começou a preencher, deve completar
            if (resp.nome.trim() || resp.cpf.trim()) {
                if (!resp.nome.trim()) {
                    toast.error(`Responsável ${i + 1}: Nome é obrigatório`)
                    return
                }
                if (!resp.cpf.trim()) {
                    toast.error(`Responsável ${i + 1}: CPF é obrigatório`)
                    return
                }
                if (!validateCPF(resp.cpf)) {
                    toast.error(`Responsável ${i + 1}: CPF inválido`)
                    return
                }
                if (!resp.parentesco) {
                    toast.error(`Responsável ${i + 1}: Parentesco é obrigatório`)
                    return
                }
            }
        }

        // Validação de matrículas (obrigatório pelo menos uma)
        const temMatriculaValida = matriculas.some(m =>
            m.numero_matricula.replace(/\D/g, '').length === 10 && m.curso_id && m.data_entrada
        )
        if (!temMatriculaValida) {
            toast.error('Pelo menos uma matrícula completa é obrigatória')
            return
        }

        // Valida cada matrícula preenchida
        for (let i = 0; i < matriculas.length; i++) {
            const mat = matriculas[i]
            const numMatricula = mat.numero_matricula.replace(/\D/g, '')

            // Se começou a preencher, deve completar
            if (numMatricula || mat.curso_id) {
                if (numMatricula.length !== 10) {
                    toast.error(`Matrícula ${i + 1}: Número deve ter 10 dígitos`)
                    return
                }
                if (!mat.curso_id) {
                    toast.error(`Matrícula ${i + 1}: Curso é obrigatório`)
                    return
                }
                if (!mat.data_entrada) {
                    toast.error(`Matrícula ${i + 1}: Data de entrada é obrigatória`)
                    return
                }
            }
        }

        setSaving(true)
        try {
            const telefoneNumbers = formData.telefone.replace(/\D/g, '')
            const cpfNumbers = formData.cpf.replace(/\D/g, '')
            const cepNumbers = formData.cep.replace(/\D/g, '')

            // Processa responsáveis válidos
            const responsaveisPayload = responsaveis
                .filter(r => r.nome.trim() && r.cpf.trim())
                .map(r => ({
                    nome: r.nome.trim(),
                    cpf: r.cpf.replace(/\D/g, ''),
                    telefone: r.telefone.replace(/\D/g, ''),
                    email: r.email || '',
                    parentesco: r.parentesco
                }))

            // Processa matrículas válidas
            const matriculasPayload = matriculas
                .filter(m => m.numero_matricula.replace(/\D/g, '').length === 10 && m.curso_id)
                .map(m => ({
                    numero_matricula: m.numero_matricula.replace(/\D/g, ''),
                    curso_id: parseInt(m.curso_id),
                    data_entrada: m.data_entrada,
                    data_saida: m.data_saida || null,
                    status: m.status
                }))

            const payload = {
                first_name: formData.first_name.trim(),
                email: formData.email || '',
                telefone: telefoneNumbers,
                cpf: cpfNumbers,
                cin: formData.cin.trim(),
                nome_social: formData.nome_social || '',
                data_nascimento: formData.data_nascimento,
                bolsa_familia: formData.bolsa_familia,
                pe_de_meia: formData.pe_de_meia,
                usa_onibus: formData.usa_onibus,
                linha_onibus: formData.linha_onibus || '',
                permissao_sair_sozinho: formData.permissao_sair_sozinho,
                logradouro: formData.logradouro.trim(),
                numero: formData.numero.trim(),
                complemento: formData.complemento || '',
                bairro: formData.bairro.trim(),
                cidade: formData.cidade || 'Paulínia',
                estado: formData.estado || 'SP',
                cep: cepNumbers,
                responsaveis: responsaveisPayload,
                matriculas: matriculasPayload
            }

            if (isEditing) {
                await academicAPI.estudantes.atualizarCompleto(cpfParam, payload)

                // Upload de foto se houver nova
                if (fotoBlob) {
                    const formDataFoto = new FormData()
                    formDataFoto.append('foto', fotoBlob, 'foto.jpg')
                    await academicAPI.estudantes.uploadFoto(cpfParam, formDataFoto)
                } else if (fotoPreview === null && !fotoBlob) {
                    // Se removeu a foto
                    await academicAPI.estudantes.removerFoto(cpfParam)
                }

                toast.success('Estudante atualizado com sucesso!')
                navigate('/estudantes')
            } else {
                const response = await academicAPI.estudantes.criarCompleto({
                    ...payload,
                    username: formData.username,
                    password: formData.password,
                })

                // Upload de foto se houver
                if (fotoBlob && response.data?.cpf) {
                    const cpfCriado = response.data.cpf.replace(/\D/g, '')
                    const formDataFoto = new FormData()
                    formDataFoto.append('foto', fotoBlob, 'foto.jpg')
                    try {
                        await academicAPI.estudantes.uploadFoto(cpfCriado, formDataFoto)
                    } catch (e) {
                        console.warn('Erro ao fazer upload da foto:', e)
                    }
                }

                toast.success('Estudante cadastrado com sucesso!')
                navigate('/estudantes')
            }
        } catch (error) {
            console.error('Erro completo:', error.response?.data)
            const data = error.response?.data
            const msg = data?.detail ||
                data?.cpf?.[0] ||
                data?.username?.[0] ||
                data?.email?.[0] ||
                (typeof data === 'object' ? Object.values(data).flat()[0] : null) ||
                'Erro ao salvar estudante'
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
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/estudantes')}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <HiArrowLeft className="h-6 w-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        {isEditing ? 'Editar Estudante' : 'Novo Estudante'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {isEditing ? 'Atualize os dados do estudante' : 'Preencha os dados para cadastrar um novo estudante'}
                    </p>
                </div>
            </div>

            {/* Formulário */}
            <Card hover={false}>
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Dados Pessoais */}
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                            Dados Pessoais
                        </h2>
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Foto 3x4 */}
                            <div className="flex-shrink-0">
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                                    Foto 3x4
                                </label>
                                <ImageCropper
                                    currentImage={fotoBlob ? URL.createObjectURL(fotoBlob) : fotoPreview}
                                    onCropComplete={(blob) => {
                                        if (blob) {
                                            setFotoBlob(blob)
                                            setFotoPreview(URL.createObjectURL(blob))
                                        } else {
                                            setFotoBlob(null)
                                            setFotoPreview(null)
                                        }
                                    }}
                                />
                            </div>

                            {/* Campos */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <Input
                                        label="Nome Completo *"
                                        placeholder="João da Silva"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
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
                                    label="CPF *"
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
                                    required
                                    disabled={isEditing}
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
                                    label="Data de Nascimento *"
                                    value={formData.data_nascimento}
                                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                                    required
                                />
                                <div className="md:col-span-2">
                                    <Input
                                        label="E-mail"
                                        type="email"
                                        placeholder="estudante@email.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        autoComplete="off"
                                    />
                                </div>
                                <Input
                                    label="Telefone"
                                    placeholder="(19) 99999-9999"
                                    value={formData.telefone}
                                    onChange={(e) => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })}
                                    onKeyDown={(e) => {
                                        const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                                        if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                                            e.preventDefault()
                                        }
                                    }}
                                    maxLength={15}
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dados dos Responsáveis */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                                Responsáveis
                                {isMenor && (
                                    <span className="ml-2 text-sm font-normal text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                        Obrigatório para menores
                                    </span>
                                )}
                            </h2>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addResponsavel}
                            >
                                + Adicionar Responsável
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {responsaveis.map((resp, index) => (
                                <div
                                    key={index}
                                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            Responsável {index + 1}
                                        </span>
                                        {responsaveis.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeResponsavel(index)}
                                                className="text-sm text-danger-500 hover:text-danger-700 dark:hover:text-danger-400"
                                            >
                                                Remover
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <Input
                                                label={isMenor ? "Nome Completo *" : "Nome Completo"}
                                                placeholder="Nome do responsável"
                                                value={resp.nome}
                                                onChange={(e) => updateResponsavel(index, 'nome', e.target.value)}
                                            />
                                        </div>
                                        <Input
                                            label={isMenor ? "CPF *" : "CPF"}
                                            placeholder="000.000.000-00"
                                            value={resp.cpf}
                                            onChange={(e) => updateResponsavel(index, 'cpf', formatCPF(e.target.value))}
                                            maxLength={14}
                                        />
                                        <Input
                                            label="E-mail"
                                            type="email"
                                            placeholder="responsavel@email.com"
                                            value={resp.email}
                                            onChange={(e) => updateResponsavel(index, 'email', e.target.value)}
                                        />
                                        <Input
                                            label="Telefone"
                                            placeholder="(19) 99999-9999"
                                            value={resp.telefone}
                                            onChange={(e) => updateResponsavel(index, 'telefone', formatTelefone(e.target.value))}
                                            maxLength={15}
                                        />
                                        <Select
                                            label={isMenor ? "Parentesco *" : "Parentesco"}
                                            value={resp.parentesco}
                                            onChange={(e) => updateResponsavel(index, 'parentesco', e.target.value)}
                                            options={[
                                                { value: 'PAI', label: 'Pai' },
                                                { value: 'MAE', label: 'Mãe' },
                                                { value: 'AVO_M', label: 'Avô(a) Materno' },
                                                { value: 'AVO_P', label: 'Avô(a) Paterno' },
                                                { value: 'TIO', label: 'Tio(a)' },
                                                { value: 'IRMAO', label: 'Irmão(ã)' },
                                                { value: 'OUTRO', label: 'Outro' },
                                            ]}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Matrículas */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                                Matrículas
                                <span className="ml-2 text-sm font-normal text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                    Obrigatório
                                </span>
                            </h2>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addMatricula}
                            >
                                + Adicionar Curso
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {matriculas.map((mat, index) => (
                                <div
                                    key={index}
                                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            Matrícula {index + 1}
                                        </span>
                                        {matriculas.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeMatricula(index)}
                                                className="text-sm text-danger-500 hover:text-danger-700 dark:hover:text-danger-400"
                                            >
                                                Remover
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <Input
                                            label="Número da Matrícula *"
                                            placeholder="000.000.000-0"
                                            value={mat.numero_matricula}
                                            onChange={(e) => updateMatricula(index, 'numero_matricula', formatMatricula(e.target.value))}
                                            onKeyDown={(e) => {
                                                const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                                                if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                                                    e.preventDefault()
                                                }
                                            }}
                                            maxLength={13}
                                            autoComplete="off"
                                        />
                                        <div className="md:col-span-2">
                                            <Combobox
                                                label="Curso"
                                                value={mat.curso_id}
                                                onChange={(val) => updateMatricula(index, 'curso_id', val)}
                                                options={cursos.map(c => ({
                                                    value: c.id,
                                                    label: c.nome,
                                                    subLabel: c.sigla
                                                }))}
                                                placeholder="Pesquise por nome ou sigla..."
                                                required
                                            />
                                        </div>
                                        <DateInput
                                            label="Data de Entrada *"
                                            value={mat.data_entrada}
                                            onChange={(e) => updateMatricula(index, 'data_entrada', e.target.value)}
                                        />
                                        <DateInput
                                            label="Data de Saída"
                                            value={mat.data_saida}
                                            onChange={(e) => updateMatricula(index, 'data_saida', e.target.value)}
                                        />
                                        <Select
                                            label="Status *"
                                            value={mat.status}
                                            onChange={(e) => updateMatricula(index, 'status', e.target.value)}
                                            options={STATUS_MATRICULA}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Endereço */}
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                            Endereço
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex items-end gap-2">
                                <div className="flex-1 min-w-[140px]">
                                    <Input
                                        label="CEP *"
                                        placeholder="00.000-000"
                                        value={formData.cep}
                                        onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                                        onKeyDown={(e) => {
                                            const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                                            if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                                                e.preventDefault()
                                            }
                                        }}
                                        maxLength={10}
                                        autoComplete="off"
                                        required
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => fetchCep(formData.cep.replace(/\D/g, ''))}
                                    disabled={formData.cep.replace(/\D/g, '').length !== 8 || cepLoading}
                                    loading={cepLoading}
                                    className="mb-[2px]" // Alinhamento visual com input
                                    title="Buscar CEP"
                                >
                                    {!cepLoading && <HiSearch className="h-5 w-5" />}
                                </Button>
                            </div>

                            {/* Quebra de linha forçada para separar CEP dos outros campos */}
                            <div className="col-span-1 md:col-span-2 lg:col-span-4 h-0" />

                            <div className="lg:col-span-2">
                                <Input
                                    label="Logradouro *"
                                    placeholder="Rua das Flores"
                                    value={formData.logradouro}
                                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                                    autoComplete="off"
                                    required
                                />
                            </div>
                            <Input
                                label="Número *"
                                placeholder="123"
                                value={formData.numero}
                                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                autoComplete="off"
                                required
                            />
                            <Input
                                label="Complemento"
                                placeholder="Apto 4B"
                                value={formData.complemento}
                                onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                                autoComplete="off"
                            />
                            <div className="lg:col-span-2">
                                <Input
                                    label="Bairro *"
                                    placeholder="Centro"
                                    value={formData.bairro}
                                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                                    autoComplete="off"
                                    required
                                />
                            </div>
                            <Input
                                label="Cidade"
                                placeholder="Cidade"
                                value={formData.cidade}
                                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                                autoComplete="off"
                                disabled
                                className="bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed"
                            />
                            <Select
                                label="Estado"
                                value={formData.estado}
                                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                                options={ESTADOS}
                                disabled
                                className="bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Benefícios e Transporte */}
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                            Benefícios e Transporte
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.bolsa_familia}
                                    onChange={(e) => setFormData({ ...formData, bolsa_familia: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-slate-700 dark:text-slate-300">Bolsa Família</span>
                            </label>
                            <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.pe_de_meia}
                                    onChange={(e) => setFormData({ ...formData, pe_de_meia: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-slate-700 dark:text-slate-300">Pé de Meia</span>
                            </label>
                            <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.permissao_sair_sozinho}
                                    onChange={(e) => setFormData({ ...formData, permissao_sair_sozinho: e.target.checked })}
                                    disabled={!isMenor}
                                    className={`w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 ${!isMenor ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                                <span className="text-slate-700 dark:text-slate-300">
                                    Pode Sair Sozinho
                                    {!isMenor && <span className="text-xs ml-2 text-slate-500">(Maior de idade)</span>}
                                </span>
                            </label>
                            <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.usa_onibus}
                                    onChange={(e) => setFormData({ ...formData, usa_onibus: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-slate-700 dark:text-slate-300">Usa Ônibus Escolar</span>
                            </label>
                            {formData.usa_onibus && (
                                <div className="lg:col-span-2">
                                    <Input
                                        label="Linha do Ônibus"
                                        placeholder="Ex: Linha 3 - Centro"
                                        value={formData.linha_onibus}
                                        onChange={(e) => setFormData({ ...formData, linha_onibus: e.target.value })}
                                        autoComplete="off"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Credenciais de Acesso (apenas criação) */}
                    {!isEditing && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                                    Credenciais de Acesso
                                </h2>
                                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                    Do estudante
                                </span>
                            </div>

                            {/* Campos ocultos para confundir o autocomplete do navegador */}
                            <input type="text" name="fakeuser" autoComplete="username" style={{ display: 'none' }} />
                            <input type="password" name="fakepass" autoComplete="current-password" style={{ display: 'none' }} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Login do Estudante *</label>
                                    <input
                                        type="text"
                                        name="estudante_login"
                                        placeholder="CPF do estudante"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
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
                                        Preenchido automaticamente com o CPF
                                    </p>
                                </div>
                                <div>
                                    <label className="label">Senha do Estudante *</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="estudante_senha"
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
                        <Button type="button" variant="secondary" onClick={() => navigate('/estudantes')}>
                            Cancelar
                        </Button>
                        <Button type="submit" icon={HiSave} loading={saving}>
                            {isEditing ? 'Salvar Alterações' : 'Cadastrar Estudante'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
