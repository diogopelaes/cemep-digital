import { useState, useEffect, useCallback } from 'react'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

/**
 * Hook para gerenciar representantes de uma turma
 * 
 * @param {string|number} turmaId - ID da turma
 * @param {Object} turma - Objeto da turma (para verificar se está carregada)
 * @param {boolean} isActive - Se a aba de representantes está ativa
 * @param {Function} reloadTurma - Callback para recarregar turma após update
 * @returns {Object} Estado e handlers para representantes
 */
export function useRepresentantesTurma(turmaId, turma, isActive = true, reloadTurma) {
    const [todosRepresentantes, setTodosRepresentantes] = useState([])
    const [representantesSelecionados, setRepresentantesSelecionados] = useState([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Carrega representantes disponíveis
    const loadRepresentantes = useCallback(async () => {
        if (!turma || !isActive) return

        setLoading(true)

        try {
            const response = await coreAPI.funcionarios.list({
                usuario__tipo_usuario: 'PROFESSOR',
                page_size: 100
            })
            const professoresData = response.data.results || response.data
            setTodosRepresentantes(professoresData)

            // Carrega os representantes já selecionados
            if (turma?.professores_representantes_details) {
                setRepresentantesSelecionados(turma.professores_representantes_details.map(p => p.id))
            } else if (turma?.professores_representantes) {
                setRepresentantesSelecionados(turma.professores_representantes)
            }
        } catch (error) {
            toast.error('Erro ao carregar representantes')
        } finally {
            setLoading(false)
        }
    }, [turma, isActive])

    // Carrega quando turma mudar ou aba ativar
    useEffect(() => {
        if (turma && isActive) {
            loadRepresentantes()
        }
    }, [turma, isActive])

    // Atualiza representantes
    const updateRepresentantes = useCallback(async (novosRepresentantes) => {
        const anteriores = [...representantesSelecionados]
        setRepresentantesSelecionados(novosRepresentantes)
        setSaving(true)

        try {
            await coreAPI.turmas.update(turmaId, {
                professores_representantes: novosRepresentantes,
            })

            // Identifica se foi adição ou remoção para mostrar mensagem apropriada
            if (novosRepresentantes.length > anteriores.length) {
                const novoId = novosRepresentantes.find(id => !anteriores.includes(id))
                const professor = todosRepresentantes.find(p => p.id === novoId)
                toast.success(`${professor?.apelido || professor?.nome_completo || 'Professor'} adicionado como representante`)
            } else {
                toast.success('Representante removido')
            }

            // Recarrega a turma para atualizar o badge
            if (reloadTurma) {
                await reloadTurma()
            }
        } catch (error) {
            // Reverte em caso de erro
            setRepresentantesSelecionados(anteriores)
            toast.error('Erro ao atualizar representantes')
        } finally {
            setSaving(false)
        }
    }, [turmaId, representantesSelecionados, todosRepresentantes, reloadTurma])

    // Remove um representante
    const removeRepresentante = useCallback(async (repId) => {
        const novosRepresentantes = representantesSelecionados.filter(id => id !== repId)
        await updateRepresentantes(novosRepresentantes)
    }, [representantesSelecionados, updateRepresentantes])

    return {
        todosRepresentantes,
        representantesSelecionados,
        loading,
        saving,
        updateRepresentantes,
        removeRepresentante,
    }
}

export default useRepresentantesTurma
