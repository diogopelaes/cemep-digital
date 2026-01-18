import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HiCalendar, HiClock, HiAdjustments, HiAcademicCap, HiClipboardList, HiExclamationCircle } from 'react-icons/hi'
import CalendarioTab from '../../components/configuracoes/CalendarioTab'
import HorarioAulaTab from '../../components/configuracoes/HorarioAulaTab'
import ControleTab from '../../components/configuracoes/ControleTab'
import HabilidadesTab from '../../components/configuracoes/HabilidadesTab'
import IndicadoresTab from '../../components/configuracoes/IndicadoresTab'
import DescritoresTab from '../../components/configuracoes/DescritoresTab'
import { useReferences } from '../../contexts/ReferenceContext'



export default function Configuracoes() {
    const [searchParams] = useSearchParams()
    const [activeTab, setActiveTab] = useState(() => {
        return searchParams.get('tab') || 'calendario'
    })

    // Usage of Global Context avoids extra fetch
    const { anosLetivos } = useReferences()
    const hasActiveCalendar = anosLetivos && anosLetivos.length > 0

    const tabs = [
        { id: 'calendario', label: 'Calendário', icon: HiCalendar },
        ...(hasActiveCalendar ? [{ id: 'horarios', label: 'Horários de Aula', icon: HiClock }] : []),
        ...(hasActiveCalendar ? [{ id: 'controle', label: 'Controle', icon: HiAdjustments }] : []),
        ...(hasActiveCalendar ? [{ id: 'indicadores', label: 'Indicadores', icon: HiClipboardList }] : []),
        ...(hasActiveCalendar ? [{ id: 'descritores', label: 'Ocorrências', icon: HiExclamationCircle }] : []),
        { id: 'habilidades', label: 'Habilidades BNCC', icon: HiAcademicCap },
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
            <div className="min-h-[400px]">
                {activeTab === 'calendario' && <CalendarioTab />}
                {activeTab === 'horarios' && hasActiveCalendar && <HorarioAulaTab />}
                {activeTab === 'controle' && hasActiveCalendar && <ControleTab />}
                {activeTab === 'indicadores' && hasActiveCalendar && <IndicadoresTab />}
                {activeTab === 'descritores' && hasActiveCalendar && <DescritoresTab />}
                {activeTab === 'habilidades' && <HabilidadesTab />}
            </div>
        </div>
    )
}

