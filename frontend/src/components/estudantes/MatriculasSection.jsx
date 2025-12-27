import { Button, Input, DateInput, Select, Combobox } from '../ui'
import { formatMatricula } from '../../utils/formatters'
import { STATUS_MATRICULA } from '../../data'

/**
 * Seção de matrículas no formulário de estudante
 */
export default function MatriculasSection({
    matriculas,
    cursos,
    onAdd,
    onRemove,
    onUpdate,
}) {
    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                        Matrículas
                        <span className="ml-2 text-sm font-normal text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            Obrigatório
                        </span>
                    </h2>
                    <p className="text-sm text-slate-500">Pelo menos uma matrícula é necessária</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAdd}
                >
                    + Adicionar Curso
                </Button>
            </div>

            <div className="space-y-6">
                {matriculas.map((mat, index) => (
                    <div
                        key={index}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Matrícula {index + 1}
                            </span>
                            {matriculas.length > 1 && (
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
                            <Input
                                label="Número da Matrícula *"
                                placeholder="000.000.000-0"
                                value={mat.numero_matricula}
                                onChange={(e) => onUpdate(index, 'numero_matricula', formatMatricula(e.target.value))}
                                onKeyDown={(e) => {
                                    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                                    if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                                        e.preventDefault()
                                    }
                                }}
                                maxLength={13}
                                autoComplete="off"
                            />
                            <div className="md:col-span-2">
                                <Combobox
                                    label="Curso"
                                    value={mat.curso_id}
                                    onChange={(val) => onUpdate(index, 'curso_id', val)}
                                    options={cursos.map(c => ({
                                        value: c.id,
                                        label: c.nome,
                                        subLabel: c.sigla
                                    }))}
                                    placeholder="Pesquise por nome ou sigla..."
                                    required
                                />
                            </div>
                            <DateInput
                                label="Data de Entrada *"
                                value={mat.data_entrada}
                                onChange={(e) => onUpdate(index, 'data_entrada', e.target.value)}
                            />
                            <DateInput
                                label="Data de Saída"
                                value={mat.data_saida}
                                onChange={(e) => onUpdate(index, 'data_saida', e.target.value)}
                            />
                            <Select
                                label="Status *"
                                value={mat.status}
                                onChange={(e) => onUpdate(index, 'status', e.target.value)}
                                options={STATUS_MATRICULA}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
