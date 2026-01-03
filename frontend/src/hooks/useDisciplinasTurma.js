import { useState, useEffect, useCallback, useMemo } from 'react'
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

    // Professores (Cache local para autocomplete)
    const [professoresDisponiveis, setProfessoresDisponiveis] = useState([])
    const [salvandoProfessores, setSalvandoProfessores] = useState(null)

    // Carrega disciplinas
    const loadDisciplinas = useCallback(async (silent = false) => {
        if (!turma || !isActive) return

        if (!silent) setLoading(true)

        try {
            const [vinculadasRes, todasRes, atribuicoesRes] = await Promise.all([
                coreAPI.disciplinasTurma.list({ turma: turmaId, page_size: 100 }),
                coreAPI.disciplinas.list({ is_active: 'true', page, page_size: pageSize }),
                coreAPI.atribuicoes.list({ turma: turmaId, page_size: 100 }),
            ])

            const vinculadas = vinculadasRes.data.results || vinculadasRes.data
            const todas = todasRes.data.results || todasRes.data
            const atribuicoes = atribuicoesRes.data.results || atribuicoesRes.data

            setTodasDisciplinas(todas)

            if (todasRes.data.count) {
                setTotalCount(todasRes.data.count)
                setTotalPages(Math.ceil(todasRes.data.count / pageSize))
            }

            // Mapeia disciplinas vinculadas e atribuições
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

    // Reload silencioso
    const reloadSilent = useCallback(() => loadDisciplinas(true), [loadDisciplinas])

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

    // Efeito de carga
    useEffect(() => {
        loadDisciplinas()
    }, [loadDisciplinas])


    // Handler: Selecionar/Deselecionar Disciplina
    const toggleDisciplina = useCallback(async (disciplina) => {
        const isSelected = !!disciplinasVinculadas[disciplina.id]
        setSaving(true)

        try {
            if (isSelected) {
                // Remove
                const vinculoId = disciplinasVinculadas[disciplina.id].id
                await coreAPI.disciplinasTurma.delete(vinculoId)
                toast.success('Disciplina removida da turma')
            } else {
                // Adiciona
                await coreAPI.disciplinasTurma.create({
                    turma_id: turmaId,
                    disciplina_id: disciplina.id,
                    aulas_semanais: 4 // Default
                })
                toast.success('Disciplina adicionada à turma')
            }
            await reloadSilent()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao atualizar disciplina')
        } finally {
            setSaving(false)
        }
    }, [disciplinasVinculadas, turmaId, reloadSilent])

    // Handler: Input Aulas Semanais
    const updateAulasSemanaisInput = useCallback((disciplinaId, valor) => {
        const apenasNumeros = valor.replace(/\D/g, '').slice(0, 2)
        setAulasSemanais(prev => ({ ...prev, [disciplinaId]: apenasNumeros }))
    }, [])

    // Handler: Salvar Aulas Semanais (Blur)
    const saveAulasSemanais = useCallback(async (disciplinaId) => {
        const vinculo = disciplinasVinculadas[disciplinaId]
        const valorAtual = aulasSemanais[disciplinaId]

        if (!vinculo || !valorAtual) return
        if (parseInt(valorAtual) === vinculo.aulas_semanais) return

        try {
            await coreAPI.disciplinasTurma.update(vinculo.id, {
                aulas_semanais: parseInt(valorAtual)
            })
            toast.success('Aulas semanais atualizadas', { duration: 2000 })
            await reloadSilent()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar aulas semanais')
        }
    }, [disciplinasVinculadas, aulasSemanais, reloadSilent])

    // Atualiza professores
    const updateProfessores = useCallback(async (disciplinaId, novosProfessoresIds) => {
        const vinculo = disciplinasVinculadas[disciplinaId]
        if (!vinculo) return

        const anteriores = vinculo.professores || []
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

    const changeTipoProfessor = useCallback(async (disciplinaId, professorId, novoTipo) => {
        const vinculo = disciplinasVinculadas[disciplinaId]
        if (!vinculo) return

        const professor = vinculo.professores.find(p => p.id === professorId)
        if (!professor) return

        setSalvandoProfessores(disciplinaId)
        try {
            await coreAPI.atribuicoes.update(professor.atribuicao_id, {
                tipo: novoTipo
            })
            toast.success(`Professor alterado para ${novoTipo === 'TITULAR' ? 'Titular' : 'Substituto'}`)
            await reloadSilent()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao alterar tipo do professor')
        } finally {
            setSalvandoProfessores(null)
        }
    }, [disciplinasVinculadas, reloadSilent])

    // Cálculos derivados
    const totalAulasSemanais = useMemo(() => {
        return Object.values(disciplinasVinculadas).reduce((acc, curr) => {
            return acc + (parseInt(curr.aulas_semanais) || 0)
        }, 0)
    }, [disciplinasVinculadas])

    const disciplinasPorArea = useMemo(() => {
        const grupos = {}
        const areaOrder = [
            'LINGUAGENS',
            'MATEMATICA',
            'CIENCIAS_NATUREZA',
            'CIENCIAS_HUMANAS',
            'ENSINO_RELIGIOSO',
            'PARTE_DIVERSIFICADA',
            'TECNICO'
        ]

        // Inicializa grupos
        areaOrder.forEach(area => grupos[area] = [])
        grupos['OUTROS'] = []

        todasDisciplinas.forEach(d => {
            const area = d.area_conhecimento || 'OUTROS'
            if (!grupos[area]) grupos[area] = []
            grupos[area].push(d)
        })

        // Remove grupos vazios e retorna objeto ordenado
        return Object.entries(grupos)
            .filter(([_, lista]) => lista.length > 0)
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

    }, [todasDisciplinas])

    return {
        // Estado
        todasDisciplinas,
        disciplinasVinculadas,
        aulasSemanais,
        loading,
        saving,
        salvandoProfessores,
        professoresDisponiveis, // Mantemos vazio ou cache local se necessário

        // Async Search Exported
        searchProfessores,

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
        isDisciplinaSelecionada: (id) => !!disciplinasVinculadas[id],
        toggleDisciplina,
        updateAulasSemanaisInput,
        saveAulasSemanais,
        updateProfessores,
        changeTipoProfessor,
        reloadDisciplinas: loadDisciplinas,
    }
}

export default useDisciplinasTurma
