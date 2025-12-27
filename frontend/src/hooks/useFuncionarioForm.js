import { useState, useEffect, useCallback } from 'react'
import { coreAPI } from '../services/api'
import { generatePassword } from '../utils/password'
import { validateCPF } from '../utils/validators'
import { formatCEP, formatCPF as formatCPFMask, formatTelefone } from '../utils/formatters'
import toast from 'react-hot-toast'

/**
 * Obtém a data atual no formato YYYY-MM-DD
 */
const getDataAtual = () => new Date().toISOString().split('T')[0]

/**
 * Hook para gerenciar o formulário de funcionário
 * Centraliza toda lógica de estado, validação e submissão
 * 
 * @param {string} idParam - ID do funcionário (para edição)
 * @param {Function} navigate - Função de navegação
 * @returns {Object} Estado e handlers do formulário
 */
export function useFuncionarioForm(idParam, navigate) {
    const isEditing = !!idParam

    const [loading, setLoading] = useState(isEditing)
    const [saving, setSaving] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [funcionario, setFuncionario] = useState(null)
    const [cepLoading, setCepLoading] = useState(false)
    const [cpfError, setCpfError] = useState('')

    // Estado principal do formulário
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

        // Dados pessoais
        cpf: '',
        cin: '',
        nome_social: '',
        data_nascimento: '',

        // Endereço
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
    })

    // Validar CPF em tempo real
    useEffect(() => {
        if (formData.cpf && formData.cpf.length === 14) {
            const isValid = validateCPF(formData.cpf)
            setCpfError(isValid ? '' : 'CPF Inválido')
        } else {
            setCpfError('')
        }
    }, [formData.cpf])

    // Inicialização
    useEffect(() => {
        if (isEditing) {
            loadFuncionario()
        } else {
            setFormData(prev => ({
                ...prev,
                password: generatePassword()
            }))
        }
    }, [idParam])

    // Auto-gerar username com base na matrícula
    useEffect(() => {
        if (!isEditing && formData.matricula) {
            setFormData(prev => ({
                ...prev,
                username: formData.matricula
            }))
        }
    }, [formData.matricula, isEditing])

    // Carregar funcionário existente
    const loadFuncionario = async () => {
        try {
            const response = await coreAPI.funcionarios.get(idParam)
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
                cpf: func.cpf ? formatCPFMask(func.cpf) : '',
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

    // Buscar CEP
    const fetchCep = useCallback(async (cep) => {
        const cleanCep = cep.replace(/\D/g, '')
        if (cleanCep.length !== 8) {
            toast.error('CEP deve ter 8 dígitos')
            return
        }

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

    // Validação
    const validate = useCallback(() => {
        if (!formData.nome.trim() || !formData.matricula) {
            toast.error('Preencha os campos obrigatórios')
            return false
        }

        const matriculaNum = parseInt(formData.matricula)
        if (isNaN(matriculaNum) || matriculaNum <= 0) {
            toast.error('Número de matrícula inválido')
            return false
        }

        if (!isEditing && (!formData.username.trim() || !formData.password)) {
            toast.error('Usuário e senha são obrigatórios')
            return false
        }

        return true
    }, [formData, isEditing])

    // Submissão
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault()

        if (!validate()) return

        setSaving(true)
        try {
            const matriculaNum = parseInt(formData.matricula)
            const payload = {
                nome: formData.nome,
                email: formData.email || '',
                telefone: formData.telefone || '',
                tipo_usuario: formData.tipo_usuario,
                matricula: matriculaNum,
                area_atuacao: formData.area_atuacao || null,
                apelido: formData.apelido || null,
                data_entrada: formData.data_entrada,
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
            }

            if (isEditing) {
                await coreAPI.funcionarios.atualizarCompleto(idParam, payload)
                toast.success('Funcionário atualizado com sucesso!')
                navigate('/funcionarios')
            } else {
                const response = await coreAPI.funcionarios.criarCompleto({
                    ...payload,
                    username: formData.username,
                    password: formData.password,
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
    }, [formData, isEditing, idParam, navigate, validate])

    return {
        // Estado
        loading,
        saving,
        isEditing,
        formData,
        funcionario,
        cepLoading,
        cpfError,
        showPassword,

        // Setters
        setShowPassword,

        // Handlers
        updateField,
        fetchCep,
        regeneratePassword,
        handleSubmit,
    }
}

export default useFuncionarioForm
