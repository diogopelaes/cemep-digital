import { useState, useEffect, useCallback } from 'react'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

/**
 * Hook para gerenciar disciplinas de uma turma
 * 
 * @param {string|number} turmaId - ID da turma
 * @param {Object} turma - Objeto da turma (para verificar se está carregada)
 * @param {boolean} isActive - Se a aba de disciplinas está ativa
 * @param {number} pageSize - Tamanho da página
 * @returns {Object} Estado e handlers para disciplinas
 */
export function useDisciplinasTurma(turmaId, turma, isActive = true, pageSize = 20) {
    // Estado das disciplinas
    const [todasDisciplinas, setTodasDisciplinas] = useState([])
    const [disciplinasVinculadas, setDisciplinasVinculadas] = useState({})
    const [aulasSemanais, setAulasSemanais] = useState({})
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Paginação
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)

    // Professores
    const [professoresDisponiveis, setProfessoresDisponiveis] = useState([])
    const [salvandoProfessores, setSalvandoProfessores] = useState(null)

    // Carrega disciplinas
    const loadDisciplinas = useCallback(async (silent = false) => {
        if (!turma || !isActive) return

        if (!silent) setLoading(true)

        try {
            const [vinculadasRes, todasRes, atribuicoesRes] = await Promise.all([
                coreAPI.disciplinasTurma.list({ turma: turmaId, page_size: 100 }),
                coreAPI.disciplinas.list({ is_active: 'true', page }),
                coreAPI.atribuicoes.list({ turma: turmaId, page_size: 100 }),
            ])

            const vinculadas = vinculadasRes.data.results || vinculadasRes.data
            const todas = todasRes.data.results || todasRes.data
            const atribuicoes = atribuicoesRes.data.results || atribuicoesRes.data
            // Não carregamos mais funcionarios em massa

            setTodasDisciplinas(todas)

            if (todasRes.data.count) {
                setTotalCount(todasRes.data.count)
                setTotalPages(Math.ceil(todasRes.data.count / pageSize))
            }

            // setProfessoresDisponiveis não é mais usado globalmente dessa forma
            // mas podemos manter o estado se quisermos cachear buscas

            // ... (rest of mapping logic) ...
            const vinculadasMap = {}
            const aulasMap = {}

            vinculadas.forEach(v => {
                const atribuicoesDestaDisc = atribuicoes.filter(a => a.disciplina_turma?.id === v.id)
                vinculadasMap[v.disciplina.id] = {
                    id: v.id,
                    aulas_semanais: v.aulas_semanais,
                    professores: atribuicoesDestaDisc.map(a => ({
                        id: a.professor?.id,
                        atribuicao_id: a.id,
                        tipo: a.tipo || 'TITULAR',
                        tipo_display: a.tipo_display || 'Titular',
                        data_inicio: a.data_inicio,
                        data_fim: a.data_fim,
                        ...a.professor
                    })),
                }
                aulasMap[v.disciplina.id] = v.aulas_semanais?.toString() || ''
            })

            setDisciplinasVinculadas(vinculadasMap)
            setAulasSemanais(aulasMap)
        } catch (error) {
            if (!silent) {
                toast.error('Erro ao carregar disciplinas')
            }
            console.error(error)
        } finally {
            if (!silent) setLoading(false)
        }
    }, [turma, turmaId, isActive, page, pageSize])

    // Busca professores sob demanda
    const searchProfessores = useCallback(async (query) => {
        if (!query) return []
        try {
            const response = await coreAPI.funcionarios.list({
                search: query,
                usuario__tipo_usuario: 'PROFESSOR',
                page_size: 20,
                usuario__is_active: true
            })
            return response.data.results || response.data
        } catch (error) {
            console.error(error)
            toast.error('Erro ao buscar professores')
            return []
        }
    }, [])

    // ... (rest of effects) ...

    // Atualiza professores
    const updateProfessores = useCallback(async (disciplinaId, novosProfessoresIds) => {
        const vinculo = disciplinasVinculadas[disciplinaId]
        if (!vinculo) return

        const anteriores = vinculo.professores || []
        // ... (diff logic same as before) ...
        const anterioresIds = anteriores.map(p => p.id)

        const adicionados = novosProfessoresIds.filter(id => !anterioresIds.includes(id))
        const removidos = anteriores.filter(p => !novosProfessoresIds.includes(p.id))

        if (adicionados.length === 0 && removidos.length === 0) return

        setSalvandoProfessores(disciplinaId)

        try {
            // Remove
            for (const prof of removidos) {
                if (prof.atribuicao_id) {
                    await coreAPI.atribuicoes.delete(prof.atribuicao_id)
                }
            }

            // Adiciona
            for (const profId of adicionados) {
                await coreAPI.atribuicoes.create({
                    professor_id: profId,
                    disciplina_turma_id: vinculo.id,
                })
            }

            toast.success('Professores atualizados!')
            await reloadSilent()
        } catch (error) {
            const msg = error.response?.data?.non_field_errors?.[0] || 'Erro ao atualizar professores'
            toast.error(msg)
            await reloadSilent()
        } finally {
            setSalvandoProfessores(null)
        }
    }, [disciplinasVinculadas, reloadSilent])

    // ... (rest) ...

    return {
        // Estado
        todasDisciplinas,
        disciplinasVinculadas,
        aulasSemanais,
        loading,
        saving,
        salvandoProfessores,
        searchProfessores, // Exported

        // Paginação
        page,
        setPage,
        totalPages,
        totalCount,
        pageSize,

        // Dados computados
        totalAulasSemanais,
        disciplinasPorArea,

        // Handlers
        isDisciplinaSelecionada,
        toggleDisciplina,
        updateAulasSemanaisInput,
        saveAulasSemanais,
        updateProfessores,
        changeTipoProfessor,
        reloadDisciplinas: loadDisciplinas,
    }
}

export default useDisciplinasTurma
