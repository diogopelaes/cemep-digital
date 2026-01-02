import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Loading } from '../components/ui'
import BulkUploadModal from '../components/modals/BulkUploadModal'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

// Hooks
import { useTurma, useDisciplinasTurma, useRepresentantesTurma, useEstudantesTurma } from '../hooks'

// Componentes de domínio
import {
  TurmaHeader,
  TurmaTabs,
  TurmaDisciplinas,
  TurmaRepresentantes,
  TurmaEstudantes,
  TurmaGradeHoraria,
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
  const location = useLocation()
  const { id } = useParams()

  // Estados locais de UI
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'disciplinas')
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

  // Hook para estudantes (ativo apenas quando tab = 'estudantes')
  const estudantes = useEstudantesTurma(id, turma, activeTab === 'estudantes', reloadTurma)

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
    estudantes: turma?.estudantes_count || 0,
    gradeHoraria: turma?.grades_horarias_count || 0,
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
        <TurmaEstudantes
          estudantesElegiveis={estudantes.estudantesElegiveis}
          estudantesEnturmados={estudantes.estudantesEnturmados}
          loading={estudantes.loading}
          saving={estudantes.saving}
          dataEntrada={estudantes.dataEntrada}
          onDataEntradaChange={estudantes.setDataEntrada}
          onEnturmar={estudantes.enturmarEstudantes}
          onRemoveEstudante={estudantes.removeEstudante}
        />
      )}

      {activeTab === 'gradeHoraria' && (
        <TurmaGradeHoraria turma={turma} />
      )}

      {/* Modal de Upload */}
      <BulkUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={async (formData) => {
          formData.append('turma_id', id)
          const response = await coreAPI.disciplinasTurma.importarArquivo(formData)
          if (response.data.errors?.length > 0) {
            toast.error('Alguns registros não foram importados. Verifique os erros.')
          }
          disciplinas.reloadDisciplinas()
          return response
        }}
        title="Importar Disciplinas"
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
            <li>Formatos aceitos: <strong>.csv</strong> ou <strong>.xlsx</strong>.</li>
            <li><strong>SIGLA_DISCIPLINA</strong>: Sigla de uma disciplina já cadastrada no sistema.</li>
            <li><strong>AULAS_SEMANAIS</strong>: Número de aulas semanais (opcional, padrão: 4).</li>
            <li>A vinculação será feita automaticamente com a turma <strong>{turma?.nome_completo}</strong>.</li>
          </ul>
        }
      />
    </div>
  )
}
