import { HiStar, HiX } from 'react-icons/hi'
import { Card, Loading, MultiCombobox } from '../ui'

/**
 * Componente para exibir e gerenciar representantes da turma
 */
export default function TurmaRepresentantes({
    todosRepresentantes,
    representantesSelecionados,
    loading,
    saving,
    onRepresentantesChange,
    onRemoveRepresentante,
}) {
    return (
        <Card hover={false}>
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                    Professores Representantes
                </h2>
                <p className="text-sm text-slate-500">
                    Selecione os professores que representam esta turma{' '}
                    {saving && <span className="text-primary-600">(salvando...)</span>}
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loading size="md" />
                </div>
            ) : (
                <div className="space-y-6">
                    <MultiCombobox
                        label="Selecionar Representantes"
                        value={representantesSelecionados}
                        onChange={onRepresentantesChange}
                        options={todosRepresentantes.map(p => ({
                            value: p.id,
                            label: p.nome_completo,
                            subLabel: p.apelido
                        }))}
                        placeholder="Pesquise por nome ou apelido... (Enter para confirmar)"
                        disabled={saving}
                    />

                    {/* Lista dos representantes selecionados */}
                    {representantesSelecionados.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                                Representantes Selecionados ({representantesSelecionados.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {representantesSelecionados.map(repId => {
                                    const professor = todosRepresentantes.find(p => p.id === repId)
                                    if (!professor) return null

                                    return (
                                        <div
                                            key={repId}
                                            className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                                                <HiStar className="h-5 w-5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-800 dark:text-white truncate">
                                                    {professor.nome_completo}
                                                </p>
                                                {professor.apelido && (
                                                    <p className="text-sm text-slate-500 truncate">
                                                        {professor.apelido}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => onRemoveRepresentante(repId)}
                                                className="p-2 rounded-lg hover:bg-danger-500/10 text-danger-600 transition-colors flex-shrink-0"
                                                title="Remover"
                                                disabled={saving}
                                            >
                                                <HiX className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {representantesSelecionados.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            <HiStar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Nenhum representante selecionado</p>
                            <p className="text-sm mt-1">Use o campo acima para pesquisar e selecionar professores</p>
                        </div>
                    )}
                </div>
            )}
        </Card>
    )
}
