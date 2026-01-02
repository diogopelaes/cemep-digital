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
 * @param {Object} props
 * @param {Object} props.turma - Dados da turma
 */
export default function TurmaGradeHoraria({ turma }) {
    const { user } = useAuth()
    const [view, setView] = useState('detalhes') // 'detalhes' or 'form'
    const [loading, setLoading] = useState(true)
    const [grades, setGrades] = useState([])
    const [horariosAula, setHorariosAula] = useState([])
    const [disciplinas, setDisciplinas] = useState([])

    const isGestao = user?.tipo_usuario === 'GESTAO'

    useEffect(() => {
        if (turma?.id) {
            loadData()
        }
    }, [turma?.id])

    const loadData = async () => {
        try {
            setLoading(true)

            // Busca grades horárias da turma
            const { data: gradesData } = await coreAPI.gradesHorarias.list({ turma: turma.id })
            const gradesArray = Array.isArray(gradesData) ? gradesData : (gradesData.results || [])
            setGrades(gradesArray)

            // Busca horários de aula do ano letivo da turma
            const { data: horariosData } = await coreAPI.horariosAula.list({ ano_letivo__ano: turma.ano_letivo })
            const horariosArray = Array.isArray(horariosData) ? horariosData : (horariosData.results || [])
            setHorariosAula(horariosArray)

            // Busca disciplinas vinculadas à turma
            const { data: disciplinasData } = await coreAPI.disciplinasTurma.list({ turma: turma.id })
            const disciplinasArray = Array.isArray(disciplinasData) ? disciplinasData : (disciplinasData.results || [])
            // Extrai apenas os dados da disciplina
            const disciplinasVinculadas = disciplinasArray.map(dt => dt.disciplina_details || {
                id: dt.disciplina,
                nome: `Disciplina ${dt.disciplina}`,
                sigla: '?'
            })
            setDisciplinas(disciplinasVinculadas)

        } catch (error) {
            console.error('Erro ao carregar grade horária:', error)
            toast.error('Erro ao carregar grade horária')
        } finally {
            setLoading(false)
        }
    }

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
                    grades={grades}
                    horariosAula={horariosAula}
                />
            ) : (
                <GradeHorariaForm
                    turma={turma}
                    grades={grades}
                    horariosAula={horariosAula}
                    disciplinas={disciplinas}
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
