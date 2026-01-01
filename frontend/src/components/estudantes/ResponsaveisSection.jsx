import { Button, Input, Select } from '../ui'
import { formatCPF, formatTelefone } from '../../utils/formatters'
import { validateCPF } from '../../utils/validators'
import { PARENTESCOS } from '../../data'

/**
 * Seção de responsáveis no formulário de estudante
 */
export default function ResponsaveisSection({
    responsaveis,
    isMenor,
    onAdd,
    onRemove,
    onUpdate,
}) {
    // Calcula erro de CPF para cada responsável
    const getCpfError = (cpf) => {
        if (!cpf) return ''
        const cpfNumbers = cpf.replace(/\D/g, '')
        if (cpfNumbers.length === 11) {
            return validateCPF(cpf) ? '' : 'CPF Inválido'
        }
        return ''
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                        Responsáveis
                        {isMenor && (
                            <span className="ml-2 text-sm font-normal text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                Obrigatório para menores
                            </span>
                        )}
                    </h2>
                    {isMenor && (
                        <p className="text-sm text-slate-500">Pelo menos um responsável é obrigatório</p>
                    )}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAdd}
                >
                    + Adicionar Responsável
                </Button>
            </div>

            <div className="space-y-6">
                {responsaveis.map((resp, index) => (
                    <div
                        key={index}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Responsável {index + 1}
                            </span>
                            {responsaveis.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => onRemove(index)}
                                    className="text-sm text-danger-500 hover:text-danger-700 dark:hover:text-danger-400"
                                >
                                    Remover
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2">
                                <Input
                                    label={`Nome Completo ${isMenor ? '*' : ''}`}
                                    placeholder="Nome do responsável"
                                    value={resp.nome}
                                    onChange={(e) => onUpdate(index, 'nome', e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                            <Input
                                label={`CPF ${isMenor ? '*' : ''}`}
                                placeholder="000.000.000-00"
                                value={resp.cpf}
                                onChange={(e) => onUpdate(index, 'cpf', formatCPF(e.target.value))}
                                onKeyDown={(e) => {
                                    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                                    if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                                        e.preventDefault()
                                    }
                                }}
                                maxLength={14}
                                autoComplete="off"
                                error={getCpfError(resp.cpf)}
                            />
                            <Input
                                label="Telefone"
                                placeholder="(00) 00000-0000"
                                value={resp.telefone}
                                onChange={(e) => onUpdate(index, 'telefone', formatTelefone(e.target.value))}
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
                                label="E-mail"
                                type="email"
                                placeholder="email@exemplo.com"
                                value={resp.email}
                                onChange={(e) => onUpdate(index, 'email', e.target.value)}
                                autoComplete="off"
                            />
                            <Select
                                label={`Parentesco ${isMenor ? '*' : ''}`}
                                value={resp.parentesco}
                                onChange={(e) => onUpdate(index, 'parentesco', e.target.value)}
                                options={PARENTESCOS}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
