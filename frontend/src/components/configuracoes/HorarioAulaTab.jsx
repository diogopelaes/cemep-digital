import { useState, useEffect } from 'react'
import { HiPlus, HiPencil, HiTrash, HiClock } from 'react-icons/hi'
import { coreAPI } from '../../services/api'
import { Button, Loading, Badge } from '../ui'
import HorarioAulaForm from '../../pages/HorarioAulaForm'
import HorarioAulaDetalhes from '../../pages/HorarioAulaDetalhes'
import { toast } from 'react-hot-toast'

export default function HorarioAulaTab() {
    const [view, setView] = useState('list') // list (actually details) or form
    const [activeAno, setActiveAno] = useState(null)
    const [loading, setLoading] = useState(true)
    const [horarios, setHorarios] = useState([])

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            // Need to find the active year first or the selected year. 
            // The requirement says "ao carregar um Horario de Aula esse deve ser o que relacionamento com o calendário ativo"
            // So we fetch anos first.
            const { data: anosData } = await coreAPI.anosLetivos.list()
            const lista = Array.isArray(anosData) ? anosData : (anosData.results || [])
            // Assuming the "active" calendar is the one marked is_active=True or just the most recent one? 
            // "só mostre a opção da aba de Horario das aulas se houver um Calendário ativo." 
            // Usually is_active is a boolean field.
            const ativo = lista.find(a => a.is_active) || lista.sort((a, b) => b.ano - a.ano)[0]

            if (ativo) {
                setActiveAno(ativo)
                // Fetch horarios for this ano
                const { data: horariosData } = await coreAPI.horariosAula.list({ ano_letivo: ativo.ano })
                const horariosArray = Array.isArray(horariosData) ? horariosData : (horariosData.results || [])
                console.log('HorarioAulaTab - Horarios recebidos:', horariosArray)
                setHorarios(horariosArray)
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            toast.error('Erro ao carregar horário de aulas')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <Loading />

    if (!activeAno) {
        return (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                Não há um ano letivo ativo para configurar horários.
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <HiClock className="text-brand-600" />
                        Horários de Aula - {activeAno.ano}
                    </h2>
                    <p className="text-slate-500 text-sm">
                        Defina a grade de horários para o ano letivo.
                    </p>
                </div>
                {view === 'list' && (
                    <Button
                        onClick={() => setView('form')}
                        icon={horarios.length > 0 ? HiPencil : HiPlus}
                    >
                        {horarios.length > 0 ? 'Editar Horários' : 'Criar Horários'}
                    </Button>
                )}
            </div>

            {view === 'list' ? (
                <HorarioAulaDetalhes horarios={horarios} />
            ) : (
                <HorarioAulaForm
                    anoLetivo={activeAno}
                    existingHorarios={horarios}
                    onCancel={() => setView('list')}
                    onSuccess={() => {
                        setView('list')
                        loadData()
                    }}
                />
            )}
        </div>
    )
}
