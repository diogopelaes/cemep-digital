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
            const [vinculadasRes, todasRes, atribuicoesRes, funcionariosRes] = await Promise.all([
                coreAPI.disciplinasTurma.list({ turma: turmaId, page_size: 1000 }),
                coreAPI.disciplinas.list({ is_active: 'true', page }),
                coreAPI.atribuicoes.list({ turma: turmaId, page_size: 1000 }),
                coreAPI.funcionarios.list({ 'usuario__tipo_usuario': 'PROFESSOR', ativo: true, page_size: 1000 }),
            ])

            const vinculadas = vinculadasRes.data.results || vinculadasRes.data
            const todas = todasRes.data.results || todasRes.data
            const atribuicoes = atribuicoesRes.data.results || atribuicoesRes.data
            const funcionarios = funcionariosRes.data.results || funcionariosRes.data

            setTodasDisciplinas(todas)

            if (todasRes.data.count) {
                setTotalCount(todasRes.data.count)
                setTotalPages(Math.ceil(todasRes.data.count / pageSize))
            }

            setProfessoresDisponiveis(funcionarios)

            // Mapeia disciplinas vinculadas com atribuições
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

    // Carrega quando turma ou página mudar
    useEffect(() => {
        if (turma && isActive) {
            loadDisciplinas()
        }
    }, [turma, isActive, page])

    // Recarregar silenciosamente
    const reloadSilent = useCallback(() => {
        return loadDisciplinas(true)
    }, [loadDisciplinas])

    // Verifica se disciplina está selecionada
    const isDisciplinaSelecionada = useCallback((disciplinaId) => {
        return !!disciplinasVinculadas[disciplinaId]
    }, [disciplinasVinculadas])

    // Toggle disciplina (adicionar/remover)
    const toggleDisciplina = useCallback(async (disciplina) => {
        const disciplinaId = disciplina.id

        if (isDisciplinaSelecionada(disciplinaId)) {
            // Remover vínculo
            try {
                await coreAPI.disciplinasTurma.delete(disciplinasVinculadas[disciplinaId].id)

                const novasVinculadas = { ...disciplinasVinculadas }
                delete novasVinculadas[disciplinaId]
                setDisciplinasVinculadas(novasVinculadas)

                const novasAulas = { ...aulasSemanais }
                delete novasAulas[disciplinaId]
                setAulasSemanais(novasAulas)

                toast.success(`${disciplina.nome} removida`)
            } catch (error) {
                toast.error('Erro ao remover disciplina')
            }
        } else {
            // Adicionar vínculo
            const aulas = aulasSemanais[disciplinaId] || '4'

            if (!aulas || parseInt(aulas) <= 0) {
                toast.error('Informe as aulas semanais antes de selecionar')
                return
            }

            try {
                const response = await coreAPI.disciplinasTurma.create({
                    disciplina_id: disciplinaId,
                    turma_id: turmaId,
                    aulas_semanais: parseInt(aulas),
                })

                setDisciplinasVinculadas({
                    ...disciplinasVinculadas,
                    [disciplinaId]: { id: response.data.id, aulas_semanais: parseInt(aulas) }
                })
                setAulasSemanais({ ...aulasSemanais, [disciplinaId]: aulas })

                toast.success(`${disciplina.nome} adicionada`)
            } catch (error) {
                toast.error('Erro ao adicionar disciplina')
            }
        }
    }, [turmaId, disciplinasVinculadas, aulasSemanais, isDisciplinaSelecionada])

    // Atualiza aulas semanais (input)
    const updateAulasSemanaisInput = useCallback((disciplinaId, valor) => {
        const val = valor.replace(/\D/g, '').slice(0, 2)
        setAulasSemanais(prev => ({ ...prev, [disciplinaId]: val }))
    }, [])

    // Salva aulas semanais (blur)
    const saveAulasSemanais = useCallback(async (disciplinaId) => {
        if (!isDisciplinaSelecionada(disciplinaId)) return

        const novasAulas = parseInt(aulasSemanais[disciplinaId])
        const aulasAtuais = disciplinasVinculadas[disciplinaId].aulas_semanais

        if (novasAulas && novasAulas !== aulasAtuais) {
            try {
                await coreAPI.disciplinasTurma.update(disciplinasVinculadas[disciplinaId].id, {
                    aulas_semanais: novasAulas,
                })

                setDisciplinasVinculadas(prev => ({
                    ...prev,
                    [disciplinaId]: { ...prev[disciplinaId], aulas_semanais: novasAulas }
                }))

                toast.success('Aulas semanais atualizadas')
            } catch (error) {
                toast.error('Erro ao atualizar aulas semanais')
            }
        }
    }, [disciplinasVinculadas, aulasSemanais, isDisciplinaSelecionada])

    // Atualiza professores de uma disciplina
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
            // Remove atribuições
            for (const prof of removidos) {
                if (prof.atribuicao_id) {
                    await coreAPI.atribuicoes.delete(prof.atribuicao_id)
                }
            }

            // Adiciona novas atribuições
            for (const profId of adicionados) {
                await coreAPI.atribuicoes.create({
                    professor_id: profId,
                    disciplina_turma_id: vinculo.id,
                })
            }

            // Mensagem de sucesso
            if (adicionados.length > 0 && removidos.length > 0) {
                toast.success('Professores atualizados!')
            } else if (adicionados.length > 0) {
                const prof = professoresDisponiveis.find(p => p.id === adicionados[0])
                toast.success(`${prof?.apelido || prof?.nome_completo || 'Professor'} adicionado`)
            } else {
                toast.success('Professor removido')
            }

            await reloadSilent()
        } catch (error) {
            const msg = error.response?.data?.non_field_errors?.[0] || 'Erro ao atualizar professores'
            toast.error(msg)
            await reloadSilent()
        } finally {
            setSalvandoProfessores(null)
        }
    }, [disciplinasVinculadas, professoresDisponiveis, reloadSilent])

    // Altera tipo do professor
    const changeTipoProfessor = useCallback(async (disciplinaId, professorId, novoTipo) => {
        const vinculo = disciplinasVinculadas[disciplinaId]
        if (!vinculo) return

        const prof = vinculo.professores?.find(p => p.id === professorId)
        if (!prof?.atribuicao_id) return

        setSalvandoProfessores(disciplinaId)

        try {
            await coreAPI.atribuicoes.update(prof.atribuicao_id, {
                tipo: novoTipo
            })
            toast.success(`Tipo alterado para ${novoTipo === 'TITULAR' ? 'Titular' : 'Substituto'}`)
            await reloadSilent()
        } catch (error) {
            toast.error('Erro ao alterar tipo')
        } finally {
            setSalvandoProfessores(null)
        }
    }, [disciplinasVinculadas, reloadSilent])

    // Calcula total de aulas semanais
    const totalAulasSemanais = Object.values(disciplinasVinculadas).reduce(
        (acc, v) => acc + (v.aulas_semanais || 0), 0
    )

    // Agrupa disciplinas por área
    const disciplinasPorArea = todasDisciplinas.reduce((acc, d) => {
        const area = d.area_conhecimento_display || 'Sem área'
        if (!acc[area]) acc[area] = []
        acc[area].push(d)
        return acc
    }, {})

    return {
        // Estado
        todasDisciplinas,
        disciplinasVinculadas,
        aulasSemanais,
        loading,
        saving,
        professoresDisponiveis,
        salvandoProfessores,

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
