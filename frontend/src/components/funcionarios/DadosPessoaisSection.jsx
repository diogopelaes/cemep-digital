import { Input, DateInput, Select } from '../ui'
import { formatCPF, formatTelefone } from '../../utils/formatters'

/**
 * Seção de dados pessoais no formulário de funcionário
 */
export default function DadosPessoaisSection({
    formData,
    cpfError,
    isEditing,
    onFieldChange,
}) {
    return (
        <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                Dados Pessoais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <Input
                        label="Nome Completo *"
                        placeholder="João da Silva"
                        value={formData.nome}
                        onChange={(e) => onFieldChange('nome', e.target.value)}
                        autoComplete="off"
                        required
                    />
                </div>
                <Input
                    label="Nome Social"
                    placeholder="Opcional"
                    value={formData.nome_social}
                    onChange={(e) => onFieldChange('nome_social', e.target.value)}
                    autoComplete="off"
                />
                <Input
                    label="CPF"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => onFieldChange('cpf', formatCPF(e.target.value))}
                    onKeyDown={(e) => {
                        const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                        if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                            e.preventDefault()
                        }
                    }}
                    maxLength={14}
                    autoComplete="off"
                    error={cpfError}
                />
                <Input
                    label="CIN"
                    placeholder="Número do CIN"
                    value={formData.cin}
                    onChange={(e) => onFieldChange('cin', e.target.value)}
                    autoComplete="off"
                />
                <DateInput
                    label="Data de Nascimento"
                    value={formData.data_nascimento}
                    onChange={(e) => onFieldChange('data_nascimento', e.target.value)}
                />
                <Input
                    label="E-mail"
                    type="email"
                    placeholder="joao.silva@email.com"
                    value={formData.email}
                    onChange={(e) => onFieldChange('email', e.target.value)}
                    autoComplete="off"
                />
                <Input
                    label="Telefone"
                    placeholder="(19) 99999-9999"
                    value={formData.telefone}
                    onChange={(e) => onFieldChange('telefone', formatTelefone(e.target.value))}
                    inputMode="tel"
                    maxLength={15}
                    autoComplete="off"
                />
            </div>
        </div>
    )
}
