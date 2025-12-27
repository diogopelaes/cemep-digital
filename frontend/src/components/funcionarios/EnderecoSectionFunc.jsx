import { HiSearch } from 'react-icons/hi'
import { Input, Select, Loading } from '../ui'
import { formatCEP } from '../../utils/formatters'
import { ESTADOS_COMUNS } from '../../data'

/**
 * Seção de endereço no formulário de funcionário
 * Versão específica para funcionário (campos editáveis)
 */
export default function EnderecoSectionFunc({
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
                {/* CEP + Botão */}
                <div className="flex gap-2 items-end">
                    <div className="flex-1 relative min-w-[140px]">
                        <Input
                            label="CEP"
                            placeholder="00.000-000"
                            value={formData.cep}
                            onChange={(e) => onFieldChange('cep', formatCEP(e.target.value))}
                            maxLength={10}
                            autoComplete="off"
                        />
                        {cepLoading && (
                            <div className="absolute right-3 top-[38px]">
                                <Loading size="sm" />
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => onFetchCep(formData.cep)}
                        disabled={cepLoading}
                        className="p-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Buscar CEP"
                    >
                        <HiSearch className="h-5 w-5" />
                    </button>
                </div>

                {/* Quebra de linha */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4 h-0" />

                {/* Logradouro */}
                <div className="lg:col-span-2">
                    <Input
                        label="Logradouro"
                        placeholder="Rua, Avenida..."
                        value={formData.logradouro}
                        onChange={(e) => onFieldChange('logradouro', e.target.value)}
                        autoComplete="off"
                    />
                </div>

                {/* Número */}
                <Input
                    label="Número"
                    placeholder="123"
                    value={formData.numero}
                    onChange={(e) => onFieldChange('numero', e.target.value)}
                    autoComplete="off"
                />

                {/* Complemento */}
                <Input
                    label="Complemento"
                    placeholder="Apto 101"
                    value={formData.complemento}
                    onChange={(e) => onFieldChange('complemento', e.target.value)}
                    autoComplete="off"
                />

                {/* Bairro */}
                <div className="lg:col-span-2">
                    <Input
                        label="Bairro"
                        placeholder="Centro"
                        value={formData.bairro}
                        onChange={(e) => onFieldChange('bairro', e.target.value)}
                        autoComplete="off"
                    />
                </div>

                {/* Cidade */}
                <Input
                    label="Cidade"
                    placeholder="Paulínia"
                    value={formData.cidade}
                    onChange={(e) => onFieldChange('cidade', e.target.value)}
                    autoComplete="off"
                />

                {/* Estado */}
                <Select
                    label="Estado"
                    value={formData.estado}
                    onChange={(e) => onFieldChange('estado', e.target.value)}
                    options={ESTADOS_COMUNS}
                />
            </div>
        </div>
    )
}
