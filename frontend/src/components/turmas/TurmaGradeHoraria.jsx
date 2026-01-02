import { useState, useEffect } from 'react'
import { HiPencil, HiTable } from 'react-icons/hi'
import { coreAPI } from '../../services/api'
import { Button, Loading } from '../ui'
import GradeHorariaForm from '../../pages/GradeHorariaForm'
import GradeHorariaDetalhes from '../../pages/GradeHorariaDetalhes'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Componente container da aba "Grade Horária" em TurmaDetalhes.
 * 
 * Carrega dados de edição em uma única requisição via endpoint consolidado.
 * Exibe a grade horária da turma atual e também de turmas relacionadas.
 * 
 * @param {Object} props
 * @param {Object} props.turma - Dados da turma
 */
export default function TurmaGradeHoraria({ turma }) {
    const { user } = useAuth()
    const [view, setView] = useState('detalhes') // 'detalhes' or 'form'
    const [loading, setLoading] = useState(true)

    // Dados retornados do endpoint consolidado
    const [turmas, setTurmas] = useState([])
    const [disciplinas, setDisciplinas] = useState([])
    const [grades, setGrades] = useState([])
    const [horariosAula, setHorariosAula] = useState([])

    const isGestao = user?.tipo_usuario === 'GESTAO'

    useEffect(() => {
        if (turma?.id) {
            loadData()
        }
    }, [turma?.id])

    const loadData = async () => {
        try {
            setLoading(true)

            // Requisição única para todos os dados
            const { data } = await coreAPI.gradesHorarias.dadosEdicao(turma.id)

            setTurmas(data.turmas || [])
            setDisciplinas(data.disciplinas || [])
            setGrades(data.grades || [])
            setHorariosAula(data.horarios_aula || [])

        } catch (error) {
            console.error('Erro ao carregar grade horária:', error)
            toast.error('Erro ao carregar grade horária')
        } finally {
            setLoading(false)
        }
    }

    // Prepara dados para o componente de detalhes (compatibilidade)
    const gradesParaDetalhes = grades.map(g => {
        const horario = horariosAula.find(h => h.id === g.horario_aula)
        const disciplina = disciplinas.find(d => d.id === g.disciplina)
        const turmaInfo = turmas.find(t => t.id === g.turma)

        return {
            ...g,
            horario_aula_details: horario ? {
                id: horario.id,
                numero: horario.numero,
                dia_semana: horario.dia_semana,
                dia_semana_display: horario.dia_semana_display,
                hora_inicio: horario.hora_inicio,
                hora_fim: horario.hora_fim,
            } : null,
            disciplina_details: disciplina ? {
                id: disciplina.id,
                nome: disciplina.nome,
                sigla: disciplina.sigla,
                professor_nome: disciplina.professor_nome,
            } : null,
            turma_info: turmaInfo ? {
                id: turmaInfo.id,
                nome: turmaInfo.nome,
                curso_sigla: turmaInfo.curso_sigla,
            } : null,
        }
    })

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loading size="lg" />
            </div>
        )
    }

    if (horariosAula.length === 0) {
        return (
            <div className="text-center py-12 space-y-4">
                <HiTable className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600" />
                <div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                        Nenhum horário de aula configurado
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Configure os horários de aula em <strong>Configurações → Horário de Aula</strong> antes de montar a grade.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <HiTable className="text-primary-600" />
                        Grade Horária
                        {turmas.length > 1 && (
                            <span className="text-sm font-normal text-slate-500 ml-2">
                                ({turmas.length} turmas)
                            </span>
                        )}
                    </h2>
                    <p className="text-slate-500 text-sm">
                        Visualize ou edite a distribuição de disciplinas por horário.
                    </p>
                </div>
                {view === 'detalhes' && isGestao && (
                    <Button onClick={() => setView('form')} icon={HiPencil}>
                        Editar Grade
                    </Button>
                )}
            </div>

            {view === 'detalhes' ? (
                <GradeHorariaDetalhes
                    grades={gradesParaDetalhes}
                    horariosAula={horariosAula}
                />
            ) : (
                <GradeHorariaForm
                    turmaId={turma.id}
                    turmas={turmas}
                    disciplinas={disciplinas}
                    grades={grades}
                    horariosAula={horariosAula}
                    onCancel={() => setView('detalhes')}
                    onSuccess={() => {
                        setView('detalhes')
                        loadData()
                    }}
                />
            )}
        </div>
    )
}
