'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
    format, subDays, startOfWeek, endOfWeek, startOfMonth, 
    endOfMonth, startOfYear, endOfYear, 
    addMonths, subMonths, eachDayOfInterval, 
    getDay, startOfToday, endOfToday, startOfYesterday, endOfYesterday,
    isSameDay, isWithinInterval, isBefore, isAfter, startOfDay, endOfDay
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, X, Filter } from 'lucide-react';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onChange: (start: string, end: string) => void;
    theme?: 'yellow' | 'violet';
}

export default function DateRangePicker({ startDate, endDate, onChange, theme = 'yellow' }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [tempStart, setTempStart] = useState(startDate);
    const [tempEnd, setTempEnd] = useState(endDate);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTempStart(startDate);
        setTempEnd(endDate);
    }, [startDate, endDate]);

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

    const presets = [
        { label: 'اليوم', getValue: () => ({ start: format(startOfToday(), 'yyyy-MM-dd'), end: format(endOfToday(), 'yyyy-MM-dd') }) },
        { label: 'أمس', getValue: () => ({ start: format(startOfYesterday(), 'yyyy-MM-dd'), end: format(endOfYesterday(), 'yyyy-MM-dd') }) },
        { label: 'هذا الأسبوع', getValue: () => ({ start: format(startOfWeek(new Date(), { weekStartsOn: 6 }), 'yyyy-MM-dd'), end: format(endOfWeek(new Date(), { weekStartsOn: 6 }), 'yyyy-MM-dd') }) },
        { label: 'الأسبوع الماضي', getValue: () => {
            const lastWeek = subDays(new Date(), 7);
            return { start: format(startOfWeek(lastWeek, { weekStartsOn: 6 }), 'yyyy-MM-dd'), end: format(endOfWeek(lastWeek, { weekStartsOn: 6 }), 'yyyy-MM-dd') };
        }},
        { label: 'هذا الشهر', getValue: () => ({ start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
        { label: 'الشهر الماضي', getValue: () => {
            const lastMonth = subMonths(new Date(), 1);
            return { start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), end: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
        }},
        { label: 'هذه السنة', getValue: () => ({ start: format(startOfYear(new Date()), 'yyyy-MM-dd'), end: format(endOfYear(new Date()), 'yyyy-MM-dd') }) },
        { label: 'كل الوقت', getValue: () => ({ start: '', end: '' }) },
    ];

    const handleApply = () => {
        onChange(tempStart, tempEnd);
        setIsOpen(false);
    };

    const handlePresetClick = (getValue: () => { start: string; end: string }) => {
        const { start, end } = getValue();
        setTempStart(start);
        setTempEnd(end);
        if (start) setCurrentMonth(new Date(start));
    };

    const renderCalendar = (month: Date) => {
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const days = eachDayOfInterval({ start, end });
        const startDay = getDay(start); 
        // Adjust for Arabic week (starts on Saturday = 6)
        const offset = (startDay + 1) % 7; 

        return (
            <div className="w-64">
                <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-sm text-gray-900">
                        {format(month, 'MMMM yyyy', { locale: ar })}
                    </span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 mb-2">
                    {['سبت', 'أحد', 'اثن', 'ثلاث', 'أربع', 'خميس', 'جمعة'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />)}
                    {days.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isSelected = dateStr === tempStart || dateStr === tempEnd;
                        const isInRange = tempStart && tempEnd && dateStr > tempStart && dateStr < tempEnd;
                        
                        return (
                            <button
                                key={dateStr}
                                onClick={() => {
                                    if (!tempStart || (tempStart && tempEnd)) {
                                        setTempStart(dateStr);
                                        setTempEnd('');
                                    } else {
                                        if (dateStr < tempStart) {
                                            setTempEnd(tempStart);
                                            setTempStart(dateStr);
                                        } else {
                                            setTempEnd(dateStr);
                                        }
                                    }
                                }}
                                className={`
                                    h-8 w-8 text-[11px] rounded-lg transition-all flex items-center justify-center font-bold
                                    ${isSelected ? 'bg-[#8b5cf6] text-white shadow-md' : ''}
                                    ${isInRange ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : ''}
                                    ${!isSelected && !isInRange ? 'hover:bg-gray-100 text-gray-700' : ''}
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

    const displayRange = () => {
        if (!startDate && !endDate) return 'كل الوقت';
        const start = startDate ? format(new Date(startDate), 'dd/MM/yyyy') : '...';
        const end = endDate ? format(new Date(endDate), 'dd/MM/yyyy') : '...';
        return `من ${start} إلى ${end}`;
    };

    return (
        <div className="relative" ref={containerRef} dir="rtl">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-[52px] flex items-center gap-3 border rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right group min-w-[160px] ${
                    theme === 'violet' ? 'bg-[#8b5cf6] border-[#8b5cf6]' : 'bg-[#fbb815] border-[#fbb815]'
                }`}
            >
                <div className={`p-1.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform ${
                    theme === 'violet' ? 'bg-white/20 text-white' : 'bg-white/30 text-gray-900'
                }`}>
                    <CalendarIcon size={14} />
                </div>
                <div className="flex-1">
                    <p className={`text-[9px] font-medium uppercase tracking-tighter leading-none ${
                        theme === 'violet' ? 'text-white/80' : 'text-gray-800'
                    }`}>فلترة حسب التاريخ</p>
                    <p className={`text-[10px] font-bold mt-1 truncate max-w-[120px] ${
                        theme === 'violet' ? 'text-white' : 'text-gray-900'
                    }`}>{displayRange()}</p>
                </div>
                <Filter size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${
                    theme === 'violet' ? 'text-white/80' : 'text-gray-800'
                }`} />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Overlay */}
                    <div 
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Modal Content */}
                    <div className="relative bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl flex overflow-hidden animate-in zoom-in-95 fade-in duration-300 origin-center max-w-full">
                        {/* Presets Sidebar */}
                        <div className="w-44 bg-gray-50/50 border-l border-gray-100 p-6 flex flex-col gap-1.5 shrink-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-3">اختصارات</p>
                            {presets.map(p => {
                                const { start, end } = p.getValue();
                                const isActive = tempStart === start && tempEnd === end;
                                return (
                                    <button
                                        key={p.label}
                                        onClick={() => handlePresetClick(p.getValue)}
                                        className={`text-right px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                                            isActive 
                                                ? 'bg-[#8b5cf6] text-white shadow-md' 
                                                : 'text-gray-500 hover:bg-[#8b5cf6]/10 hover:text-[#8b5cf6]'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Main Content Area */}
                        <div className="p-8 flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                    <Filter size={20} className="text-[#8b5cf6]" />
                                    تحديد الفترة الزمنية
                                </h3>
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Dual Calendars */}
                            <div className="flex gap-12 items-start justify-center">
                                <div className="relative">
                                    <button 
                                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} 
                                        className="absolute -right-2 top-0.5 p-1 hover:bg-gray-100 rounded-full text-gray-400 z-10"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                    {renderCalendar(currentMonth)}
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} 
                                        className="absolute -left-2 top-0.5 p-1 hover:bg-gray-100 rounded-full text-gray-400 z-10"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    {renderCalendar(addMonths(currentMonth, 1))}
                                </div>
                            </div>

                            {/* Manual Inputs & Footer */}
                            <div className="flex flex-col gap-6 pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-400 block mb-1.5 mr-2">تاريخ البداية (MM/DD/YYYY)</label>
                                        <input 
                                            type="date" 
                                            value={tempStart} 
                                            onChange={(e) => setTempStart(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-black outline-none focus:ring-4 focus:ring-[#8b5cf6]/10 focus:border-[#8b5cf6] transition-all"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-400 block mb-1.5 mr-2">تاريخ النهاية (MM/DD/YYYY)</label>
                                        <input 
                                            type="date" 
                                            value={tempEnd} 
                                            onChange={(e) => setTempEnd(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-black outline-none focus:ring-4 focus:ring-[#8b5cf6]/10 focus:border-[#8b5cf6] transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button 
                                        onClick={() => setIsOpen(false)}
                                        className="px-6 py-3 rounded-2xl text-xs font-black text-gray-400 hover:text-gray-600 transition-all"
                                    >
                                        إلغاء
                                    </button>
                                    <button 
                                        onClick={handleApply}
                                        className="px-12 py-3 bg-[#8b5cf6] text-white rounded-2xl text-xs font-black shadow-xl shadow-violet-200 hover:bg-[#7c3aed] hover:scale-105 active:scale-95 transition-all"
                                    >
                                        تطبيق الفلترة
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ChevronDown({ size = 20, className = "" }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m6 9 6 6 6-6"/>
        </svg>
    );
}
