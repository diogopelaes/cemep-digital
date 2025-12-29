import { useState, useEffect, useCallback, useMemo } from 'react'
import { academicAPI, coreAPI } from '../services/api'
import { generatePassword } from '../utils/password'
import { validateCPF } from '../utils/validators'
import { formatCEP, formatMatricula, formatCPF as formatCPFMask, formatTelefone } from '../utils/formatters'
import toast from 'react-hot-toast'

/**
 * Hook para gerenciar o formulário de estudante
 * Centraliza toda lógica de estado, validação e submissão
 * 
 * @param {string} cpfParam - CPF do estudante (para edição)
 * @param {Function} navigate - Função de navegação
 * @returns {Object} Estado e handlers do formulário
 */
export function useEstudanteForm(cpfParam, navigate) {
    const isEditing = !!cpfParam

    const [loading, setLoading] = useState(isEditing)
    const [saving, setSaving] = useState(false)
    const [fotoBlob, setFotoBlob] = useState(null)
    const [fotoPreview, setFotoPreview] = useState(null)
    const [cursos, setCursos] = useState([])
    const [cepLoading, setCepLoading] = useState(false)
    const [cpfError, setCpfError] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Estado principal do formulário
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

    // Responsáveis
    const [responsaveis, setResponsaveis] = useState([
        { nome: '', cpf: '', telefone: '', email: '', parentesco: '' }
    ])

    // Matrículas
    const [matriculas, setMatriculas] = useState([
        { numero_matricula: '', curso_id: '', data_entrada: new Date().toISOString().split('T')[0], data_saida: '', status: 'MATRICULADO' }
    ])

    // Calcula se é menor de idade
    const isMenor = useMemo(() => {
        if (!formData.data_nascimento) return false
        const hoje = new Date()
        const [ano, mes, dia] = formData.data_nascimento.split('-').map(Number)
        const nasc = new Date(ano, mes - 1, dia)
        let idade = hoje.getFullYear() - nasc.getFullYear()
        const m = hoje.getMonth() - nasc.getMonth()
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
            idade--
        }
        return idade < 18
    }, [formData.data_nascimento])

    // Carregar cursos
    useEffect(() => {
        const loadCursos = async () => {
            try {
                const response = await coreAPI.cursos.list()
                const cursosData = response.data.results || response.data
                setCursos(cursosData)
            } catch (error) {
                console.error('Erro ao carregar cursos:', error)
            }
        }
        loadCursos()
    }, [])

    // Inicialização
    useEffect(() => {
        if (isEditing) {
            loadEstudante()
        } else {
            setFormData(prev => ({
                ...prev,
                password: generatePassword()
            }))
        }
    }, [cpfParam])

    // Auto-gerar username com base no CPF
    useEffect(() => {
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

    // Validar CPF em tempo real
    useEffect(() => {
        if (formData.cpf && formData.cpf.length === 14) {
            const isValid = validateCPF(formData.cpf)
            setCpfError(isValid ? '' : 'CPF Inválido')
        } else {
            setCpfError('')
        }
    }, [formData.cpf])

    // Força permissão de sair sozinho se for maior de idade
    useEffect(() => {
        if (!isMenor) {
            setFormData(prev => ({ ...prev, permissao_sair_sozinho: true }))
        }
    }, [isMenor])

    // Carregar estudante existente
    const loadEstudante = async () => {
        try {
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

            // Carrega responsáveis
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

            // Carrega matrículas
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

            // Carrega foto
            if (est.usuario?.foto) {
                setFotoPreview(est.usuario.foto)
            }
        } catch (error) {
            toast.error('Erro ao carregar estudante')
            navigate('/estudantes')
        }
        setLoading(false)
    }

    // Buscar CEP
    const fetchCep = useCallback(async (cep) => {
        const cleanCep = cep.replace(/\D/g, '')
        if (cleanCep.length !== 8) return

        setCepLoading(true)
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
            const data = await response.json()

            if (data.erro) {
                toast.error('CEP não encontrado')
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
    }, [])

    // Atualizar campo do formulário
    const updateField = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }, [])

    // Gerar nova senha
    const regeneratePassword = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            password: generatePassword()
        }))
    }, [])

    // === MATRÍCULAS ===
    const addMatricula = useCallback(() => {
        setMatriculas(prev => [...prev, {
            numero_matricula: '',
            curso_id: '',
            data_entrada: new Date().toISOString().split('T')[0],
            data_saida: '',
            status: 'MATRICULADO'
        }])
    }, [])

    const removeMatricula = useCallback((index) => {
        setMatriculas(prev => {
            if (prev.length > 1) {
                return prev.filter((_, i) => i !== index)
            }
            return prev
        })
    }, [])

    const updateMatricula = useCallback((index, field, value) => {
        setMatriculas(prev => {
            const newMat = [...prev]
            newMat[index] = { ...newMat[index], [field]: value }
            return newMat
        })
    }, [])

    // === RESPONSÁVEIS ===
    const addResponsavel = useCallback(() => {
        setResponsaveis(prev => [...prev, { nome: '', cpf: '', telefone: '', email: '', parentesco: '' }])
    }, [])

    const removeResponsavel = useCallback((index) => {
        setResponsaveis(prev => {
            if (prev.length > 1) {
                return prev.filter((_, i) => i !== index)
            }
            return prev
        })
    }, [])

    const updateResponsavel = useCallback((index, field, value) => {
        setResponsaveis(prev => {
            const newResp = [...prev]
            newResp[index] = { ...newResp[index], [field]: value }
            return newResp
        })
    }, [])

    // === VALIDAÇÃO ===
    const validate = useCallback(() => {
        if (!formData.first_name.trim()) {
            toast.error('Nome completo é obrigatório')
            return false
        }

        const cpfNumbers = formData.cpf.replace(/\D/g, '')
        if (cpfNumbers.length !== 11) {
            toast.error('CPF deve ter 11 dígitos')
            return false
        }
        if (!validateCPF(formData.cpf)) {
            toast.error('CPF Inválido')
            return false
        }

        if (!formData.data_nascimento) {
            toast.error('Data de nascimento é obrigatória')
            return false
        }

        const cepNumbers = formData.cep.replace(/\D/g, '')
        if (cepNumbers.length !== 8) {
            toast.error('CEP deve ter 8 dígitos')
            return false
        }

        if (!isEditing && (!formData.username.trim() || !formData.password)) {
            toast.error('Usuário e senha são obrigatórios')
            return false
        }

        // Validação de responsáveis (obrigatório para menores)
        if (isMenor) {
            const temResponsavel = responsaveis.some(r => r.nome.trim() && r.cpf.trim())
            if (!temResponsavel) {
                toast.error('Menores de idade precisam de pelo menos um responsável')
                return false
            }
        }

        // Valida cada responsável preenchido
        for (let i = 0; i < responsaveis.length; i++) {
            const resp = responsaveis[i]
            if (resp.nome.trim() || resp.cpf.trim()) {
                if (!resp.nome.trim()) {
                    toast.error(`Responsável ${i + 1}: Nome é obrigatório`)
                    return false
                }
                if (!resp.cpf.trim()) {
                    toast.error(`Responsável ${i + 1}: CPF é obrigatório`)
                    return false
                }
                if (!validateCPF(resp.cpf)) {
                    toast.error(`Responsável ${i + 1}: CPF inválido`)
                    return false
                }
                if (!resp.parentesco) {
                    toast.error(`Responsável ${i + 1}: Parentesco é obrigatório`)
                    return false
                }
            }
        }

        // Validação de matrículas
        const temMatriculaValida = matriculas.some(m => {
            const num = m.numero_matricula.replace(/[^0-9Xx]/g, '')
            return num.length === 10 && m.curso_id && m.data_entrada
        })
        if (!temMatriculaValida) {
            toast.error('Pelo menos uma matrícula completa é obrigatória')
            return false
        }

        for (let i = 0; i < matriculas.length; i++) {
            const mat = matriculas[i]
            const numMatricula = mat.numero_matricula.replace(/[^0-9Xx]/g, '')

            if (numMatricula || mat.curso_id) {
                if (numMatricula.length !== 10) {
                    toast.error(`Matrícula ${i + 1}: Número deve ter 10 dígitos`)
                    return false
                }
                if (!mat.curso_id) {
                    toast.error(`Matrícula ${i + 1}: Curso é obrigatório`)
                    return false
                }
                if (!mat.data_entrada) {
                    toast.error(`Matrícula ${i + 1}: Data de entrada é obrigatória`)
                    return false
                }
            }
        }

        return true
    }, [formData, responsaveis, matriculas, isEditing, isMenor])

    // === SUBMISSÃO ===
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault()

        if (!validate()) return

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
                .filter(m => {
                    const num = m.numero_matricula.replace(/[^0-9Xx]/g, '')
                    return num.length === 10 && m.curso_id
                })
                .map(m => ({
                    numero_matricula: m.numero_matricula.replace(/[^0-9Xx]/g, '').toUpperCase(),
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
                complemento: formData.complemento.trim(),
                bairro: formData.bairro.trim(),
                cidade: formData.cidade.trim(),
                estado: formData.estado,
                cep: cepNumbers,
                responsaveis: responsaveisPayload,
                matriculas: matriculasPayload,
            }

            // Adiciona credenciais apenas na criação
            if (!isEditing) {
                payload.username = formData.username.trim()
                payload.password = formData.password
            }

            let response
            if (isEditing) {
                response = await academicAPI.estudantes.update(cpfParam, payload)
            } else {
                response = await academicAPI.estudantes.create(payload)
            }

            // Upload de foto se houver
            if (fotoBlob) {
                const formDataFoto = new FormData()
                formDataFoto.append('foto', fotoBlob, 'foto.jpg')
                const cpfToUse = isEditing ? cpfParam : cpfNumbers
                await academicAPI.estudantes.uploadFoto(cpfToUse, formDataFoto)
            }

            toast.success(isEditing ? 'Estudante atualizado!' : 'Estudante cadastrado!')
            const cpfTarget = isEditing ? cpfParam : cpfNumbers
            navigate(`/estudantes/${cpfTarget}`)
        } catch (error) {
            console.error('Erro ao salvar:', error)
            const msg = error.response?.data?.detail ||
                error.response?.data?.message ||
                'Erro ao salvar estudante'
            toast.error(msg)
        }
        setSaving(false)
    }, [formData, responsaveis, matriculas, fotoBlob, isEditing, cpfParam, navigate, validate])

    return {
        // Estado
        loading,
        saving,
        isEditing,
        formData,
        responsaveis,
        matriculas,
        cursos,
        fotoBlob,
        fotoPreview,
        cepLoading,
        cpfError,
        showPassword,
        isMenor,

        // Setters
        setFotoBlob,
        setFotoPreview,
        setShowPassword,

        // Handlers de formData
        updateField,
        fetchCep,
        regeneratePassword,

        // Handlers de matrículas
        addMatricula,
        removeMatricula,
        updateMatricula,

        // Handlers de responsáveis
        addResponsavel,
        removeResponsavel,
        updateResponsavel,

        // Submissão
        handleSubmit,
    }
}

export default useEstudanteForm
