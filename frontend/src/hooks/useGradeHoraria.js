import { useState, useCallback } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

/**
 * Hook para gerenciar operações de Grade Horária e Validade.
 */
export function useGradeHoraria() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    /**
     * Busca dados de edição da grade (Validades, Grades, Disciplinas, etc).
     * @param {string} turmaId 
     * @param {string|null} validadeId 
     */
    const fetchDadosEdicao = useCallback(async (turmaId, validadeId = null) => {
        setLoading(true)
        try {
            const params = { turma_id: turmaId }
            if (validadeId) params.validade_id = validadeId

            const response = await api.get('/core/grades-horarias/dados_edicao/', { params })
            return response.data
        } catch (error) {
            console.error('Erro ao buscar dados da grade:', error)
            toast.error('Erro ao carregar dados da grade horária.')
            throw error
        } finally {
            setLoading(false)
        }
    }, [])

    /**
     * Salva a grade horária (Lote).
     * @param {Object} payload { turma_id, validade_id, data_inicio, data_fim, grades: [...] }
     */
    const salvarGrade = useCallback(async (payload) => {
        setLoading(true)
        try {
            const response = await api.post('/core/grades-horarias/salvar_lote/', payload)
            toast.success('Grade horária salva com sucesso!')
            return response.data
        } catch (error) {
            console.error('Erro ao salvar grade:', error)
            const msg = error.response?.data?.error || 'Erro ao salvar grade horária.'
            toast.error(msg)
            throw error
        } finally {
            setLoading(false)
        }
    }, [])

    return {
        loading,
        fetchDadosEdicao,
        salvarGrade
    }
}
