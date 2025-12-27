import { HiSearch } from 'react-icons/hi'
import { Button, Input, Select } from '../ui'
import { formatCEP } from '../../utils/formatters'
import { ESTADOS_COMUNS } from '../../data'

/**
 * Seção de endereço no formulário de estudante/funcionário
 */
export default function EnderecoSection({
    formData,
    onFieldChange,
    onFetchCep,
    cepLoading,
}) {
    return (
        <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                Endereço
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-[140px]">
                        <Input
                            label="CEP *"
                            placeholder="00.000-000"
                            value={formData.cep}
                            onChange={(e) => onFieldChange('cep', formatCEP(e.target.value))}
                            onKeyDown={(e) => {
                                const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
                                if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                                    e.preventDefault()
                                }
                            }}
                            maxLength={10}
                            autoComplete="off"
                            required
                        />
                    </div>
                    <Button
                        type="button"
                        onClick={() => onFetchCep(formData.cep)}
                        disabled={formData.cep.replace(/\D/g, '').length !== 8 || cepLoading}
                        loading={cepLoading}
                        className="mb-[2px]"
                        title="Buscar CEP"
                    >
                        {!cepLoading && <HiSearch className="h-5 w-5" />}
                    </Button>
                </div>

                {/* Quebra de linha forçada */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4 h-0" />

                <div className="lg:col-span-2">
                    <Input
                        label="Logradouro *"
                        placeholder="Rua das Flores"
                        value={formData.logradouro}
                        onChange={(e) => onFieldChange('logradouro', e.target.value)}
                        autoComplete="off"
                        required
                    />
                </div>
                <Input
                    label="Número *"
                    placeholder="123"
                    value={formData.numero}
                    onChange={(e) => onFieldChange('numero', e.target.value)}
                    autoComplete="off"
                    required
                />
                <Input
                    label="Complemento"
                    placeholder="Apto 4B"
                    value={formData.complemento}
                    onChange={(e) => onFieldChange('complemento', e.target.value)}
                    autoComplete="off"
                />
                <div className="lg:col-span-2">
                    <Input
                        label="Bairro *"
                        placeholder="Centro"
                        value={formData.bairro}
                        onChange={(e) => onFieldChange('bairro', e.target.value)}
                        autoComplete="off"
                        required
                    />
                </div>
                <Input
                    label="Cidade"
                    placeholder="Cidade"
                    value={formData.cidade}
                    onChange={(e) => onFieldChange('cidade', e.target.value)}
                    autoComplete="off"
                    disabled
                    className="bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed"
                />
                <Select
                    label="Estado"
                    value={formData.estado}
                    onChange={(e) => onFieldChange('estado', e.target.value)}
                    options={ESTADOS_COMUNS}
                    disabled
                    className="bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed"
                />
            </div>
        </div>
    )
}
