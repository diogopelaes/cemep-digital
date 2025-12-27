import { Input, DateInput, Select } from '../ui'
import { TIPOS_USUARIO } from '../../data'

/**
 * Seção de dados profissionais no formulário de funcionário
 */
export default function DadosProfissionaisSection({
    formData,
    onFieldChange,
}) {
    return (
        <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                Dados Profissionais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                    label="Nº Matrícula *"
                    type="text"
                    placeholder="123456"
                    value={formData.matricula}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '')
                        if (val.length <= 6) {
                            onFieldChange('matricula', val)
                        }
                    }}
                    onKeyDown={(e) => {
                        const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                        if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                            e.preventDefault()
                        }
                    }}
                    onPaste={(e) => {
                        e.preventDefault()
                        const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                        onFieldChange('matricula', paste)
                    }}
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="off"
                    required
                />
                <Select
                    label="Tipo de Usuário *"
                    value={formData.tipo_usuario}
                    onChange={(e) => onFieldChange('tipo_usuario', e.target.value)}
                    options={TIPOS_USUARIO}
                />
                <Input
                    label="Área de Atuação"
                    placeholder="Matemática"
                    value={formData.area_atuacao}
                    onChange={(e) => onFieldChange('area_atuacao', e.target.value)}
                    autoComplete="off"
                />
                <Input
                    label="Apelido"
                    placeholder="Apelido (opcional)"
                    value={formData.apelido}
                    onChange={(e) => onFieldChange('apelido', e.target.value)}
                    autoComplete="off"
                />
                <DateInput
                    label="Início na escola *"
                    value={formData.data_entrada}
                    onChange={(e) => onFieldChange('data_entrada', e.target.value)}
                    required
                />
                <DateInput
                    label="Data de Admissão"
                    value={formData.data_admissao}
                    onChange={(e) => onFieldChange('data_admissao', e.target.value)}
                />
            </div>
        </div>
    )
}
