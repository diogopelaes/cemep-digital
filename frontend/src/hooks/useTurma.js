import { useState, useEffect, useCallback } from 'react'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

/**
 * Hook para gerenciar dados da turma
 * 
 * @param {string|number} turmaId - ID da turma
 * @returns {Object} { turma, loading, error, reloadTurma }
 */
export function useTurma(turmaId) {
    const [turma, setTurma] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const loadTurma = useCallback(async (showLoading = true) => {
        if (!turmaId) return

        if (showLoading) setLoading(true)
        setError(null)

        try {
            const response = await coreAPI.turmas.get(turmaId)
            setTurma(response.data)
        } catch (err) {
            setError(err)
            toast.error('Erro ao carregar turma')
        } finally {
            if (showLoading) setLoading(false)
        }
    }, [turmaId])

    useEffect(() => {
        loadTurma(true)
    }, [loadTurma])

    const reloadTurma = useCallback(() => {
        return loadTurma(false)
    }, [loadTurma])

    return {
        turma,
        loading,
        error,
        reloadTurma
    }
}

export default useTurma
