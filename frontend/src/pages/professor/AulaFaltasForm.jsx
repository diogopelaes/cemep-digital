import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Card, Button, Loading, Badge, FormActions } from '../../components/ui'
import { HiCheck, HiX, HiArrowLeft } from 'react-icons/hi'
import { pedagogicalAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { formatDateBR } from '../../utils/date'

export default function AulaFaltasForm() {
    const navigate = useNavigate()
    const { id, professorDisciplinaTurmaId } = useParams()
    const location = useLocation()
    const isEditing = !!id

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [syncStatus, setSyncStatus] = useState('saved') // 'saved', 'saving', 'error'

    // Dados da aula
    const [aulaId, setAulaId] = useState(id || null)
    const [conteudo, setConteudo] = useState('')
    const [numeroAulas, setNumeroAulas] = useState(2)
    const [data, setData] = useState('')
    const [turma, setTurma] = useState(null)
    const [disciplina, setDisciplina] = useState(null)

    // Lista de estudantes com faltas
    const [estudantes, setEstudantes] = useState([])

    // Debounce ref para auto-save
    const saveTimeoutRef = useRef(null)
    const pendingUpdatesRef = useRef({})

    useEffect(() => {
        loadData()

        return () => {
            // Cleanup: salva pendências ao sair
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [id, professorDisciplinaTurmaId])

    const loadData = async () => {
        setLoading(true)
        try {
            if (isEditing) {
                // Edição: carregar aula existente
                const [aulaRes, estudantesRes] = await Promise.all([
                    pedagogicalAPI.aulasFaltas.get(id),
                    pedagogicalAPI.aulasFaltas.estudantes(id)
                ])

                const aula = aulaRes.data
                setAulaId(aula.id)
                setConteudo(aula.conteudo || '')
                setNumeroAulas(aula.numero_aulas)
                setData(aula.data)
                setTurma({ nome: aula.turma_nome })
                setDisciplina({ disciplina_nome: aula.disciplina_nome })
                setEstudantes(estudantesRes.data)
            } else {
                // Nova aula: usar dados do state
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

                // Carregar estudantes da turma
                const res = await pedagogicalAPI.aulasFaltas.estudantesPorTurma(professorDisciplinaTurmaId)
                setEstudantes(res.data.estudantes || [])
            }
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar dados.')
            navigate('/aula-faltas')
        }
        setLoading(false)
    }

    // Auto-save para faltas com debounce
    const autoSaveFalta = useCallback((estudanteId, faltasMask) => {
        if (!aulaId) {
            // Nota: Se a aula não existe, a gente teria que salvar a mask em pending,
            // mas o create original ainda espera qtd_faltas ou faltas_data array.
            // Vamos ajustar o create também.
            pendingUpdatesRef.current[estudanteId] = faltasMask
            return
        }

        setSyncStatus('saving')

        // Debounce
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await pedagogicalAPI.aulasFaltas.atualizarFaltas(aulaId, {
                    estudante_id: estudanteId,
                    faltas_mask: faltasMask
                })
                setSyncStatus('saved')
            } catch (error) {
                console.error(error)
                setSyncStatus('error')
                toast.error('Erro ao salvar falta')
            }
        }, 800)
    }, [aulaId])

    // Toggle de presença para uma aula específica
    const togglePresenca = (estudanteId, aulaIndex, currentTotal) => {
        const estudante = estudantes.find(e => e.id === estudanteId)
        if (!estudante) return

        // Calcula nova quantidade baseado no toggle
        // Se estava presente nessa aula (bit não estava setado), agora falta
        // Usamos uma lógica simples: cada toggle alterna +1 ou -1
        const currentQtd = estudante.qtd_faltas || 0

        // Verifica se a aula já está marcada como falta
        // Lógica: se qtd_faltas >= aulaIndex + 1, significa que tem falta nessa aula
        // Na verdade, vamos simplificar: o botão C significa todas as aulas presentes
        // O botão F incrementa a falta daquela aula

        // Nova lógica mais simples: cada aula tem seu próprio estado
        // Armazenamos como bitmask ou contador simples
        // Por simplicidade, usamos contador linear

        let newQtd = currentQtd

        // Se clicar no botão da aula específica, toggle falta dessa aula
        // aulaIndex vai de 0 a numeroAulas-1
        // Se a falta atual é >= aulaIndex+1, significa que tem falta nessa posição
        // Na verdade, vamos usar uma abordagem mais direta:
        // qtd_faltas representa quantas aulas o aluno faltou
        // Se clicar em F em aula 1, adiciona 1 falta
        // Se clicar em C na mesma aula, remove 1 falta

        // Determinamos se essa aula específica era falta ou presença
        // Problema: com qtd_faltas = 1, não sabemos QUAL aula foi a falta
        // Solução: tratamos como toggle sequencial - F adiciona, C remove

        // Simplificação para MVP: C marca todas presente, F marca todas falta
        // Botões individuais: C/F toggles por aula

        // Para este MVP, vamos usar:
        // - Cada estudante tem N botões (1 por aula)
        // - Clicar em F incrementa qtd_faltas (máximo = numeroAulas)
        // - Clicar em C decrementa qtd_faltas (mínimo = 0)

        // Vamos criar uma abordagem mais intuitiva:
        // Mostramos uma checkbox ou botão toggle para cada aula
        // O estado visual reflete se o aluno faltou ou não

        // Por enquanto, usamos um contador simples
        // Cada clique em F adiciona falta, cada clique em C remove

        autoSaveFalta(estudanteId, newQtd)
    }

    // Toggle simples: F adiciona, C remove
    const handleFaltaClick = (estudanteId, action) => {
        const estudante = estudantes.find(e => e.id === estudanteId)
        if (!estudante) return

        const currentQtd = estudante.qtd_faltas || 0
        let newQtd = currentQtd

        if (action === 'add' && currentQtd < numeroAulas) {
            newQtd = currentQtd + 1
        } else if (action === 'remove' && currentQtd > 0) {
            newQtd = currentQtd - 1
        }

        if (newQtd !== currentQtd) {
            // Atualiza UI imediatamente
            setEstudantes(prev => prev.map(e =>
                e.id === estudanteId ? { ...e, qtd_faltas: newQtd } : e
            ))

            autoSaveFalta(estudanteId, newQtd)
        }
    }

    // Inicializa a máscara de faltas quando os estudantes são carregados
    useEffect(() => {
        if (estudantes.length > 0 && numeroAulas > 0) {
            // Verifica se precisamos inicializar a máscara
            // Só inicializa se não tiver sido feito ainda ou se qtd_faltas mudou externamente (não via toggle)
            setEstudantes(prev => prev.map(e => {
                // Se já tem máscara compatível, mantém
                if (e.faltas_mask && e.faltas_mask.length === numeroAulas) return e

                // Senão, inicializa sequencialmente baseada no qtd_faltas
                // Ex: qtd=2, n=4 -> [T, T, F, F]
                const mask = Array.from({ length: numeroAulas }, (_, i) => i < (e.qtd_faltas || 0))
                return { ...e, faltas_mask: mask }
            }))
        }
    }, [numeroAulas, estudantes.length]) // Dependências simplificadas para evitar loop infinito

    // Toggle individual de cada aula (COMPORTAMENTO INDEPENDENTE)
    const toggleAulaFalta = (estudanteId, aulaIndex) => { // aulaIndex é 0-based
        setEstudantes(prev => prev.map(e => {
            if (e.id !== estudanteId) return e

            // Clona a máscara ou cria nova se não existir
            const currentMask = e.faltas_mask ? [...e.faltas_mask] : Array.from({ length: numeroAulas }, (_, i) => i < (e.qtd_faltas || 0))

            // Toggle do valor específico
            currentMask[aulaIndex] = !currentMask[aulaIndex]

            // Recalcula total de faltas (apenas para exibição na UI se necessário)
            const newQtd = currentMask.filter(Boolean).length

            // Agenda auto-save enviando a máscara
            autoSaveFalta(estudanteId, currentMask)

            return {
                ...e,
                faltas_mask: currentMask,
                qtd_faltas: newQtd
            }
        }))
    }

    const handleSave = async () => {
        if (!conteudo.trim()) {
            return toast.error('Preencha o conteúdo da aula')
        }

        setSaving(true)

        try {
            // Prepara dados das faltas
            const faltasData = estudantes
                .filter(e => e.qtd_faltas > 0)
                .map(e => {
                    // Se tiver máscara, manda ela. Se não tiver (carregado do banco sequencialmente),
                    // cria uma sequencial básica.
                    const mask = e.faltas_mask || Array.from({ length: numeroAulas }, (_, i) => i < e.qtd_faltas)

                    return {
                        estudante_id: e.id,
                        faltas_mask: mask
                        // O backend calculará qtd_faltas
                    }
                })

            if (isEditing) {
                // Atualiza aula existente
                await pedagogicalAPI.aulasFaltas.update(aulaId, {
                    conteudo,
                    numero_aulas: numeroAulas,
                    faltas_data: faltasData
                })
                toast.success('Aula atualizada!')
            } else {
                // Cria nova aula
                const res = await pedagogicalAPI.aulasFaltas.create({
                    professor_disciplina_turma_id: professorDisciplinaTurmaId,
                    data,
                    conteudo,
                    numero_aulas: numeroAulas,
                    faltas_data: faltasData
                })
                setAulaId(res.data.id)
                toast.success('Aula registrada!')
            }

            navigate('/aula-faltas')
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar aula')
        }

        setSaving(false)
    }

    // Badge de status do estudante
    const StatusBadge = ({ status }) => {
        if (status === 'PROMOVIDO') {
            return <Badge className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-[10px] ml-2">PROM</Badge>
        }
        if (status === 'RETIDO') {
            return <Badge className="bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400 text-[10px] ml-2">RET</Badge>
        }
        return null
    }

    // Indicador de sincronização
    const SyncIndicator = () => {
        if (syncStatus === 'saving') {
            return <span className="text-xs text-amber-500 animate-pulse">Salvando...</span>
        }
        if (syncStatus === 'error') {
            return <span className="text-xs text-danger-500">Erro ao salvar</span>
        }
        return <span className="text-xs text-success-500">Salvo</span>
    }

    if (loading) return <Loading />

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 lg:p-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <button
                            onClick={() => navigate('/aula-faltas')}
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                        >
                            <HiArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                            {isEditing ? 'Editar Aula' : 'Registrar Aula'}
                        </h1>
                    </div>
                    <p className="text-slate-500 text-sm ml-8">
                        {turma?.nome} • {disciplina?.disciplina_nome} • {formatDateBR(data)}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <SyncIndicator />
                </div>
            </div>

            {/* Resumo e Conteúdo */}
            <Card hover={false}>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span><strong>Data:</strong> {formatDateBR(data)}</span>
                        <span><strong>Aulas:</strong> {numeroAulas}</span>
                    </div>

                    <div>
                        <label className="label">Conteúdo da Aula</label>
                        <textarea
                            className="input min-h-[120px] resize-none"
                            placeholder="Descreva o conteúdo ministrado..."
                            value={conteudo}
                            onChange={(e) => setConteudo(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Lista de Chamada */}
            <Card hover={false}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                        Lista de Chamada
                    </h2>
                    <span className="text-sm text-slate-500">
                        {estudantes.filter(e => e.qtd_faltas > 0).length} falta(s) registrada(s)
                    </span>
                </div>

                {/* Legenda */}
                <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
                    <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-success-500/10 border border-success-200 text-success-600 flex items-center justify-center font-bold">
                            C
                        </span>
                        Compareceu
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-danger-500/10 border border-danger-200 text-danger-600 flex items-center justify-center font-bold">
                            F
                        </span>
                        Faltou
                    </span>
                </div>

                {/* Lista de Estudantes */}
                <div className="space-y-2">
                    {estudantes.map((estudante, idx) => (
                        <div
                            key={estudante.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-xs text-slate-400 w-6 text-right">
                                    {idx + 1}.
                                </span>
                                <span className="text-sm font-medium text-slate-800 dark:text-white truncate">
                                    {estudante.nome}
                                </span>
                                <StatusBadge status={estudante.status} />
                            </div>

                            <div className="flex items-center gap-2 ml-2">
                                {Array.from({ length: numeroAulas }, (_, aulaIdx) => {
                                    // Usa a máscara se disponível, senão fallback para lógica sequencial antiga
                                    const isFalta = estudante.faltas_mask
                                        ? estudante.faltas_mask[aulaIdx]
                                        : (estudante.qtd_faltas || 0) > aulaIdx

                                    return (
                                        <button
                                            key={aulaIdx}
                                            onClick={() => toggleAulaFalta(estudante.id, aulaIdx)}
                                            className={`
                                                w-9 h-9 rounded-lg text-sm font-bold
                                                transition-all duration-200
                                                flex items-center justify-center
                                                border
                                                ${isFalta
                                                    ? 'bg-danger-500/10 text-danger-600 border-danger-200 hover:bg-danger-500/20 dark:bg-danger-500/20 dark:text-danger-400 dark:border-danger-800'
                                                    : 'bg-success-500/10 text-success-600 border-success-200 hover:bg-success-500/20 dark:bg-success-500/20 dark:text-success-400 dark:border-success-800'
                                                }
                                            `}
                                            title={`Aula ${aulaIdx + 1}: ${isFalta ? 'Falta - clique para marcar presença' : 'Presente - clique para marcar falta'}`}
                                        >
                                            {isFalta ? 'F' : 'C'}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </Card >

            {/* Botões de Ação */}
            < FormActions
                cancelTo="/aula-faltas"
                saving={saving}
                saveLabel="Salvar Aula"
                onSave={handleSave}
            />
        </div >
    )
}
