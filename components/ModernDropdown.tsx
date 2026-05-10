'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface ModernDropdownProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    Icon?: any;
    theme?: 'violet' | 'blue' | 'emerald' | 'amber';
}

export default function ModernDropdown({ 
    options, 
    value, 
    onChange, 
    label, 
    placeholder = 'اختر خياراً...', 
    Icon,
    theme = 'violet'
}: ModernDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const themeStyles = {
        violet: {
            bg: 'bg-violet-50',
            text: 'text-violet-600',
            border: 'border-violet-100',
            activeBorder: 'border-violet-400',
            ring: 'ring-violet-400/10',
            hover: 'hover:bg-violet-50 hover:text-violet-700',
            selected: 'bg-violet-600 text-white'
        },
        blue: {
            bg: 'bg-blue-50',
            text: 'text-blue-600',
            border: 'border-blue-100',
            activeBorder: 'border-blue-400',
            ring: 'ring-blue-400/10',
            hover: 'hover:bg-blue-50 hover:text-blue-700',
            selected: 'bg-blue-600 text-white'
        },
        emerald: {
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
            border: 'border-emerald-100',
            activeBorder: 'border-emerald-400',
            ring: 'ring-emerald-400/10',
            hover: 'hover:bg-emerald-50 hover:text-emerald-700',
            selected: 'bg-emerald-600 text-white'
        },
        amber: {
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            border: 'border-amber-100',
            activeBorder: 'border-amber-400',
            ring: 'ring-amber-400/10',
            hover: 'hover:bg-amber-50 hover:text-amber-700',
            selected: 'bg-amber-600 text-white'
        }
    };

    const s = themeStyles[theme];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative w-full" ref={containerRef} dir="rtl">
            <div className="space-y-2">
                {label && <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">{label}</label>}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        w-full flex items-center justify-between bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold transition-all
                        hover:bg-white hover:${s.border} active:scale-[0.98]
                        ${isOpen ? `${s.activeBorder} ring-4 ${s.ring} bg-white shadow-lg shadow-black/5` : ''}
                    `}
                >
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div className={`p-2 rounded-xl ${isOpen ? s.selected : `${s.bg} ${s.text}`}`}>
                                <Icon size={16} />
                            </div>
                        )}
                        <span className={`text-sm ${!value ? 'text-gray-400 font-medium' : 'text-gray-900 font-black'}`}>
                            {value || placeholder}
                        </span>
                    </div>
                    <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-gray-900' : 'text-gray-300'}`}>
                        <ChevronDown size={18} strokeWidth={3} />
                    </div>
                </button>
            </div>

            {isOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white border border-gray-100 rounded-[1.5rem] shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                        {options.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                                className={`
                                    w-full text-right px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all group
                                    ${value === option ? `${s.selected} shadow-md` : `text-gray-600 ${s.hover}`}
                                `}
                            >
                                <span>{option}</span>
                                {value === option && <Check size={14} strokeWidth={4} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
