import React from 'react';
import { HiChevronDown } from 'react-icons/hi';
import { DropdownMenu, DropdownItem } from './DropdownMenu';

/**
 * ActionSelect Component
 * A premium select-like dropdown for table actions.
 * 
 * @param {Array} actions - Array of objects: { label, icon, onClick, variant, disabled }
 * @param {string} label - Trigger button label
 * @param {string} size - sm | md | lg
 */
const ActionSelect = ({
    actions = [],
    label = "Ações",
    size = "md",
    className = ""
}) => {
    const trigger = (
        <button
            className={`
        group flex items-center gap-2 rounded-xl font-semibold transition-all duration-200
        border border-slate-200 dark:border-slate-700 
        bg-white dark:bg-slate-800/50 
        hover:border-primary-400 dark:hover:border-primary-500
        hover:bg-slate-50 dark:hover:bg-slate-800
        hover:shadow-md hover:shadow-primary-500/5
        active:scale-95
        ${size === 'sm' ? 'text-xs py-1 px-2.5' : 'text-sm py-2 px-4'}
        ${className}
      `}
        >
            <span className="text-slate-700 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {label}
            </span>
            <HiChevronDown className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-all duration-200 group-hover:translate-y-0.5" />
        </button>
    );

    return (
        <DropdownMenu trigger={trigger} align="right">
            <div className="p-1.5 space-y-0.5 min-w-[160px]">
                {actions.map((action, index) => (
                    <DropdownItem
                        key={index}
                        icon={action.icon}
                        onClick={(e) => {
                            if (action.onClick) {
                                action.onClick(e);
                            }
                        }}
                        disabled={action.disabled}
                        className={`
              rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
              ${action.variant === 'danger'
                                ? 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400'
                            }
            `}
                    >
                        {action.label}
                    </DropdownItem>
                ))}
            </div>
        </DropdownMenu>
    );
};

export default ActionSelect;
