import { Input } from '../ui'

/**
 * Seção de benefícios e transporte no formulário de estudante
 */
export default function BeneficiosSection({
    formData,
    isMenor,
    onFieldChange,
}) {
    const CheckboxItem = ({ label, field, disabled = false, subtitle = null }) => (
        <label className={`flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
                type="checkbox"
                checked={formData[field]}
                onChange={(e) => onFieldChange(field, e.target.checked)}
                disabled={disabled}
                className={`w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 ${disabled ? 'cursor-not-allowed' : ''}`}
            />
            <span className="text-slate-700 dark:text-slate-300">
                {label}
                {subtitle && <span className="text-xs ml-2 text-slate-500">{subtitle}</span>}
            </span>
        </label>
    )

    return (
        <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                Benefícios e Transporte
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <CheckboxItem label="Bolsa Família" field="bolsa_familia" />
                <CheckboxItem label="Pé de Meia" field="pe_de_meia" />
                <CheckboxItem
                    label="Pode Sair Sozinho"
                    field="permissao_sair_sozinho"
                    disabled={!isMenor}
                    subtitle={!isMenor ? '(Maior de idade)' : null}
                />
                <CheckboxItem label="Usa Ônibus Escolar" field="usa_onibus" />

                {formData.usa_onibus && (
                    <div className="lg:col-span-2">
                        <Input
                            label="Linha do Ônibus"
                            placeholder="Ex: Linha 3 - Centro"
                            value={formData.linha_onibus}
                            onChange={(e) => onFieldChange('linha_onibus', e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
