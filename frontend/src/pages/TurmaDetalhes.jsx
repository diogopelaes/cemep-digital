import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loading } from '../components/ui'
import BulkUploadModal from '../components/modals/BulkUploadModal'

// Hooks
import { useTurma, useDisciplinasTurma, useRepresentantesTurma } from '../hooks'

// Componentes de domínio
import {
  TurmaHeader,
  TurmaTabs,
  TurmaDisciplinas,
  TurmaRepresentantes,
  TurmaEstudantes,
} from '../components/turmas'

/**
 * Página de detalhes da turma
 * 
 * Responsabilidades:
 * - Orquestra hooks e componentes
 * - Controla navegação entre tabs
 * - Não contém lógica de negócio pesada
 */
export default function TurmaDetalhes() {
  const navigate = useNavigate()
  const { id } = useParams()

  // Estados locais de UI
  const [activeTab, setActiveTab] = useState('disciplinas')
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Hook para dados da turma
  const { turma, loading, reloadTurma } = useTurma(id)

  // Hook para disciplinas (ativo apenas quando tab = 'disciplinas')
  const disciplinas = useDisciplinasTurma(id, turma, activeTab === 'disciplinas')

  // Hook para representantes (ativo apenas quando tab = 'representantes')
  const representantes = useRepresentantesTurma(
    id,
    turma,
    activeTab === 'representantes',
    reloadTurma
  )

  // Loading inicial
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

  // Contadores para as tabs
  const tabCounters = {
    disciplinas: Object.keys(disciplinas.disciplinasVinculadas).length,
    representantes: turma?.professores_representantes_details?.length || 0,
    estudantes: 0,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <TurmaHeader
        turma={turma}
        onBack={() => navigate('/turmas')}
        onEdit={() => navigate(`/turmas/${id}/editar`)}
      />

      {/* Tabs */}
      <TurmaTabs
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        counters={tabCounters}
      />

      {/* Conteúdo das Tabs */}
      {activeTab === 'disciplinas' && (
        <TurmaDisciplinas
          // Estado
          disciplinasPorArea={disciplinas.disciplinasPorArea}
          disciplinasVinculadas={disciplinas.disciplinasVinculadas}
          aulasSemanais={disciplinas.aulasSemanais}
          loading={disciplinas.loading}
          professoresDisponiveis={disciplinas.professoresDisponiveis}
          salvandoProfessores={disciplinas.salvandoProfessores}
          totalAulasSemanais={disciplinas.totalAulasSemanais}

          // Paginação
          page={disciplinas.page}
          totalPages={disciplinas.totalPages}
          totalCount={disciplinas.totalCount}
          pageSize={disciplinas.pageSize}
          onPageChange={disciplinas.setPage}

          // Handlers
          isDisciplinaSelecionada={disciplinas.isDisciplinaSelecionada}
          onToggleDisciplina={disciplinas.toggleDisciplina}
          onAulasSemanaisChange={disciplinas.updateAulasSemanaisInput}
          onAulasSemanaisBlur={disciplinas.saveAulasSemanais}
          onProfessoresChange={disciplinas.updateProfessores}
          onTipoChange={disciplinas.changeTipoProfessor}
          onImport={() => setShowUploadModal(true)}
          onNewDisciplina={() => navigate('/disciplinas/novo')}
        />
      )}

      {activeTab === 'representantes' && (
        <TurmaRepresentantes
          todosRepresentantes={representantes.todosRepresentantes}
          representantesSelecionados={representantes.representantesSelecionados}
          loading={representantes.loading}
          saving={representantes.saving}
          onRepresentantesChange={representantes.updateRepresentantes}
          onRemoveRepresentante={representantes.removeRepresentante}
        />
      )}

      {activeTab === 'estudantes' && (
        <TurmaEstudantes />
      )}

      {/* Modal de Upload */}
      <BulkUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        type="disciplinas"
        turmaId={parseInt(id)}
        onSuccess={() => {
          disciplinas.reloadDisciplinas()
          setShowUploadModal(false)
        }}
      />
    </div>
  )
}
