import { createContext, useContext, useState, useEffect } from 'react'
import { coreAPI } from '../services/api'
import { useAuth } from './AuthContext'

const ReferenceContext = createContext({})

export function ReferenceProvider({ children }) {
    const { isAuthenticated } = useAuth()

    // Cache States
    const [cursos, setCursos] = useState([])
    const [anosLetivos, setAnosLetivos] = useState([])
    const [loaded, setLoaded] = useState(false)
    const [loading, setLoading] = useState(false)

    const loadReferences = async (force = false) => {
        if ((loaded && !force) || loading || !isAuthenticated) return

        setLoading(true)
        try {
            console.log('🔄 ReferenceContext: Carregando dados estáticos...')
            const [cursosRes, anosRes] = await Promise.all([
                coreAPI.cursos.list(),
                coreAPI.anosLetivos.list()
            ])

            const cursosData = cursosRes.data.results || cursosRes.data
            const anosData = anosRes.data.results || anosRes.data

            setCursos(cursosData)
            setAnosLetivos(anosData)
            setLoaded(true)
            console.log('✅ ReferenceContext: Dados carregados com sucesso.')
        } catch (error) {
            console.error('❌ ReferenceContext: Erro ao carregar referências', error)
        } finally {
            setLoading(false)
        }
    }

    // Carrega automaticamente ao autenticar, se ainda não carregou
    useEffect(() => {
        if (isAuthenticated && !loaded) {
            loadReferences()
        }
    }, [isAuthenticated, loaded])

    return (
        <ReferenceContext.Provider value={{
            cursos,
            anosLetivos,
            loading,
            reloadReferences: () => loadReferences(true)
        }}>
            {children}
        </ReferenceContext.Provider>
    )
}

export function useReferences() {
    const context = useContext(ReferenceContext)
    if (!context) {
        throw new Error('useReferences deve ser usado dentro de um ReferenceProvider')
    }
    return context
}
