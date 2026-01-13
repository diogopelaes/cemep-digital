import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Card, Button, Loading, Badge, FormActionsProfessor } from '../../components/ui'
import { pedagogicalAPI, academicAPI } from '../../services/api'
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
    const [planosAula, setPlanosAula] = useState([])

    // Expandable Card State (tracks which student is expanded and their photo)
    const [expandedStudentId, setExpandedStudentId] = useState(null)
    const [expandedStudentData, setExpandedStudentData] = useState(null)
    const [loadingExpanded, setLoadingExpanded] = useState(false)

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
                setTurma({
                    id: aula.turma_id,
                    nome: aula.turma_nome
                })
                setDisciplina({
                    id: aula.disciplina_id,
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

                setTurma({
                    id: stateData.turma?.id || stateData.turmaId,
                    nome: stateData.turma?.nome || stateData.turmaNome
                })

                setDisciplina({
                    id: stateData.disciplina?.id || stateData.disciplina?.professor_disciplina_turma_id || stateData.disciplinaId,
                    disciplina_nome: stateData.disciplina?.disciplina_nome || stateData.disciplina?.nome || stateData.disciplinaNome,
                    disciplina_sigla: stateData.disciplina?.disciplina_sigla || stateData.disciplina?.sigla || stateData.disciplinaSigla
                })

                setBimestre(null)

                // Carregar estudantes da turma
                const res = await pedagogicalAPI.aulasFaltas.estudantesPorTurma(professorDisciplinaTurmaId)
                setEstudantes(processFaltasMask(res.data.estudantes || [], stateData.numeroAulas))

                // Tenta identificar o bimestre pela data
                try {
                    const checkRes = await pedagogicalAPI.aulasFaltas.verificarDataRegistro(stateData.data)
                    if (checkRes.data && checkRes.data.valida) {
                        setBimestre(checkRes.data.bimestre)
                    }
                } catch (e) {
                    console.error("Erro ao verificar bimestre", e)
                }
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

    useEffect(() => {
        if (!loading && estudantes.length > 0) {
            setEstudantes(prev => processFaltasMask(prev, numeroAulas))
        }
    }, [numeroAulas]) // Apenas quando mudar o número de aulas manualmente

    // Busca planos de aula sempre que data ou contexto de turma/disciplina mudarem
    useEffect(() => {
        const fetchPlanos = async () => {
            // Verifica se temos os dados mínimos para buscar
            // isEditing: aula.disciplina_id vem do serializer modificado
            // New: stateData.disciplina.disciplina_id (precisa verificar estrutura)

            // Precisamos do ID da disciplina e ID da turma. 
            // disciplina e turma no state são objetos parciais {nome, sigla} ou {nome}.
            // Mas precisamos ids reais.

            // Melhor estratégia: pegar disciplina_id e turma_id do contexto carregado.
            // O loadData setou 'disciplina' e 'turma'. Em edit, vem do serializer.
            // Vou ajustar loadData para garantir salvar IDs no state disciplina/turma.

            if (!data || !disciplina?.id || !turma?.id) return;

            try {
                const params = {
                    data: data,
                    disciplina_id: disciplina.id,
                    turma_id: turma.id
                }
                const res = await pedagogicalAPI.planosAula.list(params)
                setPlanosAula(res.data.results || res.data || [])
            } catch (error) {
                console.error("Erro ao buscar planos de aula:", error)
            }
        }

        fetchPlanos()
    }, [data, disciplina, turma])

    const handlePlanoSelect = (planoId) => {
        const plano = planosAula.find(p => p.id === planoId)
        if (!plano) return

        // Formata o conteúdo
        let novoConteudo = plano.conteudo || ''

        // Adiciona habilidades (siglas)
        if (plano.habilidades_detalhes && plano.habilidades_detalhes.length > 0) {
            const siglas = plano.habilidades_detalhes.map(h => h.codigo).join(', ')
            novoConteudo += `\n\nHabilidades: ${siglas}`
        }

        // Se usar CKEditor ou similar que salva HTML, pode precisar tratar tags <p>
        // Mas o componente parece usar textarea simples, então \n funciona.
        // Se o plano.conteudo vier com HTML (RichText), vai aparecer tags no textarea.
        // O model diz RichTextField, então vem HTML. 
        // O textarea mostra HTML cru? O usuario pediu "Isso é pra ser bem simples!".
        // Se o textarea for raw text, vamos fazer um strip simples ou apenas jogar o valor.

        // Strip tags básico (opcional, se o usuário reclamar de tags HTML no textarea)
        const stripHtml = (html) => {
            let tmp = document.createElement("DIV");
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || "";
        }

        const textoConteudo = stripHtml(novoConteudo)

        // Se quiser manter formatação, teria que usar um editor. 
        // Mas como o request é "colocar o conteudo... dentro do campo... simples", 
        // e o campo é um textarea, vou converter para texto puro para ficar legível.

        // Recriação do conteúdo com habilidades limpo
        const conteudoLimpo = stripHtml(plano.conteudo || '')
        let textoFinal = conteudoLimpo

        if (plano.habilidades_detalhes && plano.habilidades_detalhes.length > 0) {
            const siglas = plano.habilidades_detalhes.map(h => h.codigo).join(', ')
            textoFinal += `\n\nHabilidades: ${siglas}`
        }

        setConteudo(textoFinal)
    }

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

    const handleStudentClick = async (studentId) => {
        // If clicking the same student, collapse
        if (expandedStudentId === studentId) {
            setExpandedStudentId(null)
            setExpandedStudentData(null)
            return
        }

        // Expand and fetch photo
        setExpandedStudentId(studentId)
        setExpandedStudentData(null)
        setLoadingExpanded(true)

        try {
            const res = await academicAPI.estudantes.get(studentId)
            setExpandedStudentData(res.data)
        } catch (error) {
            console.error("Erro ao carregar estudante", error)
            toast.error("Erro ao carregar foto.")
        } finally {
            setLoadingExpanded(false)
        }
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

    const estudantesComFalta = estudantes.filter(e => e.faltas_mask && e.faltas_mask.some(Boolean)).length

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
                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                    <span className={`font-medium ${estudantesComFalta > 0 ? 'text-warning-600 dark:text-warning-400' : 'text-success-600 dark:text-success-400'}`}>
                                        {estudantesComFalta > 0
                                            ? `${estudantesComFalta} ${estudantesComFalta === 1 ? 'estudante com falta' : 'estudantes com falta'}`
                                            : 'Sem faltas'
                                        }
                                    </span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* Conteúdo da Aula */}
                <Card hover={false} className="overflow-hidden border-none shadow-premium">
                    <div className="p-1">

                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                                Selecionar Plano de Aula
                            </label>
                            {planosAula.length > 0 ? (
                                <select
                                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    onChange={(e) => handlePlanoSelect(e.target.value)}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Selecione um plano de aula...</option>
                                    {planosAula.map(plano => (
                                        <option key={plano.id} value={plano.id}>
                                            {plano.titulo}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400 ml-1 italic">
                                    Nenhum plano de aula encontrado para esta data.
                                </p>
                            )}
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
                        {estudantes.map((estudante, idx) => {
                            const isExpanded = expandedStudentId === estudante.id
                            const studentData = isExpanded ? expandedStudentData : null

                            return (
                                <div
                                    key={estudante.id}
                                    className={`
                                        bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 
                                        border border-slate-200/60 dark:border-slate-700/50 
                                        transition-colors duration-200 group
                                        ${isExpanded ? 'ring-2 ring-primary-400' : 'hover:border-primary-200 dark:hover:border-primary-800/50'}
                                    `}
                                >
                                    <div className={`flex ${isExpanded ? 'flex-col sm:flex-row sm:items-center gap-4' : 'items-center justify-between'}`}>

                                        {/* Left Side: Number + Photo/Name Section */}
                                        <div className={`flex ${isExpanded ? 'flex-col sm:flex-row items-center sm:text-left text-center gap-4 flex-1' : 'items-center gap-3 sm:gap-4 min-w-0 flex-1'}`}>
                                            <span className="text-xs font-bold text-slate-300 dark:text-slate-600 w-6 tabular-nums">
                                                {(estudante.numero_chamada && estudante.numero_chamada !== 0)
                                                    ? estudante.numero_chamada.toString().padStart(2, '0')
                                                    : (idx + 1).toString().padStart(2, '0')}
                                            </span>

                                            {isExpanded && (
                                                <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-600 shrink-0 bg-slate-100 dark:bg-slate-700">
                                                    {loadingExpanded ? (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Loading size="sm" />
                                                        </div>
                                                    ) : studentData?.foto ? (
                                                        <img
                                                            src={studentData.foto}
                                                            alt={studentData.nome_social || studentData.usuario?.first_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <span className="text-3xl text-slate-400 font-bold">
                                                                {(estudante.nome || '?').charAt(0)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="min-w-0 flex-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleStudentClick(estudante.id)}
                                                    className={`focus:outline-none w-full ${isExpanded ? 'text-center sm:text-left' : 'text-left'}`}
                                                >
                                                    <p className={`
                                                        font-bold text-slate-700 dark:text-slate-200 
                                                        group-hover:text-primary-600 dark:group-hover:text-primary-400 
                                                        transition-colors
                                                        ${isExpanded ? 'text-lg sm:text-xl' : 'text-sm truncate'}
                                                    `}>
                                                        {isExpanded && studentData
                                                            ? (studentData.nome_social || `${studentData.usuario?.first_name || ''} ${studentData.usuario?.last_name || ''}`.trim() || estudante.nome)
                                                            : estudante.nome
                                                        }
                                                    </p>
                                                </button>
                                                {estudante.status && (
                                                    <div className={`mt-1 ${isExpanded ? 'flex justify-center sm:justify-start' : ''}`}>
                                                        <StatusBadge status={estudante.status} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Side: Absence buttons */}
                                        <div className={`flex items-center gap-2 sm:gap-3 shrink-0 ${isExpanded ? 'justify-center ml-0' : 'ml-4'}`}>
                                            {Array.from({ length: numeroAulas }, (_, aulaIdx) => {
                                                const isFalta = estudante.faltas_mask
                                                    ? estudante.faltas_mask[aulaIdx]
                                                    : false

                                                return (
                                                    <div key={aulaIdx} className="relative pb-1">
                                                        <button
                                                            type="button"
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
                                </div>
                            )
                        })}
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

