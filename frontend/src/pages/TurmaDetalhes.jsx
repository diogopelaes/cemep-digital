import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Button, Select, Loading, Badge } from '../components/ui'
import { 
  HiArrowLeft, HiPencil, HiTrash, HiPlus, HiBookOpen, 
  HiUserGroup, HiAcademicCap, HiCheck, HiX 
} from 'react-icons/hi'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function TurmaDetalhes() {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [loading, setLoading] = useState(true)
  const [turma, setTurma] = useState(null)
  const [activeTab, setActiveTab] = useState('disciplinas')
  
  // Disciplinas
  const [todasDisciplinas, setTodasDisciplinas] = useState([]) // Todas as disciplinas do sistema
  const [disciplinasVinculadas, setDisciplinasVinculadas] = useState({}) // { disciplina_id: { id: vinculo_id, aulas_semanais: '' } }
  const [aulasSemanais, setAulasSemanais] = useState({}) // { disciplina_id: '4' }
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false)
  const [savingDisciplinas, setSavingDisciplinas] = useState(false)
  
  // Professores
  const [professores, setProfessores] = useState([])
  const [professoresDisponiveis, setProfessoresDisponiveis] = useState([])
  const [loadingProfessores, setLoadingProfessores] = useState(false)
  const [atribuindo, setAtribuindo] = useState(null) // ID da disciplina_turma sendo atribuída
  const [professorSelecionado, setProfessorSelecionado] = useState('')
  
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    loadTurma()
  }, [id])

  useEffect(() => {
    if (turma) {
      if (activeTab === 'disciplinas') {
        loadDisciplinas()
      } else if (activeTab === 'professores') {
        loadProfessores()
      }
    }
  }, [turma, activeTab])

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

  // === DISCIPLINAS ===
  const loadDisciplinas = async () => {
    setLoadingDisciplinas(true)
    try {
      const [vinculadasRes, todasRes] = await Promise.all([
        coreAPI.disciplinasTurma.list({ turma: id }),
        coreAPI.disciplinas.list(),
      ])
      const vinculadas = vinculadasRes.data.results || vinculadasRes.data
      const todas = todasRes.data.results || todasRes.data
      
      setTodasDisciplinas(todas)
      
      // Mapeia disciplinas vinculadas
      const vinculadasMap = {}
      const aulasMap = {}
      vinculadas.forEach(v => {
        vinculadasMap[v.disciplina.id] = { id: v.id, aulas_semanais: v.aulas_semanais }
        aulasMap[v.disciplina.id] = v.aulas_semanais?.toString() || ''
      })
      setDisciplinasVinculadas(vinculadasMap)
      setAulasSemanais(aulasMap)
    } catch (error) {
      toast.error('Erro ao carregar disciplinas')
    }
    setLoadingDisciplinas(false)
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

  // === PROFESSORES ===
  const loadProfessores = async () => {
    setLoadingProfessores(true)
    try {
      const [atribuicoesRes, funcionariosRes, disciplinasTurmaRes] = await Promise.all([
        coreAPI.atribuicoes.list({ turma: id }),
        coreAPI.funcionarios.list({ 'usuario__tipo_usuario': 'PROFESSOR', ativo: true }),
        coreAPI.disciplinasTurma.list({ turma: id }),
      ])
      
      const atribuicoes = atribuicoesRes.data.results || atribuicoesRes.data
      const funcionarios = funcionariosRes.data.results || funcionariosRes.data
      const disciplinasTurma = disciplinasTurmaRes.data.results || disciplinasTurmaRes.data
      
      // Mapeia disciplinas com seus professores
      const disciplinasComProfessores = disciplinasTurma.map(dt => {
        const atribuicao = atribuicoes.find(a => a.disciplina_turma?.id === dt.id)
        return {
          ...dt,
          professor: atribuicao?.professor || null,
          atribuicao_id: atribuicao?.id || null,
        }
      })
      
      setProfessores(disciplinasComProfessores)
      setProfessoresDisponiveis(funcionarios)
    } catch (error) {
      toast.error('Erro ao carregar professores')
    }
    setLoadingProfessores(false)
  }

  const handleAtribuirProfessor = async (disciplinaTurmaId) => {
    if (!professorSelecionado) {
      toast.error('Selecione um professor')
      return
    }

    try {
      // Verifica se já existe uma atribuição
      const disciplina = professores.find(p => p.id === disciplinaTurmaId)
      
      if (disciplina?.atribuicao_id) {
        // Atualiza atribuição existente
        await coreAPI.atribuicoes.update(disciplina.atribuicao_id, {
          professor_id: parseInt(professorSelecionado),
          disciplina_turma_id: disciplinaTurmaId,
        })
      } else {
        // Cria nova atribuição
        await coreAPI.atribuicoes.create({
          professor_id: parseInt(professorSelecionado),
          disciplina_turma_id: disciplinaTurmaId,
        })
      }
      
      toast.success('Professor atribuído com sucesso!')
      setAtribuindo(null)
      setProfessorSelecionado('')
      loadProfessores()
    } catch (error) {
      const msg = error.response?.data?.non_field_errors?.[0] || 'Erro ao atribuir professor'
      toast.error(msg)
    }
  }

  const handleRemoverAtribuicao = async (atribuicaoId) => {
    try {
      await coreAPI.atribuicoes.delete(atribuicaoId)
      toast.success('Atribuição removida!')
      loadProfessores()
    } catch (error) {
      toast.error('Erro ao remover atribuição')
    }
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
                {turma.nome_completo || `${turma.numero}º ${turma.nomenclatura === 'SERIE' ? 'Série' : turma.nomenclatura === 'ANO' ? 'Ano' : 'Módulo'} ${turma.letra}`}
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
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'disciplinas'
              ? 'text-primary-600 border-primary-500'
              : 'text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <HiBookOpen className="h-5 w-5" />
          Disciplinas
          <Badge variant="primary">{Object.keys(disciplinasVinculadas).length}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('professores')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'professores'
              ? 'text-primary-600 border-primary-500'
              : 'text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <HiAcademicCap className="h-5 w-5" />
          Professores
        </button>
        <button
          onClick={() => setActiveTab('estudantes')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'estudantes'
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
            <div className="text-right">
              <p className="text-sm text-slate-500">Total de aulas semanais</p>
              <p className="text-2xl font-bold text-primary-600">{totalAulasSemanais}</p>
            </div>
          </div>

          {loadingDisciplinas ? (
            <div className="flex justify-center py-8">
              <Loading size="md" />
            </div>
          ) : todasDisciplinas.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(disciplinasPorArea).map(([area, disciplinasArea]) => (
                <div key={area}>
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    {area}
                  </h3>
                  <div className="space-y-2">
                    {disciplinasArea.map((disciplina) => {
                      const selecionada = isDisciplinaSelecionada(disciplina.id)
                      return (
                        <div 
                          key={disciplina.id}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                            selecionada 
                              ? 'border-primary-500 bg-primary-500/5' 
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
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
                              onKeyDown={(e) => {
                                const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                                if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                                  e.preventDefault()
                                }
                              }}
                              disabled={!selecionada && !aulasSemanais[disciplina.id]}
                              className={`w-16 px-3 py-2 text-center rounded-lg border transition-all ${
                                selecionada
                                  ? 'border-primary-300 dark:border-primary-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                                  : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
                              } text-slate-800 dark:text-white`}
                              inputMode="numeric"
                            />
                            <span className="text-sm text-slate-500 w-12">aulas</span>
                          </div>
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
          )}
        </Card>
      )}

      {activeTab === 'professores' && (
        <Card hover={false}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              Atribuição de Professores
            </h2>
            <p className="text-sm text-slate-500">
              Defina o professor responsável por cada disciplina
            </p>
          </div>

          {loadingProfessores ? (
            <div className="flex justify-center py-8">
              <Loading size="md" />
            </div>
          ) : professores.length > 0 ? (
            <div className="space-y-3">
              {professores.map((dt) => (
                <div 
                  key={dt.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center">
                      <HiBookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-white">
                        {dt.disciplina?.nome}
                      </p>
                      <p className="text-sm text-slate-500">
                        {dt.aulas_semanais} aulas/sem
                      </p>
                    </div>
                  </div>
                  
                  {atribuindo === dt.id ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={professorSelecionado}
                        onChange={(e) => setProfessorSelecionado(e.target.value)}
                        placeholder="Selecione..."
                        options={professoresDisponiveis.map(p => ({
                          value: p.id,
                          label: p.usuario?.first_name || p.nome_completo
                        }))}
                        className="w-48"
                      />
                      <button
                        onClick={() => handleAtribuirProfessor(dt.id)}
                        className="p-2 rounded-lg bg-success-500/10 hover:bg-success-500/20 text-success-600 transition-colors"
                      >
                        <HiCheck className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => { setAtribuindo(null); setProfessorSelecionado(''); }}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        <HiX className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {dt.professor ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center">
                              <HiAcademicCap className="h-4 w-4 text-primary-600" />
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {dt.professor.usuario?.first_name || dt.professor.nome_completo}
                            </span>
                          </div>
                          <button
                            onClick={() => { setAtribuindo(dt.id); setProfessorSelecionado(dt.professor.id); }}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-primary-600 transition-colors"
                            title="Alterar professor"
                          >
                            <HiPencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemoverAtribuicao(dt.atribuicao_id)}
                            className="p-2 rounded-lg hover:bg-danger-500/10 text-danger-600 transition-colors"
                            title="Remover atribuição"
                          >
                            <HiTrash className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setAtribuindo(dt.id)}
                        >
                          Atribuir Professor
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <HiAcademicCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Adicione disciplinas à turma primeiro</p>
              <Button 
                variant="ghost" 
                className="mt-4"
                onClick={() => setActiveTab('disciplinas')}
              >
                Ir para Disciplinas
              </Button>
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
    </div>
  )
}

