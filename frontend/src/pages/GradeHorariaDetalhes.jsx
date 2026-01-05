import { useState, useEffect } from 'react'
import { HiTable, HiPlus, HiPencil, HiCalendar, HiX, HiCheck } from 'react-icons/hi'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell, Modal, Button, DateInput, Select } from '../components/ui'
import { useNavigate, useParams } from 'react-router-dom'
import { useGradeHoraria } from '../hooks/useGradeHoraria'
import toast from 'react-hot-toast'

const DAYS = [
    { value: 0, label: 'Segunda' },
    { value: 1, label: 'Terça' },
    { value: 2, label: 'Quarta' },
    { value: 3, label: 'Quinta' },
    { value: 4, label: 'Sexta' },
]

export default function GradeHorariaDetalhes() {
    const { id: turmaId } = useParams()
    const navigate = useNavigate()
    const { fetchDadosEdicao, salvarGrade, loading: hookLoading } = useGradeHoraria()

    // Estados locais
    const [loading, setLoading] = useState(true)
    const [dados, setDados] = useState(null)
    const [validades, setValidades] = useState([])
    const [validadeSelecionada, setValidadeSelecionada] = useState(null)

    // Modal Criar Nova Grade
    const [modalOpen, setModalOpen] = useState(false)
    const [novaDataInicio, setNovaDataInicio] = useState('')
    const [novaDataFim, setNovaDataFim] = useState('')
    const [criandoGrade, setCriandoGrade] = useState(false)

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
        } catch (err) {
            // Toast já exibido no hook
        } finally {
            setLoading(false)
        }
    }

    const handleChangeValidade = (e) => {
        const validadeId = e.target.value
        if (validadeId) {
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
                grades: [] // Apenas para criar a validade
            })

            setModalOpen(false)
            setNovaDataInicio('')
            setNovaDataFim('')

            if (response && response.validade_id) {
                navigate(`/turmas/${turmaId}/grade-horaria/editar`, {
                    state: { validade_id: response.validade_id }
                })
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
        if (validadeSelecionada) {
            navigate(`/turmas/${turmaId}/grade-horaria/editar`, {
                state: { validade_id: validadeSelecionada.id }
            })
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Carregando grade horária...</div>
    }

    if (!dados) return null

    const { grades = [], horarios_aula: horariosAula = [], turmas = [] } = dados

    // Identifica se há múltiplas turmas
    const temMultiplasTurmas = turmas.length > 1

    // Processa dados para tabela
    const aulasPorNumero = {}
    horariosAula.forEach(h => {
        if (!aulasPorNumero[h.numero]) aulasPorNumero[h.numero] = h
    })
    const numerosAula = Object.keys(aulasPorNumero).map(Number).sort((a, b) => a - b)

    const gradeMap = {}
    grades.forEach(g => {
        const h = horariosAula.find(ha => ha.id === g.horario_aula)
        if (h) {
            const key = `${h.dia_semana}-${h.numero}`
            if (!gradeMap[key]) gradeMap[key] = []

            // Encontra detalhes da disciplina e turma
            const disciplinaDetalhes = dados.disciplinas.find(d => d.id === g.disciplina)
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
                <div className="flex flex-col gap-1 w-full sm:w-auto">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Período de Vigência</label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <Select
                            className="w-full sm:w-64"
                            value={validadeSelecionada?.id || ''}
                            onChange={handleChangeValidade}
                            options={validades.map(v => ({
                                value: v.id,
                                label: `${formatDate(v.data_inicio)} a ${formatDate(v.data_fim)} ${v.is_active ? '(Atual)' : ''}`
                            }))}
                            placeholder={validades.length === 0 ? "Nenhuma grade criada" : "Selecione..."}
                        />

                        {validadeSelecionada && (
                            <div className={`px-2 py-1 rounded text-xs font-semibold border ${validadeSelecionada.data_inicio <= new Date().toISOString().split('T')[0] && validadeSelecionada.data_fim >= new Date().toISOString().split('T')[0]
                                ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                                }`}>
                                {validadeSelecionada.data_inicio <= new Date().toISOString().split('T')[0] && validadeSelecionada.data_fim >= new Date().toISOString().split('T')[0]
                                    ? 'Vigente'
                                    : 'Histórico/Futuro'
                                }
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                        onClick={() => setModalOpen(true)}
                        variant="secondary"
                        icon={HiPlus}
                    >
                        Nova Vigência
                    </Button>

                    {validadeSelecionada && (
                        <Button
                            onClick={handleEditar}
                            icon={HiPencil}
                        >
                            Editar Grade
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabela de Grade */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                {temMultiplasTurmas && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <span className="text-lg">📅</span>
                            <span>
                                Exibindo grades unificadas das turmas: {turmas.map(t => t.nome).join(', ')}.
                                <span className="block text-xs mt-1 opacity-80">A alteração em uma reflete nas outras para o mesmo período.</span>
                            </span>
                        </p>
                    </div>
                )}

                {(!horariosAula.length || !grades.length) && !validadeSelecionada ? (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-12 text-center">
                        <HiCalendar className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">Nenhuma grade selecionada</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                            Selecione um período de vigência acima ou crie um novo para visualizar a grade horária.
                        </p>
                    </div>
                ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4">
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
                                    const horarioRef = aulasPorNumero[numero]
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
                                                const key = `${day.value}-${numero}`
                                                const disciplinas = gradeMap[key] || []
                                                const colBg = idx % 2 === 0 ? '' : 'bg-primary-50/30 dark:bg-primary-900/10'

                                                if (disciplinas.length === 0) {
                                                    return (
                                                        <TableCell key={day.value} className={`text-center text-slate-300 dark:text-slate-600 ${colBg}`}>
                                                            -
                                                        </TableCell>
                                                    )
                                                }

                                                return (
                                                    <TableCell key={day.value} className={`p-2 text-center ${colBg}`}>
                                                        <div className="flex flex-col gap-1 items-center">
                                                            {disciplinas.map((item, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm w-full"
                                                                >
                                                                    <div className="flex items-center justify-center gap-1.5 w-full">
                                                                        <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                                                                            {item.disciplina?.sigla}
                                                                        </span>
                                                                        {temMultiplasTurmas && item.turma_info?.curso_sigla && (
                                                                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                                                                {item.turma_info.curso_sigla}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {item.disciplina?.professor_nome && (
                                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[100px]" title={item.disciplina.professor_nome}>
                                                                            {item.disciplina.professor_nome}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Modal de Criação */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Nova Vigência de Grade"
                width="max-w-md"
            >
                <form onSubmit={handleCriarNovaGrade} className="space-y-6">
                    <div className="space-y-4">
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
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                            ⚠️ Atenção: Ao criar uma nova vigência, as datas não podem sobrepor períodos já existentes para esta turma.
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            loading={criandoGrade}
                            icon={HiCheck}
                        >
                            Criar Vigência
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
