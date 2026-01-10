import { useNavigate, useParams } from 'react-router-dom'
import { Card, Loading, FormActions } from '../../components/ui'

// Hook
import { useFuncionarioForm } from '../../hooks'

// Componentes de seção
import {
  DadosPessoaisSection,
  EnderecoSectionFunc,
  DadosProfissionaisSection,
  CredenciaisFuncSection,
} from '../../components/funcionarios'

/**
 * Formulário de Funcionário (Criar/Editar)
 * 
 * Responsabilidades:
 * - Orquestra hooks e componentes de seção
 * - Renderiza layout do formulário
 * - Não contém lógica de negócio pesada
 */
export default function FuncionarioForm() {
  const navigate = useNavigate()
  const { id } = useParams()

  // Hook que gerencia todo estado e lógica do formulário
  const form = useFuncionarioForm(id, navigate)

  if (form.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">

        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            {form.isEditing ? 'Editar Funcionário' : 'Novo Funcionário'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {form.isEditing
              ? 'Atualize os dados do funcionário'
              : 'Preencha os dados para criar um novo funcionário'}
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card hover={false}>
        <form onSubmit={form.handleSubmit} className="space-y-6">
          {/* Dados Pessoais */}
          <DadosPessoaisSection
            formData={form.formData}
            cpfError={form.cpfError}
            isEditing={form.isEditing}
            onFieldChange={form.updateField}
          />

          {/* Endereço */}
          <EnderecoSectionFunc
            formData={form.formData}
            onFieldChange={form.updateField}
            onFetchCep={form.fetchCep}
            cepLoading={form.cepLoading}
          />

          {/* Dados Profissionais */}
          <DadosProfissionaisSection
            formData={form.formData}
            onFieldChange={form.updateField}
          />

          {/* Credenciais de Acesso (apenas criação) */}
          {!form.isEditing && (
            <CredenciaisFuncSection
              formData={form.formData}
              showPassword={form.showPassword}
              onFieldChange={form.updateField}
              onTogglePassword={() => form.setShowPassword(!form.showPassword)}
              onGeneratePassword={form.regeneratePassword}
            />
          )}

          {/* Botões */}
          <FormActions
            cancelTo="/funcionarios"
            saving={form.saving}
            isEditing={form.isEditing}
            entityName="Funcionário"
          />
        </form>
      </Card>
    </div>
  )
}
