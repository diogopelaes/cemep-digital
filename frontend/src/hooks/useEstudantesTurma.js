import { useState, useEffect, useCallback } from 'react'
import { academicAPI } from '../services/api'
import toast from 'react-hot-toast'

/**
 * Hook para gerenciar estudantes de uma turma
 * 
 * @param {string|number} turmaId - ID da turma
 * @param {Object} turma - Objeto da turma
 * @param {boolean} isActive - Se a aba de estudantes está ativa
 * @returns {Object} Estado e handlers para estudantes
 */
export function useEstudantesTurma(turmaId, turma, isActive = true, onUpdate = null) {
    const [estudantesElegiveis, setEstudantesElegiveis] = useState([])
    const [estudantesEnturmados, setEstudantesEnturmados] = useState([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [dataEntrada, setDataEntrada] = useState(() => {
        // Padrão: data de hoje no formato YYYY-MM-DD
        return new Date().toISOString().split('T')[0]
    })

    // Carrega estudantes
    const loadEstudantes = useCallback(async () => {
        if (!turma || !isActive) return

        setLoading(true)
        try {
            // Carregar estudantes elegíveis
            const eligiveisResp = await academicAPI.matriculasTurma.estudantesElegiveis(turmaId)
            setEstudantesElegiveis(eligiveisResp.data || [])

            // Carregar estudantes já enturmados
            const enturmadosResp = await academicAPI.matriculasTurma.list({ turma: turmaId })
            const enturmados = enturmadosResp.data.results || enturmadosResp.data || []
            // Ordenar por nome
            enturmados.sort((a, b) => {
                const nomeA = a.matricula_cemep?.estudante?.usuario?.first_name || ''
                const nomeB = b.matricula_cemep?.estudante?.usuario?.first_name || ''
                return nomeA.localeCompare(nomeB)
            })
            setEstudantesEnturmados(enturmados)
        } catch (error) {
            console.error('Erro ao carregar estudantes:', error)
            toast.error('Erro ao carregar estudantes')
        } finally {
            setLoading(false)
        }
    }, [turmaId, turma, isActive])

    // Carrega quando turma mudar ou aba ativar
    useEffect(() => {
        if (turma && isActive) {
            loadEstudantes()
        }
    }, [turma, isActive, loadEstudantes])

    // Enturmar estudantes (recebe lista de numero_matricula)
    const enturmarEstudantes = useCallback(async (matriculasIds) => {
        if (!matriculasIds.length || !dataEntrada) {
            toast.error('Selecione ao menos um estudante e informe a data de entrada')
            return
        }

        setSaving(true)
        try {
            const response = await academicAPI.matriculasTurma.enturmarLote({
                turma_id: turmaId,
                matriculas_cemep_ids: matriculasIds,
                data_entrada: dataEntrada
            })

            const { created_count, errors } = response.data

            if (created_count > 0) {
                toast.success(`${created_count} estudante(s) enturmado(s) com sucesso!`)
                if (onUpdate) onUpdate()
            }

            if (errors?.length > 0) {
                errors.forEach(err => toast.error(err))
            }

            // Recarrega lista
            await loadEstudantes()
        } catch (error) {
            console.error('Erro ao enturmar:', error)
            toast.error(error.response?.data?.detail || 'Erro ao enturmar estudantes')
        } finally {
            setSaving(false)
        }
    }, [turmaId, dataEntrada, loadEstudantes, onUpdate])

    // Remove um estudante da turma
    const removeEstudante = useCallback(async (matriculaTurmaId) => {
        setSaving(true)
        try {
            // Encontra o estudante antes de remover para poder adicionar de volta aos elegíveis
            const removido = estudantesEnturmados.find(item => item.id === matriculaTurmaId)

            await academicAPI.matriculasTurma.delete(matriculaTurmaId)
            toast.success('Estudante removido da turma')

            // Remove da lista de enturmados
            setEstudantesEnturmados(prev => prev.filter(item => item.id !== matriculaTurmaId))

            // Adiciona de volta aos elegíveis se encontrou o estudante
            if (removido?.matricula_cemep) {
                setEstudantesElegiveis(prev => [...prev, removido.matricula_cemep])
            }

            if (onUpdate) onUpdate()
        } catch (error) {
            console.error('Erro ao remover:', error)
            toast.error('Erro ao remover estudante da turma')
        } finally {
            setSaving(false)
        }
    }, [estudantesEnturmados])

    return {
        estudantesElegiveis,
        estudantesEnturmados,
        loading,
        saving,
        dataEntrada,
        setDataEntrada,
        enturmarEstudantes,
        removeEstudante,
        reloadEstudantes: loadEstudantes,
    }
}

export default useEstudantesTurma
