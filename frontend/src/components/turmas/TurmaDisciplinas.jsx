import { HiBookOpen, HiPlus, HiUpload, HiAcademicCap } from 'react-icons/hi'
import { Card, Button, Loading, MultiCombobox, Pagination } from '../ui'

/**
 * Componente para exibir e gerenciar disciplinas da turma
 */
export default function TurmaDisciplinas({
    // Estado
    disciplinasPorArea,
    disciplinasVinculadas,
    aulasSemanais,
    loading,
    professoresDisponiveis,
    salvandoProfessores,
    totalAulasSemanais,

    // Paginação
    page,
    totalPages,
    totalCount,
    pageSize,
    onPageChange,

    // Handlers
    isDisciplinaSelecionada,
    onToggleDisciplina,
    onAulasSemanaisChange,
    onAulasSemanaisBlur,
    onProfessoresChange,
    onTipoChange,
    onImport,
    onNewDisciplina,
}) {
    const hasDisciplinas = Object.keys(disciplinasPorArea).length > 0

    return (
        <Card hover={false}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                        Disciplinas da Turma
                    </h2>
                    <p className="text-sm text-slate-500">
                        Selecione as disciplinas e informe as aulas semanais
                    </p>
                </div>
                <div className="flex items-center gap-4 text-right">
                    <div>
                        <p className="text-sm text-slate-500">Total de aulas semanais</p>
                        <p className="text-2xl font-bold text-primary-600">{totalAulasSemanais}</p>
                    </div>
                    <Button variant="secondary" icon={HiUpload} onClick={onImport}>
                        Importar Disciplinas
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loading size="md" />
                </div>
            ) : hasDisciplinas ? (
                <div className="space-y-6">
                    {Object.entries(disciplinasPorArea).map(([area, disciplinasArea]) => (
                        <div key={area}>
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                {area}
                            </h3>
                            <div className="space-y-2">
                                {disciplinasArea.map((disciplina) => {
                                    const selecionada = isDisciplinaSelecionada(disciplina.id)
                                    const vinculo = disciplinasVinculadas[disciplina.id]

                                    return (
                                        <DisciplinaCard
                                            key={disciplina.id}
                                            disciplina={disciplina}
                                            selecionada={selecionada}
                                            vinculo={vinculo}
                                            aulasSemanais={aulasSemanais[disciplina.id] || ''}
                                            professoresDisponiveis={professoresDisponiveis}
                                            salvandoProfessores={salvandoProfessores}
                                            onToggle={() => onToggleDisciplina(disciplina)}
                                            onAulasChange={(valor) => onAulasSemanaisChange(disciplina.id, valor)}
                                            onAulasBlur={() => onAulasSemanaisBlur(disciplina.id)}
                                            onProfessoresChange={(ids) => onProfessoresChange(disciplina.id, ids)}
                                            onTipoChange={(profId, tipo) => onTipoChange(disciplina.id, profId, tipo)}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-slate-500">
                    <HiBookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma disciplina cadastrada no sistema</p>
                    <Button
                        variant="ghost"
                        icon={HiPlus}
                        className="mt-4"
                        onClick={onNewDisciplina}
                    >
                        Cadastrar disciplinas
                    </Button>
                </div>
            )}

            {/* Paginação */}
            {hasDisciplinas && (
                <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={totalCount}
                        pageSize={pageSize}
                        onPageChange={onPageChange}
                    />
                </div>
            )}
        </Card>
    )
}

/**
 * Card individual de disciplina
 */
function DisciplinaCard({
    disciplina,
    selecionada,
    vinculo,
    aulasSemanais,
    professoresDisponiveis,
    salvandoProfessores,
    onToggle,
    onAulasChange,
    onAulasBlur,
    onProfessoresChange,
    onTipoChange,
}) {
    return (
        <div
            className={`p-4 rounded-xl border-2 transition-all ${selecionada
                ? 'border-primary-500 bg-primary-500/5'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
        >
            <div className="flex items-center gap-4">
                {/* Checkbox */}
                <label className="flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={selecionada}
                        onChange={onToggle}
                        className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                </label>

                {/* Info da Disciplina */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`font-medium ${selecionada ? 'text-primary-700 dark:text-primary-400' : 'text-slate-800 dark:text-white'}`}>
                            {disciplina.nome}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                            {disciplina.sigla}
                        </span>
                    </div>
                </div>

                {/* Input Aulas Semanais */}
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="4"
                        maxLength={2}
                        value={aulasSemanais}
                        onChange={(e) => onAulasChange(e.target.value)}
                        onBlur={onAulasBlur}
                        onClick={(e) => e.target.select()}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                            const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter']
                            if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                                e.preventDefault()
                                return
                            }

                            if (e.key === 'Tab' || e.key === 'Enter') {
                                e.preventDefault()
                                const allInputs = document.querySelectorAll('input[data-aulas-input]:not(:disabled)')
                                const currentIndex = Array.from(allInputs).findIndex(input => input === e.target)
                                const nextInput = allInputs[currentIndex + 1]
                                const nextDisciplinaId = nextInput?.getAttribute('data-aulas-input')

                                onAulasBlur()

                                if (nextDisciplinaId) {
                                    setTimeout(() => {
                                        const targetInput = document.querySelector(`input[data-aulas-input="${nextDisciplinaId}"]:not(:disabled)`)
                                        if (targetInput) {
                                            targetInput.focus()
                                            targetInput.select()
                                        }
                                    }, 50)
                                }
                            }
                        }}
                        disabled={!selecionada && !aulasSemanais}
                        className={`w-16 px-3 py-2 text-center rounded-lg border transition-all ${selecionada
                            ? 'border-primary-300 dark:border-primary-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                            : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
                            } text-slate-800 dark:text-white`}
                        inputMode="numeric"
                        data-aulas-input={disciplina.id}
                    />
                    <span className="text-sm text-slate-500 w-12">aulas</span>
                </div>
            </div>

            {/* Professor Assignment */}
            {selecionada && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 flex items-center gap-2 flex-shrink-0">
                            <HiAcademicCap className="h-4 w-4" />
                            Professores:
                            {salvandoProfessores === disciplina.id && (
                                <span className="text-primary-600 text-xs">(salvando...)</span>
                            )}
                        </span>
                        <div className="flex-1">
                            <MultiCombobox
                                value={vinculo?.professores?.map(p => p.id) || []}
                                onChange={onProfessoresChange}
                                options={professoresDisponiveis.map(p => ({
                                    value: p.id,
                                    label: p.nome_completo,
                                    subLabel: p.apelido
                                }))}
                                placeholder="Pesquise por nome ou apelido..."
                                disabled={salvandoProfessores === disciplina.id}
                            />
                        </div>
                    </div>

                    {/* Lista de professores */}
                    {vinculo?.professores?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {vinculo.professores.map(prof => (
                                <div
                                    key={prof.id}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all ${prof.tipo === 'TITULAR'
                                        ? 'bg-primary-500/10 text-primary-700 dark:text-primary-300'
                                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                        }`}
                                >
                                    <HiAcademicCap className="h-3.5 w-3.5" />
                                    <span className="font-medium">
                                        {prof.apelido || prof.usuario?.first_name || prof.nome_completo}
                                    </span>
                                    <button
                                        onClick={() => onTipoChange(
                                            prof.id,
                                            prof.tipo === 'TITULAR' ? 'SUBSTITUTO' : 'TITULAR'
                                        )}
                                        className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${prof.tipo === 'TITULAR'
                                            ? 'bg-primary-600/20 hover:bg-primary-600/30 text-primary-800 dark:text-primary-200'
                                            : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-800 dark:text-amber-200'
                                            }`}
                                        title="Clique para alternar entre Titular e Substituto"
                                        disabled={salvandoProfessores === disciplina.id}
                                    >
                                        {prof.tipo === 'TITULAR' ? 'T' : 'S'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
