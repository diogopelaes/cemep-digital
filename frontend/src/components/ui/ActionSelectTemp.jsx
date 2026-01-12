import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiChevronDown } from 'react-icons/hi';

/**
 * ActionSelectTemp Component
 * A temporary component to test clipping solutions.
 */
const ActionSelectTemp = ({
    actions = [],
    label = "Ações",
    size = "md",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const [openUp, setOpenUp] = useState(false);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target) &&
                triggerRef.current && !triggerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleMenu = () => {
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = 200; // estimated

            if (spaceBelow < menuHeight) {
                setOpenUp(true);
                setCoords({
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX + rect.width
                });
            } else {
                setOpenUp(false);
                setCoords({
                    top: rect.bottom + window.scrollY,
                    left: rect.left + window.scrollX + rect.width
                });
            }
        }
        setIsOpen(!isOpen);
    };

    const trigger = (
        <button
            ref={triggerRef}
            onClick={toggleMenu}
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
            <HiChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-all duration-200 ${isOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} />
        </button>
    );

    const Menu = (
        <div
            ref={menuRef}
            style={{
                position: 'absolute',
                top: openUp ? (coords.top - 8) : coords.top + 8,
                left: coords.left,
                transform: `translateX(-100%) ${openUp ? 'translateY(-100%)' : ''}`,
                zIndex: 9999
            }}
            className="w-56 rounded-xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none animate-fade-in"
        >
            <div className="p-1.5 space-y-0.5">
                {actions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                        <button
                            key={index}
                            disabled={action.disabled}
                            onClick={(e) => {
                                setIsOpen(false);
                                if (action.onClick) action.onClick(e);
                            }}
                            className={`
                                w-full text-left rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 transition-all duration-200
                                ${action.disabled ? 'opacity-50 cursor-not-allowed text-slate-400' :
                                    action.variant === 'danger'
                                        ? 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                                        : 'text-slate-700 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400'
                                }
                            `}
                        >
                            {Icon && <Icon className={`h-4 w-4 ${action.disabled ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`} />}
                            {action.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="relative inline-block text-left">
            {trigger}
            {isOpen && createPortal(Menu, document.body)}
        </div>
    );
};

export default ActionSelectTemp;
