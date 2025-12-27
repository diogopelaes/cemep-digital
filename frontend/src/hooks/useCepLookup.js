import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

/**
 * Hook para busca de endereço via CEP
 * Reutilizável em EstudanteForm e FuncionarioForm
 * 
 * @returns {Object} { fetchCep, loading }
 */
export function useCepLookup() {
    const [loading, setLoading] = useState(false)

    const fetchCep = useCallback(async (cep) => {
        // Remove formatação
        const cleanCep = cep.replace(/\D/g, '')

        if (cleanCep.length !== 8) {
            toast.error('CEP deve ter 8 dígitos')
            return null
        }

        setLoading(true)
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
            const data = await response.json()

            if (data.erro) {
                toast.error('CEP não encontrado')
                return null
            }

            toast.success('Endereço encontrado!')
            return {
                logradouro: data.logradouro || '',
                bairro: data.bairro || '',
                cidade: data.localidade || '',
                estado: data.uf || '',
                complemento: data.complemento || ''
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error)
            toast.error('Erro ao buscar o CEP')
            return null
        } finally {
            setLoading(false)
        }
    }, [])

    return { fetchCep, loading }
}

export default useCepLookup
