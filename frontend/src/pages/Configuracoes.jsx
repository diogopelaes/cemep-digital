import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HiCalendar, HiUserGroup, HiAcademicCap } from 'react-icons/hi'
import CalendarioTab from '../components/configuracoes/CalendarioTab'

export default function Configuracoes() {
    const [searchParams] = useSearchParams()
    const [activeTab, setActiveTab] = useState(() => {
        return searchParams.get('tab') || 'calendario'
    })

    const tabs = [
        { id: 'calendario', label: 'Calendário', icon: HiCalendar },
        { id: 'professores', label: 'Controle de Professores', icon: HiAcademicCap },
        { id: 'estudantes', label: 'Controle - Estudantes/Responsáveis', icon: HiUserGroup },
    ]

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                Configurações do Sistema
            </h1>

            {/* Tabs Navigation */}
            <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    const Icon = tab.icon

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${isActive
                                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}
              `}
                        >
                            <Icon className="w-5 h-5" />
                            <span>{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="glass p-6 rounded-2xl min-h-[400px]">
                {activeTab === 'calendario' && <CalendarioTab />}

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
