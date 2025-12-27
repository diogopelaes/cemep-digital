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

    const loadTurma = useCallback(async () => {
        if (!turmaId) return

        setLoading(true)
        setError(null)

        try {
            const response = await coreAPI.turmas.get(turmaId)
            setTurma(response.data)
        } catch (err) {
            setError(err)
            toast.error('Erro ao carregar turma')
        } finally {
            setLoading(false)
        }
    }, [turmaId])

    useEffect(() => {
        loadTurma()
    }, [loadTurma])

    const reloadTurma = useCallback(() => {
        return loadTurma()
    }, [loadTurma])

    return {
        turma,
        loading,
        error,
        reloadTurma
    }
}

export default useTurma
