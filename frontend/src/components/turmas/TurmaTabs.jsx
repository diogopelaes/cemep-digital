import { HiBookOpen, HiStar, HiUserGroup } from 'react-icons/hi'
import { Badge } from '../ui'

/**
 * Tabs da página TurmaDetalhes
 * 
 * @param {Object} props
 * @param {string} props.activeTab - Tab ativa ('disciplinas' | 'representantes' | 'estudantes')
 * @param {Function} props.onChangeTab - Callback quando muda de tab
 * @param {Object} props.counters - Contadores para badges { disciplinas, representantes, estudantes }
 */
export default function TurmaTabs({ activeTab, onChangeTab, counters = {} }) {
    const tabs = [
        {
            key: 'disciplinas',
            label: 'Disciplinas',
            icon: HiBookOpen,
            count: counters.disciplinas ?? 0
        },
        {
            key: 'representantes',
            label: 'Representantes',
            icon: HiStar,
            count: counters.representantes ?? 0
        },
        {
            key: 'estudantes',
            label: 'Estudantes',
            icon: HiUserGroup,
            count: counters.estudantes ?? 0
        },
    ]

    return (
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
            {tabs.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.key

                return (
                    <button
                        key={tab.key}
                        onClick={() => onChangeTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${isActive
                                ? 'text-primary-600 border-primary-500'
                                : 'text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <Icon className="h-5 w-5" />
                        {tab.label}
                        <Badge variant={isActive ? 'primary' : 'default'}>
                            {tab.count}
                        </Badge>
                    </button>
                )
            })}
        </div>
    )
}
