import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Card, Button, Loading, Badge } from '../../components/ui'
import FormActionsProfessor from './FormActionsProfessor'
import { pedagogicalAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { formatDateBR } from '../../utils/date'

export default function AulaFaltasForm() {
    const navigate = useNavigate()
    const { id, professorDisciplinaTurmaId } = useParams()
    const location = useLocation()
    const isEditing = !!id

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    // Dados da aula
    const [conteudo, setConteudo] = useState('')
    const [numeroAulas, setNumeroAulas] = useState(2)
    const [data, setData] = useState('')
    const [turma, setTurma] = useState(null)
    const [disciplina, setDisciplina] = useState(null)
    const [bimestre, setBimestre] = useState(null)

    // Lista de estudantes com faltas (estado local)
    const [estudantes, setEstudantes] = useState([])

    useEffect(() => {
        loadData()
    }, [id, professorDisciplinaTurmaId])

    const loadData = async () => {
        setLoading(true)
        setError(null)
        try {
            if (isEditing) {
                // Edição: carregar aula existente
                const [aulaRes, estudantesRes] = await Promise.all([
                    pedagogicalAPI.aulasFaltas.get(id),
                    pedagogicalAPI.aulasFaltas.estudantes(id)
                ])

                const aula = aulaRes.data
                setConteudo(aula.conteudo || '')
                setNumeroAulas(aula.numero_aulas || 2)
                setData(aula.data)
                setBimestre(aula.bimestre)
                setTurma({ nome: aula.turma_nome })
                setDisciplina({
                    disciplina_nome: aula.disciplina_nome,
                    disciplina_sigla: aula.disciplina_sigla
                })

                // Processa máscaras imediatamente com o numero_aulas carregado
                setEstudantes(processFaltasMask(estudantesRes.data, aula.numero_aulas || 2))
            } else {
                // Nova aula: usar dados do state da navegação anterior
                const stateData = location.state
                if (!stateData) {
                    toast.error('Dados incompletos. Volte e selecione novamente.')
                    navigate('/aula-faltas/nova')
                    return
                }

                setData(stateData.data)
                setNumeroAulas(stateData.numeroAulas)
                setTurma(stateData.turma)
                setDisciplina(stateData.disciplina)
                setBimestre(null)

                // Carregar estudantes da turma
                const res = await pedagogicalAPI.aulasFaltas.estudantesPorTurma(professorDisciplinaTurmaId)
                setEstudantes(processFaltasMask(res.data.estudantes || [], stateData.numeroAulas))
            }
        } catch (error) {
            console.error(error)
            setError('Erro ao carregar dados. Tente novamente.')
            toast.error('Erro ao carregar dados.')
        }
        setLoading(false)
    }

    // Processa os dados brutos de estudantes para incluir a máscara
    const processFaltasMask = (listaEstudantes, numAulas) => {
        return listaEstudantes.map(e => {
            let mask;
            if (e.aulas_faltas && Array.isArray(e.aulas_faltas)) {
                mask = Array.from({ length: numAulas }, (_, i) => e.aulas_faltas.includes(i + 1))
            } else if ((e.qtd_faltas || 0) > 0) {
                mask = Array.from({ length: numAulas }, (_, i) => i < e.qtd_faltas)
            } else {
                mask = Array(numAulas).fill(false)
            }
            return { ...e, faltas_mask: mask }
        })
    }

    // Recalcula máscaras se o número de aulas mudar na tela
    useEffect(() => {
        if (!loading && estudantes.length > 0) {
            setEstudantes(prev => processFaltasMask(prev, numeroAulas))
        }
    }, [numeroAulas]) // Apenas quando mudar o número de aulas manualmente

    const toggleAulaFalta = (estudanteId, aulaIdx) => {
        setEstudantes(prev => prev.map(e => {
            if (e.id !== estudanteId) return e

            const currentMask = e.faltas_mask ? [...e.faltas_mask] : Array(numeroAulas).fill(false)
            currentMask[aulaIdx] = !currentMask[aulaIdx]

            // Recalcula qtd_faltas apenas para display local
            const newQtd = currentMask.filter(Boolean).length

            return {
                ...e,
                faltas_mask: currentMask,
                qtd_faltas: newQtd
            }
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            // Prepara payload de faltas
            // Envia apenas quem tem faltas ou máscara processada
            const faltasData = estudantes
                .filter(e => e.faltas_mask.some(Boolean))
                .map(e => ({
                    estudante_id: e.id,
                    faltas_mask: e.faltas_mask
                }))

            const payload = {
                professor_disciplina_turma_id: professorDisciplinaTurmaId, // Necessário no create
                data: data,
                conteudo: conteudo,
                numero_aulas: numeroAulas,
                faltas_data: faltasData
            }

            if (isEditing) {
                await pedagogicalAPI.aulasFaltas.update(id, payload)
                toast.success('Aula atualizada com sucesso!')
            } else {
                await pedagogicalAPI.aulasFaltas.create(payload)
                toast.success('Aula registrada com sucesso!')
            }

            navigate('/aula-faltas')
        } catch (error) {
            console.error('Erro ao salvar:', error)
            toast.error('Erro ao salvar registro de aula.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <Loading />
    if (error) return (
        <div className="p-8 text-center">
            <p className="text-rose-500 mb-4">{error}</p>
            <Button onClick={() => navigate('/aula-faltas')}>Voltar</Button>
        </div>
    )

    // Badge de status do estudante
    const StatusBadge = ({ status }) => {
        if (status === 'PROMOVIDO') return <Badge className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-[10px]">PROM</Badge>
        if (status === 'RETIDO') return <Badge className="bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400 text-[10px]">RET</Badge>
        return null
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                            {isEditing ? 'Editar Registro de Aula' : 'Novo Registro de Aula'}
                        </h1>
                        <p className="text-slate-500 text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-medium text-primary-600 dark:text-primary-400">{turma?.nome}</span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span>{disciplina?.disciplina_nome}</span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">
                                {formatDateBR(data)}
                            </span>
                            {bimestre !== null && (
                                <>
                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                    <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">
                                        {bimestre === 0 ? 'ANUAL' : `${bimestre}º BIMESTRE`}
                                    </span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* Conteúdo da Aula */}
                <Card hover={false} className="overflow-hidden border-none shadow-premium">
                    <div className="p-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Aulas dadas</label>
                                <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{numeroAulas} {numeroAulas === 1 ? 'aula' : 'aulas'}</p>
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                                O que foi ensinado hoje?
                            </label>
                            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500/50 transition-all">
                                <textarea
                                    className="w-full h-32 p-4 resize-none bg-transparent focus:outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                                    placeholder="Descreva o conteúdo trabalhado..."
                                    value={conteudo}
                                    onChange={(e) => setConteudo(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Lista de Chamada */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                        {estudantes.map((estudante, idx) => (
                            <div
                                key={estudante.id}
                                className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between border border-slate-200/60 dark:border-slate-700/50 hover:border-primary-200 dark:hover:border-primary-800/50 transition-colors duration-200 group"
                            >
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                    <span className="text-xs font-bold text-slate-300 dark:text-slate-600 w-6 tabular-nums">
                                        {(idx + 1).toString().padStart(2, '0')}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                            {estudante.nome}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {estudante.status && <StatusBadge status={estudante.status} />}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-4">
                                    {Array.from({ length: numeroAulas }, (_, aulaIdx) => {
                                        const isFalta = estudante.faltas_mask
                                            ? estudante.faltas_mask[aulaIdx]
                                            : false

                                        return (
                                            <div key={aulaIdx} className="relative pb-1">
                                                <button
                                                    type="button" // Importante: type button para não submumeter o form
                                                    onClick={() => toggleAulaFalta(estudante.id, aulaIdx)}
                                                    className={`
                                                            relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-xs font-bold
                                                            flex flex-col items-center justify-center gap-0.5
                                                            transition-all duration-200 border-2
                                                            ${isFalta
                                                            ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400 shadow-sm'
                                                            : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400 shadow-sm'
                                                        }
                                                            hover:scale-105 active:scale-95
                                                        `}
                                                    title={`Aula ${aulaIdx + 1}: ${isFalta ? 'Falta' : 'Presença'}`}
                                                >
                                                    <span className="text-sm leading-none">{isFalta ? 'F' : 'C'}</span>
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <FormActionsProfessor
                    saving={submitting}
                    isEditing={isEditing}
                    entityName="Aula"
                    saveLabel={isEditing ? "Salvar Alterações" : "Registrar Aula"}
                />
            </form>
        </div>
    )
}
