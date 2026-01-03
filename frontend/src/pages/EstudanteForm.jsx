import { useNavigate, useParams } from 'react-router-dom'
import { Card, Button, Input, DateInput, Loading } from '../components/ui'
import { HiSave } from 'react-icons/hi'

// Hook e formatters
import { useEstudanteForm } from '../hooks'
import { formatTelefone, formatCPF } from '../utils/formatters'

// Componentes de seção
import {
    FotoSection,
    MatriculasSection,
    ResponsaveisSection,
    EnderecoSection,
    BeneficiosSection,
    CredenciaisSection,
} from '../components/estudantes'

/**
 * Formulário de Estudante (Criar/Editar)
 * 
 * Responsabilidades:
 * - Orquestra hooks e componentes de seção
 * - Renderiza layout do formulário
 * - Não contém lógica de negócio pesada
 */
export default function EstudanteForm() {
    const navigate = useNavigate()
    const { id: idParam } = useParams()

    // Hook que gerencia todo estado e lógica do formulário
    const form = useEstudanteForm(idParam, navigate)

    if (form.loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loading size="lg" />
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">

                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        {form.isEditing ? 'Editar Estudante' : 'Novo Estudante'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {form.isEditing
                            ? 'Atualize as informações do estudante'
                            : 'Preencha os dados para cadastrar um novo estudante'}
                    </p>
                </div>
            </div>

            {/* Formulário */}
            <Card hover={false}>
                <form onSubmit={form.handleSubmit} className="space-y-8">
                    {/* Dados Pessoais + Foto */}
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Foto */}
                        <FotoSection
                            fotoPreview={form.fotoPreview}
                            fotoBlob={form.fotoBlob}
                            onFotoChange={form.setFotoBlob}
                        />

                        {/* Dados Pessoais */}
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                                Dados Pessoais
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <Input
                                        label="Nome Completo *"
                                        placeholder="Nome do estudante"
                                        value={form.formData.first_name}
                                        onChange={(e) => form.updateField('first_name', e.target.value)}
                                        autoComplete="off"
                                        required
                                    />
                                </div>
                                <Input
                                    label="Nome Social"
                                    placeholder="Nome social (se houver)"
                                    value={form.formData.nome_social}
                                    onChange={(e) => form.updateField('nome_social', e.target.value)}
                                    autoComplete="off"
                                />
                                <div>
                                    <Input
                                        label="CPF *"
                                        placeholder="000.000.000-00"
                                        value={form.formData.cpf}
                                        onChange={(e) => form.updateField('cpf', formatCPF(e.target.value))}
                                        onKeyDown={(e) => {
                                            const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                                            if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                                                e.preventDefault()
                                            }
                                        }}
                                        maxLength={14}
                                        autoComplete="off"
                                        required
                                        disabled={form.isEditing}
                                        error={form.cpfError}
                                    />
                                </div>
                                <Input
                                    label="CIN"
                                    placeholder="Carteira de Identidade Nacional"
                                    value={form.formData.cin}
                                    onChange={(e) => form.updateField('cin', e.target.value)}
                                    autoComplete="off"
                                />
                                <DateInput
                                    label="Data de Nascimento *"
                                    value={form.formData.data_nascimento}
                                    onChange={(e) => form.updateField('data_nascimento', e.target.value)}
                                    required
                                />
                                <Input
                                    label="Telefone"
                                    placeholder="(00) 00000-0000"
                                    value={form.formData.telefone}
                                    onChange={(e) => form.updateField('telefone', formatTelefone(e.target.value))}
                                    onKeyDown={(e) => {
                                        const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                                        if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                                            e.preventDefault()
                                        }
                                    }}
                                    maxLength={15}
                                    autoComplete="off"
                                />
                                <Input
                                    label="E-mail *"
                                    type="email"
                                    placeholder="email@exemplo.com"
                                    value={form.formData.email}
                                    onChange={(e) => form.updateField('email', e.target.value)}
                                    autoComplete="off"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Responsáveis */}
                    <ResponsaveisSection
                        responsaveis={form.responsaveis}
                        isMenor={form.isMenor}
                        onAdd={form.addResponsavel}
                        onRemove={form.removeResponsavel}
                        onUpdate={form.updateResponsavel}
                    />

                    {/* Matrículas */}
                    <MatriculasSection
                        matriculas={form.matriculas}
                        cursos={form.cursos}
                        onAdd={form.addMatricula}
                        onRemove={form.removeMatricula}
                        onUpdate={form.updateMatricula}
                    />

                    {/* Endereço */}
                    <EnderecoSection
                        formData={form.formData}
                        onFieldChange={form.updateField}
                        onFetchCep={form.fetchCep}
                        cepLoading={form.cepLoading}
                    />

                    {/* Benefícios e Transporte */}
                    <BeneficiosSection
                        formData={form.formData}
                        isMenor={form.isMenor}
                        onFieldChange={form.updateField}
                    />

                    {/* Credenciais de Acesso (apenas criação) */}
                    {!form.isEditing && (
                        <CredenciaisSection
                            formData={form.formData}
                            showPassword={form.showPassword}
                            onFieldChange={form.updateField}
                            onTogglePassword={() => form.setShowPassword(!form.showPassword)}
                            onGeneratePassword={form.regeneratePassword}
                        />
                    )}

                    {/* Botões */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button type="button" variant="secondary" onClick={() => navigate('/estudantes')}>
                            Cancelar
                        </Button>
                        <Button type="submit" icon={HiSave} loading={form.saving}>
                            {form.isEditing ? 'Salvar Alterações' : 'Cadastrar Estudante'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
