import { DateInput, Switch } from '../../components/ui'

/**
 * Formulário inline para um tipo de controle dentro do accordion.
 * Exibe: Título do tipo, campos de data (início/fim).
 * A liberação é calculada automaticamente baseada nas datas.
 */
export default function ControleForm({ tipo, controle, onChange }) {
    const dataInicio = controle?.data_inicio || ''
    const dataFim = controle?.data_fim || ''
    const digitacaoFutura = controle?.digitacao_futura ?? true
    const status = controle?.status_liberacao || 'Bloqueado'

    const getStatusColor = () => {
        if (status === 'Liberado') return 'text-success-600 dark:text-success-500'
        if (status === 'Aguardando início') return 'text-warning-600 dark:text-warning-500'
        if (status === 'Encerrado') return 'text-danger-600 dark:text-danger-500'
        return 'text-slate-500 dark:text-slate-400' // Bloqueado
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
            {/* Tipo Label */}
            <div className="md:w-1/3">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                    {tipo.label}
                </span>
            </div>

            {/* Data Início */}
            <div className="flex flex-col gap-1 md:w-40">
                <DateInput
                    label="Início"
                    value={dataInicio}
                    onChange={(e) => onChange('data_inicio', e.target.value || null)}
                />
            </div>

            {/* Data Fim */}
            <div className="flex flex-col gap-1 md:w-40">
                <DateInput
                    label="Fim"
                    value={dataFim}
                    onChange={(e) => onChange('data_fim', e.target.value || null)}
                />
            </div>

            {/* Digitação Futura (apenas para AULA) */}
            {(tipo?.value === 'AULA' || controle?.tipo === 'AULA') && (
                <div className="flex flex-col gap-1 md:w-40">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Permitir digitação futura
                    </label>
                    <Switch
                        checked={digitacaoFutura}
                        onChange={(e) => onChange('digitacao_futura', e.target.checked)}
                        labelTrue="Sim"
                        labelFalse="Não"
                    />
                </div>
            )}

            {/* Status (calculado) */}
            <div className="flex flex-col gap-1 md:ml-auto md:min-w-[120px]">
                <label className="text-xs text-slate-500 dark:text-slate-400">Status</label>
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                    {status}
                </span>
            </div>
        </div>
    )
}
