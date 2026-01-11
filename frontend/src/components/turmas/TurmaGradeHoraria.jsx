import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { HiTable, HiPlus, HiPencil, HiCalendar, HiX, HiCheck, HiSave } from 'react-icons/hi'
import {
    Table, TableHead, TableBody, TableRow, TableHeader, TableCell,
    Modal, Button, DateInput, Select, MiniCombobox
} from '../ui'
import { FaFilePdf } from 'react-icons/fa'
import { generateGradeTurmaPDF } from '../../utils/pdf'
import api from '../../services/api'
import { useGradeHoraria } from '../../hooks/useGradeHoraria'
import toast from 'react-hot-toast'

const DAYS = [
    { value: 0, label: 'Segunda' },
    { value: 1, label: 'Terça' },
    { value: 2, label: 'Quarta' },
    { value: 3, label: 'Quinta' },
    { value: 4, label: 'Sexta' },
]

/**
 * Componente container da aba "Grade Horária" em TurmaDetalhes.
 * Gerencia visualização e edição inline da grade horária.
 */
export default function TurmaGradeHoraria() {
    const { id: turmaId } = useParams()
    const { fetchDadosEdicao, salvarGrade, loading: hookLoading } = useGradeHoraria()

    // Estados
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dados, setDados] = useState(null)
    const [validades, setValidades] = useState([])
    const [validadeSelecionada, setValidadeSelecionada] = useState(null)

    // Modo de edição
    const [modoEdicao, setModoEdicao] = useState(false)
    const [selections, setSelections] = useState({})
    const [dataInicio, setDataInicio] = useState('')
    const [dataFim, setDataFim] = useState('')

    // Modal Criar Nova Grade
    const [modalOpen, setModalOpen] = useState(false)
    const [novaDataInicio, setNovaDataInicio] = useState('')
    const [novaDataFim, setNovaDataFim] = useState('')
    const [criandoGrade, setCriandoGrade] = useState(false)
    const [generatingPDF, setGeneratingPDF] = useState(false)

    useEffect(() => {
        carregarDados()
    }, [turmaId])

    const carregarDados = async (validadeId = null) => {
        setLoading(true)
        try {
            const data = await fetchDadosEdicao(turmaId, validadeId)
            setDados(data)
            setValidades(data.validades || [])
            setValidadeSelecionada(data.validade_selecionada)

            // Reset seleções
            const initial = {}
            if (data.grades) {
                data.grades.forEach(g => {
                    if (g.horario_aula) {
                        initial[g.horario_aula] = g.disciplina
                    }
                })
            }
            setSelections(initial)

            // Reset datas
            if (data.validade_selecionada) {
                setDataInicio(data.validade_selecionada.data_inicio)
                setDataFim(data.validade_selecionada.data_fim)
            }
        } catch (err) {
            // Toast já exibido no hook
        } finally {
            setLoading(false)
        }
    }

    const handleChangeValidade = (e) => {
        const validadeId = e.target.value
        if (validadeId) {
            setModoEdicao(false)
            carregarDados(validadeId)
        }
    }

    const handleCriarNovaGrade = async (e) => {
        e.preventDefault()
        if (!novaDataInicio || !novaDataFim) {
            toast.error('Informe datas de início e fim.')
            return
        }

        setCriandoGrade(true)
        try {
            const response = await salvarGrade({
                turma_id: turmaId,
                data_inicio: novaDataInicio,
                data_fim: novaDataFim,
                grades: []
            })

            setModalOpen(false)
            setNovaDataInicio('')
            setNovaDataFim('')

            if (response?.validade_id) {
                await carregarDados(response.validade_id)
                setModoEdicao(true)
            } else {
                await carregarDados()
            }
        } catch (err) {
            // Erro já tratado no hook
        } finally {
            setCriandoGrade(false)
        }
    }

    const handleEditar = () => {
        setModoEdicao(true)
    }

    const handleCancelarEdicao = () => {
        setModoEdicao(false)
        // Recarrega dados para reverter alterações
        carregarDados(validadeSelecionada?.id)
    }

    const handleSelectChange = (horarioId, disciplinaId) => {
        setSelections(prev => ({
            ...prev,
            [horarioId]: disciplinaId || ''
        }))
    }

    const handleSave = async () => {
        if (!dataInicio || !dataFim) {
            toast.error('Informe as datas de início e fim da vigência.')
            return
        }

        try {
            setSaving(true)

            const gradesParaSalvar = Object.entries(selections)
                .filter(([_, disciplinaId]) => disciplinaId)
                .map(([horarioId, disciplinaId]) => ({
                    horario_aula: horarioId,
                    disciplina: disciplinaId
                }))

            await salvarGrade({
                turma_id: turmaId,
                validade_id: validadeSelecionada?.id,
                data_inicio: dataInicio,
                data_fim: dataFim,
                grades: gradesParaSalvar
            })

            setModoEdicao(false)
            await carregarDados(validadeSelecionada?.id)
        } catch (error) {
            // Tratado no hook
        } finally {
            setSaving(false)
        }
    }

    const handleGerarPDF = async () => {
        if (!validadeSelecionada || !turmas.length) return

        setGeneratingPDF(true)
        try {
            const ref = turmas[0]
            const ano = dados.ano_letivo
            const response = await api.get(`/core/grade-turma/${ano}/${ref.numero}/${ref.letra.toUpperCase()}/`)
            await generateGradeTurmaPDF(response.data)
        } catch (err) {
            console.error('Erro ao gerar PDF:', err)
            toast.error('Erro ao gerar PDF da grade horária.')
        } finally {
            setGeneratingPDF(false)
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Carregando grade horária...</div>
    }

    if (!dados) return null

    const { grades = [], horarios_aula: horariosAula = [], turmas = [], disciplinas = [] } = dados
    const temMultiplasTurmas = turmas.length > 1

    // Processa dados para tabela
    const aulasPorNumero = {}
    horariosAula.forEach(h => {
        if (!aulasPorNumero[h.numero]) {
            aulasPorNumero[h.numero] = modoEdicao ? {} : h
        }
        if (modoEdicao) {
            aulasPorNumero[h.numero][h.dia_semana] = h
        }
    })
    const numerosAula = Object.keys(aulasPorNumero).map(Number).sort((a, b) => a - b)

    // Mapa de grades para visualização
    const gradeMap = {}
    grades.forEach(g => {
        const h = horariosAula.find(ha => ha.id === g.horario_aula)
        if (h) {
            const key = `${h.dia_semana}-${h.numero}`
            if (!gradeMap[key]) gradeMap[key] = []
            const disciplinaDetalhes = disciplinas.find(d => d.id === g.disciplina)
            const turmaDetalhes = turmas.find(t => t.id === g.turma)
            if (disciplinaDetalhes) {
                gradeMap[key].push({
                    disciplina: disciplinaDetalhes,
                    turma_info: turmaDetalhes
                })
            }
        }
    })

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        const [ano, mes, dia] = dateStr.split('-')
        return `${dia}/${mes}`
    }

    return (
        <div className="space-y-6">
            {/* Header de Controle de Validade */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm gap-4">
                {modoEdicao ? (
                    // Modo Edição: Campos de data editáveis
                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DateInput
                            label="Início da Vigência"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                            required
                        />
                        <DateInput
                            label="Fim da Vigência"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                            min={dataInicio}
                            required
                        />
                    </div>
                ) : (
                    // Modo Visualização: Selector de validade
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Período de Vigência</label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <Select
                                value={validadeSelecionada?.id || ''}
                                onChange={handleChangeValidade}
                                className="min-w-[200px]"
                                placeholder={validades.length === 0 ? 'Nenhuma grade cadastrada' : 'Selecione...'}
                                options={[...validades]
                                    .sort((a, b) => b.data_inicio.localeCompare(a.data_inicio))
                                    .map(v => {
                                        const hoje = new Date().toISOString().split('T')[0]
                                        const isVigente = v.data_inicio <= hoje && v.data_fim >= hoje
                                        return {
                                            value: v.id,
                                            label: `${formatDate(v.data_inicio)} - ${formatDate(v.data_fim)} ${isVigente ? '(Atual)' : ''}`
                                        }
                                    })}
                            />

                            {validadeSelecionada && (() => {
                                const hoje = new Date().toISOString().split('T')[0]
                                const isNaoIniciada = validadeSelecionada.data_inicio > hoje
                                const isFinalizada = validadeSelecionada.data_fim < hoje
                                const isVigente = !isNaoIniciada && !isFinalizada

                                let badgeClass = ''
                                let badgeText = ''

                                if (isVigente) {
                                    badgeClass = 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                    badgeText = 'Vigente'
                                } else if (isNaoIniciada) {
                                    badgeClass = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                                    badgeText = 'Não iniciada'
                                } else {
                                    badgeClass = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                                    badgeText = 'Finalizada'
                                }

                                return (
                                    <div className={`px-2 py-1 rounded text-xs font-semibold border whitespace-nowrap ${badgeClass}`}>
                                        {badgeText}
                                    </div>
                                )
                            })()}
                        </div>
                    </div>
                )}

                <div className="flex gap-2 flex-shrink-0">
                    {modoEdicao ? (
                        <>
                            <Button variant="secondary" onClick={handleCancelarEdicao} icon={HiX}>
                                Cancelar
                            </Button>
                            <Button variant="primary" onClick={handleSave} loading={saving} icon={HiSave}>
                                Salvar
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="secondary" onClick={() => setModalOpen(true)} icon={HiPlus}>
                                Nova Vigência
                            </Button>
                            {validadeSelecionada && (
                                <Button variant="primary" onClick={handleEditar} icon={HiPencil}>
                                    Editar Grade
                                </Button>
                            )}
                            {validadeSelecionada && (
                                <Button
                                    variant="secondary"
                                    icon={FaFilePdf}
                                    onClick={handleGerarPDF}
                                    loading={generatingPDF}
                                >
                                    PDF
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Aviso de múltiplas turmas */}
            {temMultiplasTurmas && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        📅 {modoEdicao ? 'Editando' : 'Visualizando'} grades de {turmas.length} turmas com mesmos estudantes: {' '}
                        <strong>{turmas.map(t => t.curso_sigla).join(', ')}</strong>.
                    </p>
                </div>
            )}

            {/* Tabela da Grade */}
            {validadeSelecionada ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 overflow-x-auto">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader className="w-32 !text-center bg-slate-50 dark:bg-slate-800">Aula</TableHeader>
                                    {DAYS.map((day, idx) => (
                                        <TableHeader
                                            key={day.value}
                                            className={`!text-center ${idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800' : 'bg-primary-50/50 dark:bg-primary-900/20'}`}
                                        >
                                            {day.label}
                                        </TableHeader>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {numerosAula.map(numero => {
                                    const horariosDia = modoEdicao ? (aulasPorNumero[numero] || {}) : null
                                    const horarioRef = modoEdicao
                                        ? Object.values(horariosDia)[0]
                                        : aulasPorNumero[numero]

                                    return (
                                        <TableRow key={numero}>
                                            <TableCell className="text-center">
                                                <div className="font-bold text-slate-700 dark:text-slate-200">
                                                    {numero}ª
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {horarioRef?.hora_inicio?.slice(0, 5)} - {horarioRef?.hora_fim?.slice(0, 5)}
                                                </div>
                                            </TableCell>
                                            {DAYS.map((day, idx) => {
                                                const colBg = idx % 2 === 0 ? '' : 'bg-primary-50/30 dark:bg-primary-900/10'

                                                if (modoEdicao) {
                                                    // Modo Edição: MiniCombobox
                                                    const horario = horariosDia[day.value]

                                                    if (!horario) {
                                                        return (
                                                            <TableCell key={day.value} className={`text-center text-slate-300 dark:text-slate-600 ${colBg}`}>
                                                                -
                                                            </TableCell>
                                                        )
                                                    }

                                                    const selectedDisciplina = selections[horario.id] || ''

                                                    return (
                                                        <TableCell key={day.value} className={`p-2 text-center ${colBg}`}>
                                                            <MiniCombobox
                                                                value={selectedDisciplina}
                                                                onChange={(value) => handleSelectChange(horario.id, value)}
                                                                options={disciplinas.map(d => ({
                                                                    value: d.id,
                                                                    label: d.curso_sigla ? `${d.sigla} (${d.curso_sigla})` : d.sigla
                                                                }))}
                                                                placeholder="—"
                                                                className="w-full min-w-[100px]"
                                                            />
                                                        </TableCell>
                                                    )
                                                } else {
                                                    // Modo Visualização
                                                    const key = `${day.value}-${numero}`
                                                    const itens = gradeMap[key] || []

                                                    if (itens.length === 0) {
                                                        return (
                                                            <TableCell key={day.value} className={`text-center text-slate-300 dark:text-slate-600 ${colBg}`}>
                                                                —
                                                            </TableCell>
                                                        )
                                                    }

                                                    return (
                                                        <TableCell key={day.value} className={`text-center ${colBg}`}>
                                                            {itens.map((item, i) => (
                                                                <div key={i} className="text-sm">
                                                                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                                        {item.disciplina.sigla}
                                                                    </span>
                                                                    {temMultiplasTurmas && item.turma_info && (
                                                                        <span className="ml-1 text-xs text-slate-400">
                                                                            ({item.turma_info.curso_sigla})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </TableCell>
                                                    )
                                                }
                                            })}
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <HiTable className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 mb-4">
                        Nenhuma grade horária cadastrada para esta turma.
                    </p>
                    <Button variant="primary" onClick={() => setModalOpen(true)} icon={HiPlus}>
                        Criar Grade Horária
                    </Button>
                </div>
            )}

            {/* Modal Criar Nova Vigência */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Nova Vigência de Grade"
            >
                <form onSubmit={handleCriarNovaGrade} className="space-y-4">
                    <DateInput
                        label="Data de Início"
                        value={novaDataInicio}
                        onChange={(e) => setNovaDataInicio(e.target.value)}
                        required
                    />
                    <DateInput
                        label="Data de Fim"
                        value={novaDataFim}
                        onChange={(e) => setNovaDataFim(e.target.value)}
                        min={novaDataInicio}
                        required
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" loading={criandoGrade} icon={HiCheck}>
                            Criar e Editar
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
