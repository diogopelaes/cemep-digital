import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Button, Loading, Badge, MultiCombobox, Pagination } from '../components/ui'
import {
  HiArrowLeft, HiPencil, HiTrash, HiPlus, HiBookOpen,
  HiUserGroup, HiAcademicCap, HiStar, HiUpload, HiX
} from 'react-icons/hi'
import BulkUploadModal from '../components/modals/BulkUploadModal'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function TurmaDetalhes() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [turma, setTurma] = useState(null)
  const [activeTab, setActiveTab] = useState('disciplinas')
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Disciplinas
  const [todasDisciplinas, setTodasDisciplinas] = useState([]) // Todas as disciplinas do sistema
  const [disciplinasVinculadas, setDisciplinasVinculadas] = useState({}) // { disciplina_id: { id: vinculo_id, aulas_semanais: '' } }
  const [aulasSemanais, setAulasSemanais] = useState({}) // { disciplina_id: '4' }
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false)
  const [savingDisciplinas, setSavingDisciplinas] = useState(false)

  // Paginação de Disciplinas
  const [disciplinasPage, setDisciplinasPage] = useState(1)
  const [disciplinasTotalPages, setDisciplinasTotalPages] = useState(1)
  const [disciplinasTotalCount, setDisciplinasTotalCount] = useState(0)
  const disciplinasPageSize = 20

  // Professores (para atribuição inline)
  const [professoresDisponiveis, setProfessoresDisponiveis] = useState([])
  const [salvandoProfessores, setSalvandoProfessores] = useState(null) // ID da disciplina sendo salva

  // Representantes
  const [todosRepresentantes, setTodosRepresentantes] = useState([]) // Todos os professores disponíveis
  const [representantesSelecionados, setRepresentantesSelecionados] = useState([]) // IDs dos selecionados
  const [loadingRepresentantes, setLoadingRepresentantes] = useState(false)
  const [savingRepresentantes, setSavingRepresentantes] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    loadTurma()
  }, [id])

  useEffect(() => {
    if (turma) {
      if (activeTab === 'disciplinas') {
        loadDisciplinas()
      } else if (activeTab === 'representantes') {
        loadRepresentantes()
      }
    }
  }, [turma, activeTab, disciplinasPage])

  const loadTurma = async () => {
    try {
      const response = await coreAPI.turmas.get(id)
      setTurma(response.data)
    } catch (error) {
      toast.error('Erro ao carregar turma')
      navigate('/turmas')
    }
    setLoading(false)
  }

  // === DISCIPLINAS E ATRIBUIÇÕES ===
  const loadDisciplinas = async () => {
    setLoadingDisciplinas(true)
    try {
      const [vinculadasRes, todasRes, atribuicoesRes, funcionariosRes] = await Promise.all([
        coreAPI.disciplinasTurma.list({ turma: id, page_size: 1000 }), // Carrega todas as vinculadas
        coreAPI.disciplinas.list({ is_active: 'true', page: disciplinasPage }),
        coreAPI.atribuicoes.list({ turma: id, page_size: 1000 }),
        coreAPI.funcionarios.list({ 'usuario__tipo_usuario': 'PROFESSOR', ativo: true, page_size: 1000 }),
      ])
      const vinculadas = vinculadasRes.data.results || vinculadasRes.data
      const todas = todasRes.data.results || todasRes.data
      const atribuicoes = atribuicoesRes.data.results || atribuicoesRes.data
      const funcionarios = funcionariosRes.data.results || funcionariosRes.data

      setTodasDisciplinas(todas)
      if (todasRes.data.count) {
        setDisciplinasTotalCount(todasRes.data.count)
        setDisciplinasTotalPages(Math.ceil(todasRes.data.count / disciplinasPageSize))
      }
      setProfessoresDisponiveis(funcionarios)

      // Mapeia disciplinas vinculadas com atribuições (múltiplos professores)
      const vinculadasMap = {}
      const aulasMap = {}
      vinculadas.forEach(v => {
        // Encontra todas as atribuições para esta disciplina-turma
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
      toast.error('Erro ao carregar disciplinas')
    }
    setLoadingDisciplinas(false)
  }

  // Reload silencioso para evitar desmontar o modal
  const reloadDisciplinasSilent = async () => {
    try {
      const [vinculadasRes, todasRes, atribuicoesRes, funcionariosRes] = await Promise.all([
        coreAPI.disciplinasTurma.list({ turma: id, page_size: 1000 }),
        coreAPI.disciplinas.list({ is_active: 'true', page: disciplinasPage }),
        coreAPI.atribuicoes.list({ turma: id, page_size: 1000 }),
        coreAPI.funcionarios.list({ 'usuario__tipo_usuario': 'PROFESSOR', ativo: true, page_size: 1000 }),
      ])
      const vinculadas = vinculadasRes.data.results || vinculadasRes.data
      const todas = todasRes.data.results || todasRes.data
      const atribuicoes = atribuicoesRes.data.results || atribuicoesRes.data
      const funcionarios = funcionariosRes.data.results || funcionariosRes.data

      setTodasDisciplinas(todas)
      if (todasRes.data.count) {
        setDisciplinasTotalCount(todasRes.data.count)
        setDisciplinasTotalPages(Math.ceil(todasRes.data.count / disciplinasPageSize))
      }
      setProfessoresDisponiveis(funcionarios)

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
      console.error(error)
    }
  }

  const isDisciplinaSelecionada = (disciplinaId) => {
    return !!disciplinasVinculadas[disciplinaId]
  }

  const handleToggleDisciplina = async (disciplina) => {
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
      // Adicionar vínculo com aulas semanais padrão
      const aulas = aulasSemanais[disciplinaId] || '4'

      if (!aulas || parseInt(aulas) <= 0) {
        toast.error('Informe as aulas semanais antes de selecionar')
        return
      }

      try {
        const response = await coreAPI.disciplinasTurma.create({
          disciplina_id: disciplinaId,
          turma_id: parseInt(id),
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
  }

  const handleAulasSemanaisChange = (disciplinaId, valor) => {
    const val = valor.replace(/\D/g, '').slice(0, 2)
    setAulasSemanais({ ...aulasSemanais, [disciplinaId]: val })
  }

  const handleAulasSemanaisBlur = async (disciplinaId) => {
    // Se a disciplina está vinculada, atualiza as aulas semanais
    if (isDisciplinaSelecionada(disciplinaId)) {
      const novasAulas = parseInt(aulasSemanais[disciplinaId])
      const aulasAtuais = disciplinasVinculadas[disciplinaId].aulas_semanais

      if (novasAulas && novasAulas !== aulasAtuais) {
        try {
          await coreAPI.disciplinasTurma.update(disciplinasVinculadas[disciplinaId].id, {
            aulas_semanais: novasAulas,
          })

          setDisciplinasVinculadas({
            ...disciplinasVinculadas,
            [disciplinaId]: { ...disciplinasVinculadas[disciplinaId], aulas_semanais: novasAulas }
          })

          toast.success('Aulas semanais atualizadas')
        } catch (error) {
          toast.error('Erro ao atualizar aulas semanais')
        }
      }
    }
  }

  // Calcula total de aulas semanais
  const totalAulasSemanais = Object.values(disciplinasVinculadas).reduce(
    (acc, v) => acc + (v.aulas_semanais || 0), 0
  )

  // === ATRIBUIÇÃO DE PROFESSORES (MÚLTIPLOS) ===
  const handleProfessoresChange = async (disciplinaId, novosProfessoresIds) => {
    const vinculo = disciplinasVinculadas[disciplinaId]
    if (!vinculo) return

    const anteriores = vinculo.professores || []
    const anterioresIds = anteriores.map(p => p.id)

    // Identifica adições e remoções
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

      await reloadDisciplinasSilent()
    } catch (error) {
      const msg = error.response?.data?.non_field_errors?.[0] || 'Erro ao atualizar professores'
      toast.error(msg)
      await reloadDisciplinasSilent() // Recarrega para sincronizar
    }
    setSalvandoProfessores(null)
  }

  // Altera o tipo do professor (Titular/Substituto)
  const handleTipoChange = async (disciplinaId, professorId, novoTipo) => {
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
      await reloadDisciplinasSilent()
    } catch (error) {
      toast.error('Erro ao alterar tipo')
    }
    setSalvandoProfessores(null)
  }

  // === REPRESENTANTES ===
  const loadRepresentantes = async () => {
    setLoadingRepresentantes(true)
    try {
      // Carrega todos os professores disponíveis
      const response = await coreAPI.funcionarios.list({ usuario__tipo_usuario: 'PROFESSOR', page_size: 100 })
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
    }
    setLoadingRepresentantes(false)
  }

  const handleRepresentantesChange = async (novosRepresentantes) => {
    const anteriores = [...representantesSelecionados]
    setRepresentantesSelecionados(novosRepresentantes)
    setSavingRepresentantes(true)

    try {
      await coreAPI.turmas.update(id, {
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
      await loadTurma()
    } catch (error) {
      // Reverte em caso de erro
      setRepresentantesSelecionados(anteriores)
      toast.error('Erro ao atualizar representantes')
    }
    setSavingRepresentantes(false)
  }

  const handleRemoveRepresentante = async (repId) => {
    const novosRepresentantes = representantesSelecionados.filter(id => id !== repId)
    await handleRepresentantesChange(novosRepresentantes)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    )
  }

  if (!turma) {
    return null
  }

  // Agrupa disciplinas por área de conhecimento
  const disciplinasPorArea = todasDisciplinas.reduce((acc, d) => {
    const area = d.area_conhecimento_display || 'Sem área'
    if (!acc[area]) acc[area] = []
    acc[area].push(d)
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/turmas')}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <HiArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">
                {turma.numero}{turma.letra}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                {turma.nome_completo || `${turma.numero}º ${turma.nomenclatura === 'SERIE' ? 'Série' : (turma.nomenclatura === 'ANO' ? 'Ano' : 'Módulo')} ${turma.letra}`}
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                {turma.curso?.nome} • {turma.ano_letivo}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="secondary"
          icon={HiPencil}
          onClick={() => navigate(`/turmas/${id}/editar`)}
        >
          Editar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('disciplinas')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${activeTab === 'disciplinas'
            ? 'text-primary-600 border-primary-500'
            : 'text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          <HiBookOpen className="h-5 w-5" />
          Disciplinas
          <Badge variant="primary">{Object.keys(disciplinasVinculadas).length}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('representantes')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${activeTab === 'representantes'
            ? 'text-primary-600 border-primary-500'
            : 'text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          <HiStar className="h-5 w-5" />
          Representantes
          <Badge variant="primary">{turma?.professores_representantes_details?.length || 0}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('estudantes')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${activeTab === 'estudantes'
            ? 'text-primary-600 border-primary-500'
            : 'text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          <HiUserGroup className="h-5 w-5" />
          Estudantes
          <Badge>0</Badge>
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      {activeTab === 'disciplinas' && (
        <Card hover={false}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                Disciplinas da Turma
              </h2>
              <p className="text-sm text-slate-500">
                Selecione as disciplinas e informe as aulas semanais
              </p>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-sm text-slate-500">Total de aulas semanais</p>
                <p className="text-2xl font-bold text-primary-600">{totalAulasSemanais}</p>
              </div>
              <Button variant="secondary" icon={HiUpload} onClick={() => setShowUploadModal(true)}>
                Importar
              </Button>
            </div>
          </div>

          {loadingDisciplinas ? (
            <div className="flex justify-center py-8">
              <Loading size="md" />
            </div>
          ) : (todasDisciplinas.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(disciplinasPorArea).map(([area, disciplinasArea]) => (
                <div key={area}>
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    {area}
                  </h3>
                  <div className="space-y-2">
                    {disciplinasArea.map((disciplina) => {
                      const selecionada = isDisciplinaSelecionada(disciplina.id)
                      const vinculo = disciplinasVinculadas[disciplina.id]
                      return (
                        <div
                          key={disciplina.id}
                          className={`p-4 rounded-xl border-2 transition-all ${selecionada
                            ? 'border-primary-500 bg-primary-500/5'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                          <div className="flex items-center gap-4">
                            {/* Checkbox */}
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selecionada}
                                onChange={() => handleToggleDisciplina(disciplina)}
                                className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                              />
                            </label>

                            {/* Info da Disciplina */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${selecionada ? 'text-primary-700 dark:text-primary-400' : 'text-slate-800 dark:text-white'}`}>
                                  {disciplina.nome}
                                </span>
                                <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                  {disciplina.sigla}
                                </span>
                              </div>
                            </div>

                            {/* Input Aulas Semanais */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="4"
                                maxLength={2}
                                value={aulasSemanais[disciplina.id] || ''}
                                onChange={(e) => handleAulasSemanaisChange(disciplina.id, e.target.value)}
                                onBlur={() => handleAulasSemanaisBlur(disciplina.id)}
                                onClick={(e) => e.target.select()}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                  const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter']
                                  if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                                    e.preventDefault()
                                    return
                                  }

                                  // Tab ou Enter: salva e vai para o próximo input
                                  if (e.key === 'Tab' || e.key === 'Enter') {
                                    e.preventDefault()

                                    // Encontra apenas inputs ATIVOS (não desabilitados)
                                    const allInputs = document.querySelectorAll('input[data-aulas-input]:not(:disabled)')
                                    const currentIndex = Array.from(allInputs).findIndex(input => input === e.target)
                                    const nextInput = allInputs[currentIndex + 1]
                                    const nextDisciplinaId = nextInput?.getAttribute('data-aulas-input')

                                    // Salva primeiro
                                    handleAulasSemanaisBlur(disciplina.id)

                                    // Depois foca no próximo (com delay para esperar possível re-render)
                                    if (nextDisciplinaId) {
                                      setTimeout(() => {
                                        const targetInput = document.querySelector(`input[data-aulas-input="${nextDisciplinaId}"]:not(:disabled)`)
                                        if (targetInput) {
                                          targetInput.focus()
                                          targetInput.select()
                                        }
                                      }, 50)
                                    }
                                  }
                                }}
                                disabled={!selecionada && !aulasSemanais[disciplina.id]}
                                className={`w-16 px-3 py-2 text-center rounded-lg border transition-all ${selecionada
                                  ? 'border-primary-300 dark:border-primary-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                                  : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
                                  } text-slate-800 dark:text-white`}
                                inputMode="numeric"
                                data-aulas-input={disciplina.id}
                              />
                              <span className="text-sm text-slate-500 w-12">aulas</span>
                            </div>
                          </div>

                          {/* Professor Assignment - Only for selected disciplines */}
                          {selecionada && (
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-500 flex items-center gap-2 flex-shrink-0">
                                  <HiAcademicCap className="h-4 w-4" />
                                  Professores:
                                  {salvandoProfessores === disciplina.id && (
                                    <span className="text-primary-600 text-xs">(salvando...)</span>
                                  )}
                                </span>
                                <div className="flex-1">
                                  <MultiCombobox
                                    value={vinculo.professores?.map(p => p.id) || []}
                                    onChange={(ids) => handleProfessoresChange(disciplina.id, ids)}
                                    options={professoresDisponiveis.map(p => ({
                                      value: p.id,
                                      label: p.nome_completo,
                                      subLabel: p.apelido
                                    }))}
                                    placeholder="Pesquise por nome ou apelido..."
                                    disabled={salvandoProfessores === disciplina.id}
                                  />
                                </div>
                              </div>
                              {/* Lista compacta de professores selecionados com tipo */}
                              {vinculo.professores?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {vinculo.professores.map(prof => (
                                    <div
                                      key={prof.id}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all ${prof.tipo === 'TITULAR'
                                        ? 'bg-primary-500/10 text-primary-700 dark:text-primary-300'
                                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                        }`}
                                    >
                                      <HiAcademicCap className="h-3.5 w-3.5" />
                                      <span className="font-medium">
                                        {prof.apelido || prof.usuario?.first_name || prof.nome_completo}
                                      </span>
                                      <button
                                        onClick={() => handleTipoChange(
                                          disciplina.id,
                                          prof.id,
                                          prof.tipo === 'TITULAR' ? 'SUBSTITUTO' : 'TITULAR'
                                        )}
                                        className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${prof.tipo === 'TITULAR'
                                          ? 'bg-primary-600/20 hover:bg-primary-600/30 text-primary-800 dark:text-primary-200'
                                          : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-800 dark:text-amber-200'
                                          }`}
                                        title="Clique para alternar entre Titular e Substituto"
                                        disabled={salvandoProfessores === disciplina.id}
                                      >
                                        {prof.tipo === 'TITULAR' ? 'T' : 'S'}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <HiBookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma disciplina cadastrada no sistema</p>
              <Button
                variant="ghost"
                icon={HiPlus}
                className="mt-4"
                onClick={() => navigate('/disciplinas/novo')}
              >
                Cadastrar disciplinas
              </Button>
            </div>
          ))}

          {/* Paginação */}
          {todasDisciplinas.length > 0 && (
            <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
              <Pagination
                currentPage={disciplinasPage}
                totalPages={disciplinasTotalPages}
                totalItems={disciplinasTotalCount}
                pageSize={disciplinasPageSize}
                onPageChange={(page) => {
                  setDisciplinasPage(page)
                  // O useEffect do activeTab ou loadDisciplinas deve ser chamado,
                  // mas como loadDisciplinas depende do state disciplinasPage, 
                  // precisamos garantir que ele seja chamado quando a página mudar.
                  // Melhor adicionar um useEffect específico para disciplinasPage.
                }}
              />
            </div>
          )}
        </Card>
      )}

      {activeTab === 'representantes' && (
        <Card hover={false}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              Professores Representantes
            </h2>
            <p className="text-sm text-slate-500">
              Selecione os professores que representam esta turma {savingRepresentantes && <span className="text-primary-600">(salvando...)</span>}
            </p>
          </div>

          {loadingRepresentantes ? (
            <div className="flex justify-center py-8">
              <Loading size="md" />
            </div>
          ) : (
            <div className="space-y-6">
              <MultiCombobox
                label="Selecionar Representantes"
                value={representantesSelecionados}
                onChange={handleRepresentantesChange}
                options={todosRepresentantes.map(p => ({
                  value: p.id,
                  label: p.nome_completo,
                  subLabel: p.apelido
                }))}
                placeholder="Pesquise por nome ou apelido..."
              />

              {/* Lista dos representantes selecionados */}
              {representantesSelecionados.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                    Representantes Selecionados ({representantesSelecionados.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {representantesSelecionados.map(repId => {
                      const professor = todosRepresentantes.find(p => p.id === repId)
                      if (!professor) return null
                      return (
                        <div
                          key={repId}
                          className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                            <HiStar className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 dark:text-white truncate">
                              {professor.nome_completo}
                            </p>
                            {professor.apelido && (
                              <p className="text-sm text-slate-500 truncate">
                                {professor.apelido}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveRepresentante(repId)}
                            className="p-2 rounded-lg hover:bg-danger-500/10 text-danger-600 transition-colors flex-shrink-0"
                            title="Remover"
                            disabled={savingRepresentantes}
                          >
                            <HiX className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {representantesSelecionados.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <HiStar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum representante selecionado</p>
                  <p className="text-sm mt-1">Use o campo acima para pesquisar e selecionar professores</p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'estudantes' && (
        <Card hover={false}>
          <div className="text-center py-12 text-slate-500">
            <HiUserGroup className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Estudantes</p>
            <p className="text-sm mt-2">
              Esta funcionalidade será implementada na Fase 3
            </p>
          </div>
        </Card>
      )}

      {/* Modal de Importação */}
      <BulkUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={async (formData) => {
          // Adiciona o ID da turma ao FormData
          formData.append('turma_id', id)
          const response = await coreAPI.disciplinasTurma.importarArquivo(formData)
          // Atualiza lista sem loading visual
          reloadDisciplinasSilent()
          return response
        }}
        entityName="Disciplinas da Turma"
        templateHeaders={['SIGLA_DISCIPLINA', 'AULAS_SEMANAIS']}
        onDownloadTemplate={async () => {
          try {
            const response = await coreAPI.disciplinasTurma.downloadModelo()
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'modelo_disciplinas_turma.xlsx')
            document.body.appendChild(link)
            link.click()
            link.remove()
          } catch (error) {
            console.error(error)
            toast.error('Erro ao baixar o modelo.')
          }
        }}
        instructions={
          <ul className="list-disc list-inside space-y-1 ml-1 text-slate-600 dark:text-slate-300">
            <li>O arquivo deve conter a coluna obrigatória: <strong>SIGLA_DISCIPLINA</strong>.</li>
            <li>Opcionalmente, informe <strong>AULAS_SEMANAIS</strong> (padrão é 4).</li>
            <li>A disciplina será buscada pela Sigla. Se não encontrar, será listado como erro.</li>
          </ul>
        }
      />
    </div >
  )
}
