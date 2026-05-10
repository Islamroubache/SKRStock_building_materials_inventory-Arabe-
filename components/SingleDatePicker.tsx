'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
    format, addMonths, subMonths, eachDayOfInterval, 
    getDay, startOfMonth, endOfMonth, isSameDay, 
    addYears, subYears, getYear, getMonth,
    isBefore, startOfToday
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, X } from 'lucide-react';

interface SingleDatePickerProps {
    selectedDate: string | null;
    onChange: (date: string | null) => void;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
}

export default function SingleDatePicker({ 
    selectedDate, 
    onChange, 
    label = 'تاريخ انتهاء الصلاحية', 
    placeholder = 'حدد التاريخ',
    disabled = false
}: SingleDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(selectedDate ? new Date(selectedDate) : new Date());
    const containerRef = useRef<HTMLDivElement>(null);

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

    const years = Array.from({ length: 20 }, (_, i) => getYear(new Date()) + i - 5);
    const months = Array.from({ length: 12 }, (_, i) => i);

    const handleDateSelect = (date: Date) => {
        onChange(format(date, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    const renderCalendar = (month: Date) => {
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const days = eachDayOfInterval({ start, end });
        const startDay = getDay(start); 
        // Adjust for Arabic week (starts on Saturday = 6)
        const offset = (startDay + 1) % 7; 

        return (
            <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <button 
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} 
                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-all"
                    >
                        <ChevronRight size={18} />
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <select 
                            value={getMonth(currentMonth)} 
                            onChange={(e) => setCurrentMonth(new Date(getYear(currentMonth), parseInt(e.target.value), 1))}
                            className="bg-transparent font-black text-sm text-gray-900 outline-none cursor-pointer hover:text-[#8b5cf6] transition-colors"
                        >
                            {Array.from({ length: 12 }).map((_, i) => (
                                <option key={i} value={i}>
                                    {format(new Date(2000, i, 1), 'MMMM', { locale: ar })}
                                </option>
                            ))}
                        </select>
                        <select 
                            value={getYear(currentMonth)} 
                            onChange={(e) => setCurrentMonth(new Date(parseInt(e.target.value), getMonth(currentMonth), 1))}
                            className="bg-transparent font-black text-sm text-gray-900 outline-none cursor-pointer hover:text-[#8b5cf6] transition-colors"
                        >
                            {Array.from({ length: 30 }).map((_, i) => {
                                const y = getYear(new Date()) - 5 + i;
                                return <option key={y} value={y}>{y}</option>;
                            })}
                        </select>
                    </div>

                    <button 
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} 
                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-all"
                    >
                        <ChevronLeft size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-gray-400 mb-4 tracking-widest">
                    {['سبت', 'أحد', 'اثن', 'ثلاث', 'أربع', 'خميس', 'جمعة'].map(d => <div key={d}>{d}</div>)}
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />)}
                    {days.map(day => {
                        const isSelected = selectedDate ? isSameDay(day, new Date(selectedDate)) : false;
                        const isToday = isSameDay(day, new Date());
                        const isPast = isBefore(day, startOfToday());
                        const isDisabled = isPast || isToday;
                        
                        return (
                            <button
                                key={day.toString()}
                                onClick={() => !isDisabled && handleDateSelect(day)}
                                disabled={isDisabled}
                                className={`
                                    h-10 w-10 text-xs rounded-2xl transition-all flex items-center justify-center font-bold
                                    ${isSelected ? 'bg-[#8b5cf6] text-white shadow-lg shadow-violet-200' : ''}
                                    ${!isSelected && isDisabled ? 'text-gray-300 opacity-40 cursor-not-allowed bg-gray-50/50' : ''}
                                    ${!isSelected && !isDisabled ? 'hover:bg-gray-50 text-gray-700' : ''}
                                `}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="relative w-full" ref={containerRef} dir="rtl">
            <div className="space-y-2">
                {label && <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">{label}</label>}
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        w-full flex items-center justify-between bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold transition-all
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white hover:border-violet-100 active:scale-[0.98]'}
                        ${isOpen ? 'border-violet-400 ring-4 ring-violet-400/10 bg-white' : ''}
                    `}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isOpen ? 'bg-violet-500 text-white' : 'bg-violet-100 text-violet-600'}`}>
                            <CalendarIcon size={16} />
                        </div>
                        <span className={`text-sm ${!selectedDate ? 'text-gray-400 font-medium' : 'text-gray-900 font-black font-sans'}`}>
                            {selectedDate ? format(new Date(selectedDate), 'dd MMMM yyyy', { locale: ar }) : placeholder}
                        </span>
                    </div>
                    <div className="text-gray-300">
                        <ChevronDownIcon size={16} />
                    </div>
                </button>
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Overlay */}
                    <div 
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Modal Content */}
                    <div className="relative bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 fade-in duration-300 origin-center w-full max-w-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <CalendarIcon size={22} className="text-[#8b5cf6]" />
                                تحديد التاريخ
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {renderCalendar(currentMonth)}

                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
                            <button 
                                onClick={() => {
                                    onChange(null);
                                    setIsOpen(false);
                                }}
                                className="px-5 py-2.5 rounded-xl text-[11px] font-black text-rose-500 hover:bg-rose-50 transition-all"
                            >
                                مسح التاريخ
                            </button>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="px-8 py-2.5 bg-gray-900 text-white rounded-xl text-[11px] font-black hover:bg-gray-800 transition-all"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ChevronDownIcon({ size = 20, className = "" }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m6 9 6 6 6-6"/>
        </svg>
    );
}
