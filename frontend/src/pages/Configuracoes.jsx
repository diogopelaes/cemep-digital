import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HiCalendar, HiUserGroup, HiAcademicCap, HiClock } from 'react-icons/hi'
import CalendarioTab from '../components/configuracoes/CalendarioTab'
import HorarioAulaTab from '../components/configuracoes/HorarioAulaTab'
import { coreAPI } from '../services/api'

export default function Configuracoes() {
    const [searchParams] = useSearchParams()
    const [activeTab, setActiveTab] = useState(() => {
        return searchParams.get('tab') || 'calendario'
    })
    const [hasActiveCalendar, setHasActiveCalendar] = useState(false)

    useEffect(() => {
        checkCalendar()
    }, [])

    const checkCalendar = async () => {
        try {
            const { data } = await coreAPI.anosLetivos.list()
            const lista = Array.isArray(data) ? data : (data.results || [])
            if (lista.length > 0) setHasActiveCalendar(true)
        } catch (e) {
            console.error(e)
        }
    }

    const tabs = [
        { id: 'calendario', label: 'Calendário', icon: HiCalendar },
        ...(hasActiveCalendar ? [{ id: 'horarios', label: 'Horários de Aula', icon: HiClock }] : []),
        { id: 'professores', label: 'Controle de Professores', icon: HiAcademicCap },
        { id: 'estudantes', label: 'Controle - Estudantes/Responsáveis', icon: HiUserGroup },
    ]

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                Configurações do Sistema
            </h1>

            {/* Tabs Navigation */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    const Icon = tab.icon

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${isActive
                                ? 'text-primary-600 border-primary-500'
                                : 'text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <Icon className="h-5 w-5" />
                            <span>{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="glass p-6 rounded-2xl min-h-[400px]">
                {activeTab === 'calendario' && <CalendarioTab />}
                {activeTab === 'horarios' && hasActiveCalendar && <HorarioAulaTab />}

                {activeTab === 'professores' && (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                        Controle de Professores em desenvolvimento...
                    </div>
                )}

                {activeTab === 'estudantes' && (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                        Controle de Estudantes/Responsáveis em desenvolvimento...
                    </div>
                )}
            </div>
        </div>
    )
}
