'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, User, Building2, Phone, CreditCard, ChevronLeft, AlertTriangle, X, Info } from 'lucide-react';
import { ALGERIA_LOCATIONS } from '@/lib/constants/algeria-locations';

interface Customer {
    id: number;
    name: string;
    type: 'REGULAR' | 'LOYAL';
    phone: string | null;
    email: string | null;
    balanceDue: number;
    creditLimit: number | null;
    _count?: {
        projects: number;
        orders: number;
    };
    rc?: string | null;
    nif?: string | null;
    ai?: string | null;
    nis?: string | null;
    address?: string | null;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'DEBT' | 'PAID'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState<{ 
        name: string, type: 'REGULAR' | 'LOYAL', phone: string, email: string, creditLimit: string,
        rc: string, nif: string, ai: string, nis: string, address: string, commune: string, wilaya: string
    }>({
        name: '', type: 'REGULAR', phone: '', email: '', creditLimit: '',
        rc: '', nif: '', ai: '', nis: '', address: '', 
        commune: 'المسيلة', 
        wilaya: 'المسيلة'
    });

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/customers');
            if (res.ok) {
                const data = await res.json();
                setCustomers(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm));
        const matchesBalance = 
            balanceFilter === 'ALL' ? true :
            balanceFilter === 'DEBT' ? c.balanceDue > 0 :
            c.balanceDue <= 0;
        return matchesSearch && matchesBalance;
    });

    const counts = {
        ALL: customers.length,
        REGULAR: customers.filter(c => c.type === 'REGULAR').length,
        LOYAL: customers.filter(c => c.type === 'LOYAL').length,
    };

    const handleSaveCustomer = async () => {
        try {
            const payload: any = {
                name: formData.name,
                type: formData.type,
                phone: formData.phone || undefined,
                email: formData.email || undefined,
                rc: formData.rc || undefined,
                nif: formData.nif || undefined,
                ai: formData.ai || undefined,
                nis: formData.nis || undefined,
                address: formData.address || undefined,
                commune: formData.commune || undefined,
                wilaya: formData.wilaya || undefined,
            };

            if (formData.type === 'LOYAL' && formData.creditLimit) {
                payload.creditLimit = parseFloat(formData.creditLimit);
            }

            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                fetchCustomers();
                setIsSheetOpen(false);
                setFormData({ 
                    name: '', type: 'REGULAR', phone: '', email: '', creditLimit: '',
                    rc: '', nif: '', ai: '', nis: '', address: '', 
                    commune: 'المسيلة', 
                    wilaya: 'المسيلة'
                });
            } else {
                const err = await res.json();
                alert(`خطأ: ${err.error}`);
            }
        } catch (e) {
            alert('حدث خطأ');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const form = e.currentTarget;
        const focusableElements = Array.from(form.querySelectorAll('input:not([type="hidden"]), select, textarea, button[type="submit"]'));
        const index = focusableElements.indexOf(e.target as any);

        if (e.key === 'Enter') {
            if (index > -1 && index < focusableElements.length - 1) {
                e.preventDefault();
                (focusableElements[index + 1] as HTMLElement).focus();
            }
        } else if (e.key === 'ArrowRight') {
            // In RTL, ArrowRight moves backwards to previous field
            const target = e.target as HTMLInputElement;
            const isTextAtStart = target.tagName !== 'INPUT' || (target.selectionStart === 0 && target.selectionEnd === 0);
            
            if (isTextAtStart && index > 0) {
                e.preventDefault();
                (focusableElements[index - 1] as HTMLElement).focus();
            }
        }
    };

    const getInitials = (name: string) => {
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        if (name.length >= 2) return name.substring(0, 2).toUpperCase();
        return name[0] || '?';
    };

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-6 md:p-8 flex flex-col gap-6" dir="rtl">

            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                    <User className="text-blue-600" /> العملاء والمشاريع
                </h1>

                <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="بحث بالاسم أو الهاتف..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setIsSheetOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
                    >
                        <Plus size={18} /> عميل جديد
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-6 border-b border-gray-200">
                <button
                    onClick={() => setBalanceFilter('ALL')}
                    className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${balanceFilter === 'ALL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    الكل
                    <span className={`px-2 py-0.5 rounded-full text-xs ${balanceFilter === 'ALL' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        {customers.length}
                    </span>
                </button>
                <button
                    onClick={() => setBalanceFilter('DEBT')}
                    className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${balanceFilter === 'DEBT' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    عليهم ديون
                    <span className={`px-2 py-0.5 rounded-full text-xs ${balanceFilter === 'DEBT' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                        {customers.filter(c => c.balanceDue > 0).length}
                    </span>
                </button>
                <button
                    onClick={() => setBalanceFilter('PAID')}
                    className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${balanceFilter === 'PAID' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    خالصين
                    <span className={`px-2 py-0.5 rounded-full text-xs ${balanceFilter === 'PAID' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {customers.filter(c => c.balanceDue <= 0).length}
                    </span>
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center text-gray-500 h-64 font-medium">جاري التحميل...</div>
            ) : filteredCustomers.length === 0 ? (
                <div className="flex-1 flex justify-center items-center text-gray-500 h-64 font-medium border-2 border-dashed border-gray-200 rounded-xl">لا يوجد عملاء مطابقون للبحث</div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filteredCustomers.map(customer => {
                        const isLoyal = true; // All are clients now
                        const progress = isLoyal && customer.creditLimit ? Math.min((customer.balanceDue / customer.creditLimit) * 100, 100) : 0;
                        const isWarning = progress >= 90;

                        return (
                            <div key={customer.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0
                    ${isLoyal ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {getInitials(customer.name)}
                                </div>
                                
                                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-gray-900 truncate" title={customer.name}>{customer.name}</h3>
                                        {customer.phone && (
                                            <p className="text-gray-500 text-sm flex items-center gap-1.5 mt-1" dir="ltr">
                                                <Phone size={14} /> {customer.phone}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                                <CreditCard size={14} /> الرصيد: 
                                            </span>
                                            <span className={`text-xs font-bold ${customer.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {customer.balanceDue.toLocaleString()} دج
                                            </span>
                                        </div>
                                        {isLoyal && customer.creditLimit && (
                                            <div className="w-full max-w-[150px]">
                                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${isWarning ? 'bg-red-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="bg-gray-100 bg-opacity-80 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-gray-200">
                                            مشاريع: {customer._count?.projects || 0}
                                        </span>
                                        <span className="bg-gray-100 bg-opacity-80 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-gray-200">
                                            طلبات: {customer._count?.orders || 0}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                    <Link href={`/customers/${customer.id}`} className="flex-1 md:flex-none flex justify-center items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                                        عرض التفاصيل <ChevronLeft size={16} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ADD CUSTOMER SHEET */}
            {isSheetOpen && (
                <>
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsSheetOpen(false)} />
                    <div className="fixed top-0 bottom-0 right-0 w-full max-w-md bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-5 w-full flex items-center justify-between border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Plus size={20} className="text-blue-600" /> تسجيل عميل جديد
                            </h2>
                            <button onClick={() => setIsSheetOpen(false)} className="text-gray-500 hover:bg-gray-200 rounded-full p-1.5 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto space-y-5" onKeyDown={handleKeyDown}>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">اسم العميل <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 uppercase"
                                    required
                                />
                            </div>

                            <input type="hidden" value="LOYAL" />
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                                <User className="text-blue-600 shrink-0" size={20} />
                                <div>
                                    <p className="text-sm font-bold text-blue-900">حساب عميل معتمد</p>
                                    <p className="text-xs text-blue-700 leading-relaxed">سيتم إنشاء حساب عميل يسمح بتتبع المشاريع والديون مع تحديد سقف ائتماني.</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">الحد الائتماني (دج) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        dir="ltr"
                                        value={formData.creditLimit.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                                        onChange={e => {
                                            const raw = e.target.value.replace(/\D/g, '');
                                            setFormData({ ...formData, type: 'LOYAL', creditLimit: raw });
                                        }}
                                        className="w-full bg-white border border-gray-300 rounded-lg pr-16 pl-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-sans text-right"
                                        placeholder="100 000"
                                        required
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-900 font-sans font-bold pointer-events-none uppercase">DZD</span>
                                </div>
                                <p className="text-xs text-gray-500">الحد الأقصى للديون المسموح بها لهذا العميل.</p>
                            </div>

                            <div className="space-y-1.5 flex flex-col items-start w-full">
                                <label className="text-sm font-bold text-gray-700">رقم الهاتف (اختياري)</label>
                                <div className="relative w-full group overflow-hidden">
                                    <input
                                        type="text"
                                        maxLength={10}
                                        value={formData.phone}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length === 1 && val[0] !== '0') return;
                                            if (val.length === 2 && !['5', '6', '7'].includes(val[1])) return;
                                            setFormData({ ...formData, phone: val });
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text"
                                        dir="ltr"
                                        onFocus={() => setFocusedField('phone')}
                                        onBlur={() => setFocusedField(null)}
                                        autoFocus
                                    />
                                    <div className="flex gap-2 w-full justify-between items-center bg-white border border-gray-300 rounded-lg px-4 py-2.5 z-10 font-mono text-lg" dir="ltr">
                                        {[...Array(10)].map((_, i) => (
                                            <div 
                                                key={i} 
                                                className={`flex-1 flex justify-center items-center transition-all duration-200 border-b-2 
                                                    ${formData.phone[i] ? 'text-blue-600 border-blue-600 font-bold' : 
                                                      (i === formData.phone.length && focusedField === 'phone') ? 'text-amber-500 border-amber-500 font-black scale-110 shadow-sm' :
                                                      'text-gray-300 border-gray-100'}`}
                                            >
                                                {formData.phone[i] || 'x'}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold mt-1">يجب أن يبدأ بـ 05، 06، أو 07.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">البريد الإلكتروني (اختياري)</label>
                                <input
                                    type="email"
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className={`w-full bg-white border rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-sans ${formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'border-red-300 bg-red-50/30' : 'border-gray-300'}`}
                                    placeholder="example@domain.com"
                                    required
                                />
                                {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                                    <p className="text-[10px] text-red-500 font-bold mt-1 text-right">صيغة البريد الإلكتروني غير صحيحة (مثال: example@domain.com)</p>
                                )}
                            </div>

                            <div className="space-y-1.5 pt-4 border-t border-gray-100">
                                <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Info size={14} /> الهوية الجبائية والقانونية
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* RC - 10 chars */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500">سجل تجاري (RC)</label>
                                        <div className="relative font-mono">
                                            <input 
                                                type="text" maxLength={10} value={formData.rc} 
                                                onChange={e => setFormData({ ...formData, rc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} 
                                                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text"
                                                dir="ltr"
                                                onFocus={() => setFocusedField('rc')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                            <div className="flex gap-0.5 w-full justify-between items-center bg-white border border-gray-200 rounded-lg px-2 py-2 z-10 text-[10px]" dir="ltr">
                                                {[...Array(10)].map((_, i) => (
                                                    <div key={i} className={`flex-1 flex justify-center border-b 
                                                        ${formData.rc[i] ? 'text-blue-600 border-blue-600 font-bold' : 
                                                          (i === formData.rc.length && focusedField === 'rc') ? 'text-amber-500 border-amber-500 font-black scale-110 shadow-sm' :
                                                          'text-gray-300 border-gray-100'}`}>
                                                        {formData.rc[i] || 'x'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* NIF - 15 digits */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500">رقم التعريف الجبائي (NIF)</label>
                                        <div className="relative font-mono">
                                            <input 
                                                type="text" maxLength={15} value={formData.nif} 
                                                onChange={e => setFormData({ ...formData, nif: e.target.value.replace(/\D/g, '') })} 
                                                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text"
                                                dir="ltr"
                                                onFocus={() => setFocusedField('nif')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                            <div className="flex gap-0.5 w-full justify-between items-center bg-white border border-gray-200 rounded-lg px-1.5 py-2 z-10 text-[9px]" dir="ltr">
                                                {[...Array(15)].map((_, i) => (
                                                    <div key={i} className={`flex-1 flex justify-center border-b 
                                                        ${formData.nif[i] ? 'text-blue-600 border-blue-600 font-bold' : 
                                                          (i === formData.nif.length && focusedField === 'nif') ? 'text-amber-500 border-amber-500 font-black scale-110 shadow-sm' :
                                                          'text-gray-300 border-gray-100'}`}>
                                                        {formData.nif[i] || 'x'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI - 11 digits */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500">رقم المادة (AI)</label>
                                        <div className="relative font-mono">
                                            <input 
                                                type="text" maxLength={11} value={formData.ai} 
                                                onChange={e => setFormData({ ...formData, ai: e.target.value.replace(/\D/g, '') })} 
                                                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text"
                                                dir="ltr"
                                                onFocus={() => setFocusedField('ai')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                            <div className="flex gap-0.5 w-full justify-between items-center bg-white border border-gray-200 rounded-lg px-2 py-2 z-10 text-[10px]" dir="ltr">
                                                {[...Array(11)].map((_, i) => (
                                                    <div key={i} className={`flex-1 flex justify-center border-b 
                                                        ${formData.ai[i] ? 'text-blue-600 border-blue-600 font-bold' : 
                                                          (i === formData.ai.length && focusedField === 'ai') ? 'text-amber-500 border-amber-500 font-black scale-110 shadow-sm' :
                                                          'text-gray-300 border-gray-100'}`}>
                                                        {formData.ai[i] || 'x'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* NIS - 15 digits */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500">رقم التعريف الإحصائي (NIS)</label>
                                        <div className="relative font-mono">
                                            <input 
                                                type="text" maxLength={15} value={formData.nis} 
                                                onChange={e => setFormData({ ...formData, nis: e.target.value.replace(/\D/g, '') })} 
                                                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text"
                                                dir="ltr"
                                                onFocus={() => setFocusedField('nis')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                            <div className="flex gap-0.5 w-full justify-between items-center bg-white border border-gray-200 rounded-lg px-1.5 py-2 z-10 text-[9px]" dir="ltr">
                                                {[...Array(15)].map((_, i) => (
                                                    <div key={i} className={`flex-1 flex justify-center border-b 
                                                        ${formData.nis[i] ? 'text-blue-600 border-blue-600 font-bold' : 
                                                          (i === formData.nis.length && focusedField === 'nis') ? 'text-amber-500 border-amber-500 font-black scale-110' :
                                                          'text-gray-300 border-gray-100'}`}>
                                                        {formData.nis[i] || 'x'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500">العنوان (الشارع / الحي / Cité) <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value.toUpperCase() })} 
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 uppercase font-black" 
                                            placeholder="Cité, Street, Ave..." required 
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500">الولاية <span className="text-red-500">*</span></label>
                                            <select 
                                                value={formData.wilaya} 
                                                onChange={e => {
                                                    const w = ALGERIA_LOCATIONS.find(l => l.arabicName === e.target.value);
                                                    setFormData({ ...formData, wilaya: e.target.value, commune: w?.communes[0] || '' });
                                                }}
                                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 font-bold"
                                            >
                                                {ALGERIA_LOCATIONS.map(w => (
                                                    <option key={w.id} value={w.arabicName}>{w.id} - {w.arabicName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500">البلدية <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" value={formData.commune} onChange={e => setFormData({ ...formData, commune: e.target.value.toUpperCase() })} 
                                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 font-bold uppercase" 
                                                placeholder="البلدية..." required 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-200 bg-gray-50 flex gap-3 shadow-sm">
                            <button
                                onClick={() => setIsSheetOpen(false)}
                                className="flex-[0.5] bg-white text-gray-700 border border-gray-300 py-2.5 rounded-lg font-bold text-sm transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSaveCustomer}
                                disabled={
                                    !formData.name || 
                                    !formData.creditLimit || 
                                    !/^0[567]\d{8}$/.test(formData.phone) || 
                                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) || 
                                    formData.rc.length !== 10 || 
                                    formData.nif.length !== 15 || 
                                    formData.ai.length !== 11 || 
                                    formData.nis.length !== 15 || 
                                    !formData.address || !formData.commune || !formData.wilaya
                                }
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all"
                            >
                                تسجيل العميل
                            </button>
                        </div>
                    </div>
                </>
            )}

        </div>
    );
}
