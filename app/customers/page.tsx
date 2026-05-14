'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, User, Building2, Phone, CreditCard, ChevronLeft, AlertTriangle, X, Info, Archive, Printer, FileSpreadsheet, FileText, ChevronDown, Download, Users, RefreshCcw, MapPin, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ALGERIA_LOCATIONS } from '@/lib/constants/algeria-locations';
import { printDocument } from '@/lib/print-helper';

interface Customer {
    id: number;
    name: string;
    type: 'REGULAR' | 'LOYAL';
    phone: string | null;
    email: string | null;
    balanceDue: number;
    creditLimit: number | null;
    hasOverdue?: boolean;
    _count?: {
        projects: number;
        orders: number;
    };
    rc?: string | null;
    nif?: string | null;
    ai?: string | null;
    nis?: string | null;
    address?: string | null;
    activity?: string | null;
    commune?: string | null;
    wilaya?: string | null;
}

export default function CustomersPage() {
    const router = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'DEBT' | 'PAID' | 'CREDIT' | 'OVERDUE' | 'ARCHIVED'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [activities, setActivities] = useState<string[]>([]);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const DEFAULT_FORM = {
        name: '', type: 'REGULAR' as 'REGULAR' | 'LOYAL', phone: '', email: '', creditLimit: '',
        rc: '', nif: '', ai: '', nis: '', address: '', activity: '',
        wilaya: "M'Sila",
        commune: "M'sila",
        postCode: '28000',
        isTvaSubject: true
    };

    const [formData, setFormData] = useState(DEFAULT_FORM);

    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const resetForm = () => {
        setFormData(DEFAULT_FORM);
        setTouched({});
        setEditingCustomer(null);
    };

    const setFieldTouched = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const isNameDuplicate = customers.some(c => c.name.trim().toUpperCase() === formData.name.trim().toUpperCase() && c.id !== editingCustomer?.id);

    const validations = {
        name: (() => {
            const words = formData.name.trim().split(/\s+/).filter(w => w.length > 0);
            return words.length >= 2 && !isNameDuplicate;
        })(),
        phone: /^(05|06|07|02)\d{8}$/.test(formData.phone),
        commune: formData.commune.length > 0,
        wilaya: formData.wilaya.length > 0,
    };

    // --- Strict Algerian Business Number Validations ---

    const validateNIF = (nif: string) => {
        if (!nif) return null;
        if (!/^\d+$/.test(nif)) return { valid: false, error: "يجب أن يحتوي على أرقام فقط بدون مسافات" };
        if (nif.length < 14 || nif.length > 20) return { valid: false, error: "يجب أن يكون بين 14 و 20 رقماً" };
        return {
            valid: true,
            breakdown: "صحيح"
        };
    };

    const validateNIS = (nis: string) => {
        if (!nis) return null;
        if (!/^\d+$/.test(nis)) return { valid: false, error: "يجب أن يحتوي على أرقام فقط بدون مسافات" };
        if (nis.length < 15 || nis.length > 20) return { valid: false, error: "يجب أن يكون بين 15 و 20 رقماً" };
        return { valid: true, breakdown: "صحيح" };
    };

    const validateRC = (rc: string) => {
        if (!rc) return null;

        // Format: WWXX-XX(A or B)XXXXXXX (where WW = wilaya 01-69)
        const match = rc.match(/^(\d{2})(\d{2})-(\d{2})([AB])(\d{7})$/i);
        if (match) {
            const wilCode = parseInt(match[1]);
            if (wilCode < 1 || wilCode > 69) return { valid: false, error: `كود الولاية (${match[1]}) غير صحيح (01-69)` };
            return { valid: true, breakdown: "صحيح" };
        }

        return { valid: false, error: "الصيغة غير صحيحة. مثال: 2821-51A4344821" };
    };

    const validateAI = (ai: string) => {
        if (!ai) return null;
        const cleanAI = ai.replace(/\s/g, '');

        if (!/^\d+$/.test(cleanAI)) {
            return { valid: false, error: "رقم المادة يجب أن يحتوي على أرقام فقط" };
        }
        if (cleanAI.length < 11 || cleanAI.length > 13) {
            return { valid: false, error: "رقم المادة يجب أن يكون بين 11 و 13 رقماً" };
        }

        return {
            valid: true,
            breakdown: "صحيح"
        };
    };

    const nifInfo = validateNIF(formData.nif);
    const nisInfo = validateNIS(formData.nis);
    const rcInfo = validateRC(formData.rc);
    const aiInfo = validateAI(formData.ai);

    const emailValid = formData.email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

    const isFormValid =
        validations.name &&
        validations.phone &&
        validations.commune &&
        validations.wilaya &&
        emailValid &&
        (nifInfo === null || nifInfo.valid) &&
        (nisInfo === null || nisInfo.valid) &&
        (rcInfo === null || rcInfo.valid) &&
        (aiInfo === null || aiInfo.valid);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const isArchived = balanceFilter === 'ARCHIVED';
            const res = await fetch(`/api/customers?isArchived=${isArchived}`);
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

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                if (data.activities) setActivities(data.activities.split(','));
            }
        } catch (e) { }
    };

    const searchParams = useSearchParams();

    useEffect(() => {
        const filter = searchParams.get('filter');
        if (filter === 'OVERDUE') {
            setBalanceFilter('OVERDUE');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchCustomers();
        fetchSettings();
    }, [balanceFilter]);

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm));
        if (balanceFilter === 'ARCHIVED') return matchesSearch;

        const matchesBalance =
            balanceFilter === 'ALL' ? true :
                balanceFilter === 'DEBT' ? c.balanceDue > 0 :
                    balanceFilter === 'CREDIT' ? c.balanceDue < 0 :
                        balanceFilter === 'OVERDUE' ? c.hasOverdue :
                            c.balanceDue === 0;
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
                activity: formData.activity || undefined,
                commune: formData.commune || undefined,
                wilaya: formData.wilaya || undefined,
                isTvaSubject: formData.isTvaSubject,
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
                resetForm();
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
        const focusableElements = Array.from(form.querySelectorAll('input:not([type="hidden"]), select, textarea, button[type="submit"]:not(:disabled)'));
        const index = focusableElements.indexOf(e.target as any);

        if (e.key === 'Enter' || e.key === 'ArrowRight') {
            if (index > -1 && index < focusableElements.length - 1) {
                e.preventDefault();
                (focusableElements[index + 1] as HTMLElement).focus();
            }
        } else if (e.key === 'ArrowLeft') {
            if (index > 0) {
                e.preventDefault();
                (focusableElements[index - 1] as HTMLElement).focus();
            }
        }
    };

    const handleArchive = async (id: number) => {
        if (!confirm('هل أنت متأكد من أرشفة هذا العميل؟ لن يظهر في القوائم النشطة.')) return;
        try {
            const res = await fetch(`/api/customers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isArchived: true })
            });
            if (res.ok) {
                fetchCustomers();
            } else {
                alert('فشل في أرشفة العميل');
            }
        } catch (e) {
            alert('خطأ في الاتصال');
        }
    };

    const handleRestore = async (id: number) => {
        if (!confirm('هل تريد استعادة هذا العميل إلى القائمة النشطة؟')) return;
        try {
            const res = await fetch(`/api/customers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isArchived: false })
            });
            if (res.ok) {
                fetchCustomers();
            } else {
                alert('فشل في استعادة العميل');
            }
        } catch (e) {
            alert('خطأ في الاتصال');
        }
    };

    const handlePrint = () => {
        printDocument();
    };

    const handleExport = () => {
        const data = filteredCustomers.map(c => ({
            'Nom du Client': c.name,
            'Activité': c.activity || '---',
            'Téléphone': c.phone || '---',
            'Type': c.type === 'LOYAL' ? 'Client Fidèle' : 'Client Régulier',
            'Solde Actuel': c.balanceDue,
            'Limite de Crédit': c.creditLimit || 0,
            'Nombre de Projets': c._count?.projects || 0,
            'Nombre de Commandes': c._count?.orders || 0,
            'Adresse': c.address || '---',
            'Commune': c.commune || '---',
            'Wilaya': c.wilaya || '---'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clients");
        XLSX.writeFile(wb, `Liste_Clients_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });

        // Add Title
        doc.setFontSize(20);
        doc.text("Liste des Clients et Créances", 14, 15);
        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, 22);

        const tableData = filteredCustomers.map(c => [
            c.name,
            c.activity || "---",
            c.phone || "---",
            c._count?.projects || 0,
            c.balanceDue.toLocaleString() + " DZD"
        ]);

        autoTable(doc, {
            head: [['Nom du Client', 'Activité', 'Téléphone', 'Projets', 'Solde Actuel']],
            body: tableData,
            startY: 30,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235], halign: 'left' },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold' },
                1: { halign: 'left' },
                2: { halign: 'left' },
                3: { halign: 'center' },
                4: { halign: 'right', fontStyle: 'bold' }
            },
            styles: { font: 'helvetica', halign: 'left' }
        });

        doc.save(`Liste_Clients_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    const getInitials = (name: string) => {
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        if (name.length >= 2) return name.substring(0, 2).toUpperCase();
        return name[0] || '?';
    };

    return (
        <div className="font-tajawal min-h-screen bg-white text-gray-900 flex flex-col gap-4 print:p-0 print:bg-white" dir="rtl">

            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="no-print">
                {/* List Header */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 print:hidden p-4 md:p-6 pb-0">
                    <PageHeader
                        title="إدارة العملاء"
                        subtitle="إضافة وتعديل بيانات العملاء ومتابعة ديونهم"
                        Icon={Users}
                    />
                    <div className="flex gap-2 w-full lg:w-auto justify-end shrink-0">
                        <div className="relative group">
                            <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-black text-xs shadow-sm flex items-center gap-2 hover:bg-gray-50 transition-all">
                                <Download size={14} className="text-blue-600" /> تصدير
                            </button>
                            <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <button
                                    onClick={handleExport}
                                    className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-xs font-bold text-gray-700 flex items-center gap-2 border-b border-gray-50 transition-colors"
                                >
                                    <FileSpreadsheet size={14} className="text-emerald-600" /> Excel (.xlsx)
                                </button>
                                <button
                                    onClick={handleExportPDF}
                                    className="w-full text-right px-4 py-3 hover:bg-rose-50 text-xs font-bold text-gray-700 flex items-center gap-2 transition-colors"
                                >
                                    <FileText size={14} className="text-rose-600" /> PDF (.pdf)
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={handlePrint}
                            className="bg-[#8b5cf6] text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-[#7c3aed] transition-all shadow-lg active:scale-95"
                        >
                            <Printer size={16} /> طباعة القائمة
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs Header */}
            <div className="flex items-center gap-6 no-print mb-2 pb-1 px-4 md:px-6 pt-0 mt-[-8px]">
                <button
                    onClick={() => setBalanceFilter('ALL')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${balanceFilter === 'ALL' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    الكل
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${balanceFilter === 'ALL' ? 'bg-violet-50 text-violet-600' : 'bg-gray-100 text-gray-500'}`}>
                        {customers.length}
                    </span>
                </button>
                <button
                    onClick={() => setBalanceFilter('DEBT')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${balanceFilter === 'DEBT' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    عليهم ديون
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${balanceFilter === 'DEBT' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                        {customers.filter(c => c.balanceDue > 0).length}
                    </span>
                </button>
                <button
                    onClick={() => setBalanceFilter('PAID')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${balanceFilter === 'PAID' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    خالصين
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${balanceFilter === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                        {customers.filter(c => c.balanceDue === 0).length}
                    </span>
                </button>
                <button
                    onClick={() => setBalanceFilter('CREDIT')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${balanceFilter === 'CREDIT' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    رصيد زائد
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${balanceFilter === 'CREDIT' ? 'bg-violet-50 text-violet-600' : 'bg-gray-100 text-gray-500'}`}>
                        {customers.filter(c => c.balanceDue < 0).length}
                    </span>
                </button>
                {(() => {
                    const overdueCount = customers.filter(c => c.hasOverdue).length;
                    const isOverdueActive = balanceFilter === 'OVERDUE';
                    const hasAnyOverdue = overdueCount > 0;

                    return (
                        <button
                            onClick={() => setBalanceFilter('OVERDUE')}
                            className={`px-4 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 
                                ${isOverdueActive
                                    ? 'text-red-600 border-red-600 shadow-[0_4px_12px_-4px_rgba(220,38,38,0.2)]'
                                    : hasAnyOverdue
                                        ? 'text-red-500 border-transparent hover:text-red-600'
                                        : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                        >
                            <span className={hasAnyOverdue && !isOverdueActive ? 'animate-pulse' : ''}>فواتير متجاوزة</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] transition-colors
                                ${isOverdueActive
                                    ? 'bg-red-600 text-white'
                                    : hasAnyOverdue
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-gray-100 text-gray-500'}`}>
                                {overdueCount}
                            </span>
                        </button>
                    );
                })()}
                <button
                    onClick={() => setBalanceFilter('ARCHIVED')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${balanceFilter === 'ARCHIVED' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    الأرشيف
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${balanceFilter === 'ARCHIVED' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                        {balanceFilter === 'ARCHIVED' ? customers.length : '...'}
                    </span>
                </button>
            </div>

            {/* Filters Box */}
            <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm flex flex-col gap-4 print:hidden mx-4 md:mx-6">
                <div className="flex flex-col lg:flex-row gap-3 items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[300px] group">
                        <input
                            type="text"
                            placeholder="بحث بالاسم أو الهاتف..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-[52px] bg-white border border-gray-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10 rounded-2xl pr-14 pl-4 text-sm font-bold transition-all outline-none shadow-sm"
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-[#8b5cf6] rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none group-focus-within:scale-110 transition-transform">
                            <Search size={20} strokeWidth={3} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <button
                            onClick={() => setIsSheetOpen(true)}
                            className="h-[52px] flex-1 lg:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-100 hover:shadow-blue-200 hover:scale-[1.02] active:scale-95"
                        >
                            <Plus size={20} /> عميل جديد
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center text-gray-500 h-64 font-medium italic">جاري التحميل...</div>
            ) : filteredCustomers.length === 0 ? (
                <div className="flex-1 flex justify-center items-center text-gray-400 h-64 font-black border-2 border-dashed border-gray-100 rounded-[2rem] mx-4 md:mx-6">
                    لا يوجد عملاء مطابقون للبحث
                </div>
            ) : (
                <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden mx-4 md:mx-6 mb-8">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">العميل / النشاط</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">رقم الهاتف</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">الرصيد المالي</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-center">الإحصائيات</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredCustomers.map(customer => {
                                    const rowClass = customer.hasOverdue
                                        ? "bg-amber-50/60 hover:bg-amber-100/80"
                                        : customer.balanceDue > 0
                                            ? "bg-red-50/50 hover:bg-red-100/70"
                                            : customer.balanceDue < 0
                                                ? "bg-violet-50/50 hover:bg-violet-100/70"
                                                : "bg-emerald-50/40 hover:bg-emerald-100/60";

                                    return (
                                        <tr
                                            key={customer.id}
                                            onClick={() => router.push(`/customers/${customer.id}`)}
                                            className={`${rowClass} transition-all group cursor-pointer`}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-gray-900 text-base mb-0.5">{customer.name}</span>
                                                            {customer.hasOverdue && (
                                                                <div className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-0.5 rounded-lg animate-pulse border border-red-200">
                                                                    <AlertTriangle size={12} strokeWidth={3} />
                                                                    <span className="text-[9px] font-black uppercase">متجاوزة</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {customer.activity && (
                                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{customer.activity}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {customer.phone ? (
                                                    <span className="inline-flex bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-black font-sans tracking-tight border border-blue-100 shadow-sm" dir="ltr">
                                                        {customer.phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 font-bold text-xs italic">---</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    {customer.balanceDue > 0 ? (
                                                        <span className="inline-flex items-center justify-center bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-black font-sans border border-red-100 shadow-sm">
                                                            {customer.balanceDue.toLocaleString()} دج
                                                        </span>
                                                    ) : customer.balanceDue < 0 ? (
                                                        <span className="inline-flex items-center justify-center bg-violet-50 text-[#8b5cf6] px-3 py-1 rounded-lg text-xs font-black font-sans border border-violet-100 shadow-sm">
                                                            {Math.abs(customer.balanceDue).toLocaleString()} دج-
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-xs font-black font-sans border border-emerald-100 shadow-sm">
                                                            0 دج
                                                        </span>
                                                    )}

                                                    {customer.balanceDue !== 0 && (
                                                        <span className={`text-[9px] font-black uppercase tracking-tighter text-center ${customer.balanceDue > 0 ? 'text-red-400' : 'text-violet-400'}`}>
                                                            {customer.balanceDue > 0 ? 'مديون' : 'رصيد زائد'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs font-black text-gray-900 font-sans">{customer._count?.projects || 0}</span>
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">مشاريع</span>
                                                    </div>
                                                    <div className="w-px h-6 bg-gray-100"></div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs font-black text-gray-900 font-sans">{customer._count?.orders || 0}</span>
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">طلبات</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    {(() => {
                                                        const isArchivedMode = balanceFilter === 'ARCHIVED';

                                                        if (isArchivedMode) {
                                                            return (
                                                                <button
                                                                    onClick={() => handleRestore(customer.id)}
                                                                    className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                                    title="استعادة العميل"
                                                                >
                                                                    <RefreshCcw size={18} />
                                                                </button>
                                                            );
                                                        }

                                                        const canArchive = customer.balanceDue === 0 && (customer._count?.projects || 0) === 0;
                                                        return (
                                                            <button
                                                                onClick={() => { if (canArchive) handleArchive(customer.id); }}
                                                                disabled={!canArchive}
                                                                className={`p-2.5 rounded-xl transition-all ${canArchive
                                                                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white shadow-sm'
                                                                    : 'bg-gray-50/50 text-gray-200 cursor-not-allowed opacity-60'}`}
                                                                title={canArchive ? "أرشفة العميل" : "لا يمكن الأرشفة: يوجد رصيد مالي أو مشاريع نشطة"}
                                                            >
                                                                <Archive size={18} />
                                                            </button>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ADD CUSTOMER SHEET */}
            {isSheetOpen && (
                <>
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] transition-opacity duration-300" onClick={() => { setIsSheetOpen(false); resetForm(); }} />
                    <div className="fixed top-0 bottom-0 left-0 w-full max-w-lg bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-left duration-500 overflow-hidden">
                        {/* Header with Sidebar Color */}
                        <div className="p-8 w-full flex items-center justify-between bg-[#8b5cf6] text-white shadow-lg">
                            <div>
                                <h2 className="text-2xl font-black flex items-center gap-3">
                                    <Plus size={28} className="bg-white/20 p-1 rounded-lg" /> تسجيل عميل جديد
                                </h2>
                                <p className="text-white/70 text-xs font-bold mt-1 tracking-tight uppercase">إضافة بيانات العميل الجديد إلى قاعدة البيانات</p>
                            </div>
                            <button onClick={() => { setIsSheetOpen(false); resetForm(); }} className="bg-white/10 hover:bg-white/20 text-white rounded-2xl p-2 transition-all active:scale-90">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-gray-50/30" onKeyDown={handleKeyDown}>

                            {/* Section 1: Basic Info - VIOLET */}
                            <div className="space-y-6 p-6 bg-white border-2 border-violet-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-violet-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-violet-500 rounded-full"></div>
                                    <h3 className="text-sm font-black text-violet-600 uppercase tracking-widest">المعلومات الشخصية</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">اسم العميل <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                            onBlur={() => setFieldTouched('name')}
                                            placeholder="مثال: محمد الأمين..."
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none transition-all
                                                ${touched.name && !validations.name ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white'}`}
                                            required
                                        />
                                        {touched.name && !validations.name && (
                                            <p className="text-[10px] text-red-500 font-bold mr-2 animate-bounce">
                                                {isNameDuplicate ? 'هذا الاسم موجود مسبقاً.' : 'يجب إدخال اسم العميل (كلمتان على الأقل).'}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">النشاط التجاري (اختياري)</label>
                                        <input
                                            type="text"
                                            value={formData.activity}
                                            onChange={e => setFormData({ ...formData, activity: e.target.value.toUpperCase() })}
                                            placeholder="أدخل النشاط التجاري هنا..."
                                            className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">رقم الهاتف <span className="text-red-500">*</span></label>
                                        <div className="relative group">
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
                                                onBlur={() => setFieldTouched('phone')}
                                                placeholder="05 / 06 / 07 ..."
                                                className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-12 py-3.5 text-gray-900 font-bold font-sans transition-all
                                                    ${touched.phone && !validations.phone ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white'}`}
                                                dir="ltr"
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-violet-400 transition-colors">
                                                <Phone size={18} />
                                            </div>
                                        </div>
                                        {touched.phone && !validations.phone && (
                                            <p className="text-[10px] text-red-500 font-bold mr-2">رقم الهاتف غير صحيح.</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">البريد الإلكتروني (اختياري)</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            onBlur={() => setFieldTouched('email')}
                                            placeholder="example@domain.com"
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                ${touched.email && !validations.email ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white'}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Account Settings - BLUE */}
                            <div className="space-y-6 p-6 bg-white border-2 border-blue-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-blue-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">نوع الحساب والائتمان</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setFormData({ ...formData, type: 'REGULAR', creditLimit: '' })}
                                            className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${formData.type === 'REGULAR' ? 'border-blue-500 bg-blue-50/50 shadow-inner scale-95' : 'border-gray-50 bg-gray-50/30 hover:border-blue-200 hover:bg-white'}`}
                                        >
                                            <div className={`p-2 rounded-xl ${formData.type === 'REGULAR' ? 'bg-blue-500 text-white' : 'bg-white text-gray-400 shadow-sm'}`}>
                                                <Users size={22} />
                                            </div>
                                            <span className={`text-xs font-black ${formData.type === 'REGULAR' ? 'text-blue-700' : 'text-gray-500'}`}>بدون سقف ائتماني</span>
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, type: 'LOYAL' })}
                                            className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${formData.type === 'LOYAL' ? 'border-blue-500 bg-blue-50/50 shadow-inner scale-95' : 'border-gray-50 bg-gray-50/30 hover:border-blue-200 hover:bg-white'}`}
                                        >
                                            <div className={`p-2 rounded-xl ${formData.type === 'LOYAL' ? 'bg-blue-500 text-white' : 'bg-white text-gray-400 shadow-sm'}`}>
                                                <CreditCard size={22} />
                                            </div>
                                            <span className={`text-xs font-black ${formData.type === 'LOYAL' ? 'text-blue-700' : 'text-gray-500'}`}>بسقف ائتماني</span>
                                        </button>
                                    </div>

                                    {formData.type === 'LOYAL' && (
                                        <div className="animate-in zoom-in-95 duration-300">
                                            <div className="bg-blue-50/80 p-4 rounded-2xl border-2 border-blue-100 mb-5 flex items-start gap-3">
                                                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-blue-800 font-bold leading-relaxed">
                                                    تحديد سقف ائتماني يسمح للعميل بالتعامل بالدين حتى مبلغ معين. سيتم تنبيهك عند اقتراب العميل من هذا السقف.
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">الحد الائتماني (اختياري)</label>
                                                <div className="relative group">
                                                    <input
                                                        type="text"
                                                        dir="ltr"
                                                        value={formData.creditLimit.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                                                        onChange={e => setFormData({ ...formData, creditLimit: e.target.value.replace(/\D/g, '') })}
                                                        placeholder="100 000"
                                                        className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-14 py-3.5 text-gray-900 font-black font-sans text-right focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 focus:bg-white transition-all"
                                                    />
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-400/50 uppercase tracking-widest group-focus-within:text-blue-500 transition-colors">DZD</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 3: Location - EMERALD */}
                            <div className="space-y-6 p-6 bg-white border-2 border-emerald-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-emerald-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                                    <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest">الموقع الجغرافي</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-5">
                                    {/* Wilaya */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">الولاية <span className="text-red-500">*</span></label>
                                        <select
                                            value={formData.wilaya}
                                            onChange={e => {
                                                const w = ALGERIA_LOCATIONS.find(l => l.name === e.target.value);
                                                const firstCommune = w?.communes?.[0];
                                                setFormData({ ...formData, wilaya: e.target.value, commune: firstCommune?.name || '', postCode: firstCommune?.postCode || '' });
                                            }}
                                            className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-emerald-400 focus:bg-white transition-all appearance-none cursor-pointer"
                                        >
                                            {ALGERIA_LOCATIONS.map(w => (
                                                <option key={w.id} value={w.name}>{w.id} - {w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Commune */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">البلدية <span className="text-red-500">*</span></label>
                                        <select
                                            value={formData.commune}
                                            onChange={e => {
                                                const selectedWilaya = ALGERIA_LOCATIONS.find(l => l.name === formData.wilaya);
                                                const selectedCommune = selectedWilaya?.communes?.find(c => c.name === e.target.value);
                                                setFormData({ ...formData, commune: e.target.value, postCode: selectedCommune?.postCode || '' });
                                            }}
                                            onBlur={() => setFieldTouched('commune')}
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-4 py-3.5 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer
                                                ${touched.commune && !validations.commune ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 focus:bg-white'}`}
                                        >
                                            {(ALGERIA_LOCATIONS.find(l => l.name === formData.wilaya)?.communes || []).map(c => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Postal Code (auto-filled) */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">الرمز البريدي</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                dir="ltr"
                                                readOnly
                                                value={formData.postCode}
                                                placeholder="يُملأ تلقائياً"
                                                className="w-full bg-emerald-50/60 border-2 border-emerald-100 rounded-[1.2rem] px-5 py-3.5 text-emerald-700 font-black font-mono text-center focus:outline-none cursor-default select-all"
                                            />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-400/70 uppercase tracking-widest">CP</span>
                                        </div>
                                    </div>
                                    {/* Address detail */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">العنوان بالتفصيل</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value.toUpperCase() })}
                                                placeholder="اختياري (الشارع، رقم الباب...)"
                                                className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 focus:bg-white transition-all"
                                            />
                                            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-400 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Legal & Tax - AMBER */}
                            <div className="space-y-6 p-6 bg-white border-2 border-amber-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-amber-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
                                    <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest">المعلومات الجبائية والاتصال</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-5">
                                    {/* TVA Toggle */}
                                    <div className="bg-amber-50/50 p-4 rounded-[1.2rem] border border-amber-100 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-black text-amber-900 mb-1">خاضع للضريبة (TVA)</h4>
                                            <p className="text-[10px] text-amber-600 font-bold">تحديد ما إذا كان هذا العميل سيتم احتساب الـ TVA في فواتيره (النظام الحقيقي)</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, isTvaSubject: !formData.isTvaSubject })}
                                            className={`relative w-14 h-8 rounded-full transition-colors ${formData.isTvaSubject ? 'bg-amber-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${formData.isTvaSubject ? 'left-1' : 'left-7'}`}></div>
                                        </button>
                                    </div>

                                    {/* RC Field */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">رقم السجل التجاري (RC)</label>
                                        <input
                                            type="text"
                                            value={formData.rc}
                                            onChange={e => setFormData({ ...formData, rc: e.target.value.toUpperCase() })}
                                            placeholder="WWXX-XXA/BXXXXXXX"
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                ${rcInfo ? (rcInfo.valid ? 'border-emerald-200 focus:border-emerald-400 bg-emerald-50/20' : 'border-red-200 focus:border-red-400 bg-red-50/20') : 'border-transparent focus:border-amber-400'}`}
                                        />
                                        {rcInfo && (
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${rcInfo.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                {rcInfo.valid ? <Check size={12} /> : <X size={12} />}
                                                <p className="text-[10px] font-bold">{rcInfo.valid ? rcInfo.breakdown : rcInfo.error}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* NIF Field */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">رقم التعريف الجبائي (NIF)</label>
                                        <input
                                            type="text"
                                            value={formData.nif}
                                            onChange={e => setFormData({ ...formData, nif: e.target.value.replace(/\s/g, '') })}
                                            placeholder="14 إلى 20 رقماً..."
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                ${nifInfo ? (nifInfo.valid ? 'border-emerald-200 focus:border-emerald-400 bg-emerald-50/20' : 'border-red-200 focus:border-red-400 bg-red-50/20') : 'border-transparent focus:border-amber-400'}`}
                                        />
                                        {nifInfo && (
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${nifInfo.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                {nifInfo.valid ? <Check size={12} /> : <X size={12} />}
                                                <p className="text-[10px] font-bold">{nifInfo.valid ? nifInfo.breakdown : nifInfo.error}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Field */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">رقم المادة (AI)</label>
                                        <input
                                            type="text"
                                            value={formData.ai}
                                            onChange={e => setFormData({ ...formData, ai: e.target.value.toUpperCase() })}
                                            placeholder="11 إلى 13 رقماً..."
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                ${aiInfo ? (aiInfo.valid ? 'border-emerald-200 focus:border-emerald-400 bg-emerald-50/20' : 'border-red-200 focus:border-red-400 bg-red-50/20') : 'border-transparent focus:border-amber-400'}`}
                                        />
                                        {aiInfo && (
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${aiInfo.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                {aiInfo.valid ? <Check size={12} /> : <X size={12} />}
                                                <p className="text-[10px] font-bold">{aiInfo.valid ? aiInfo.breakdown : aiInfo.error}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* NIS Field */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">رقم التعريف الإحصائي (NIS)</label>
                                        <input
                                            type="text"
                                            value={formData.nis}
                                            onChange={e => setFormData({ ...formData, nis: e.target.value.replace(/\s/g, '') })}
                                            placeholder="15 إلى 20 رقماً..."
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                ${nisInfo ? (nisInfo.valid ? 'border-emerald-200 focus:border-emerald-400 bg-emerald-50/20' : 'border-red-200 focus:border-red-400 bg-red-50/20') : 'border-transparent focus:border-amber-400'}`}
                                        />
                                        {nisInfo && (
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${nisInfo.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                {nisInfo.valid ? <Check size={12} /> : <X size={12} />}
                                                <p className="text-[10px] font-bold">{nisInfo.valid ? nisInfo.breakdown : nisInfo.error}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer with Dynamic Button */}
                        <div className="p-8 border-t border-gray-100 bg-white flex gap-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                            <button
                                onClick={() => setIsSheetOpen(false)}
                                className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-[1.2rem] font-black text-sm hover:bg-gray-200 transition-all active:scale-95"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSaveCustomer}
                                disabled={!isFormValid}
                                className={`flex-[2] py-4 rounded-[1.2rem] font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95
                                    ${isFormValid
                                        ? 'bg-[#8b5cf6] text-white shadow-violet-200 hover:bg-[#7c3aed] hover:shadow-violet-300'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}`}
                            >
                                <Plus size={20} /> تسجيل العميل
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* PRINT AREA */}
            <div className="hidden print-area p-8" dir="rtl">
                <div className="flex justify-between items-center mb-8 border-b-2 border-gray-900 pb-4">
                    <div>
                        <h1 className="text-3xl font-black">قائمة العملاء والمستحقات</h1>
                        <p className="text-gray-600 mt-1 italic font-bold">بتاريخ: {new Date().toLocaleDateString('ar-DZ')}</p>
                    </div>
                    <div className="text-left">
                        <p className="font-black text-xl">مخزون</p>
                        <p className="text-sm text-gray-500 font-bold">نظام إدارة المخزون والمبيعات</p>
                    </div>
                </div>

                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-2 text-right">الاسم</th>
                            <th className="border border-gray-300 p-2 text-right">النشاط</th>
                            <th className="border border-gray-300 p-2 text-right">الهاتف</th>
                            <th className="border border-gray-300 p-2 text-right">المشاريع</th>
                            <th className="border border-gray-300 p-2 text-right">الرصيد الحالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map(c => (
                            <tr key={c.id}>
                                <td className="border border-gray-300 p-2 font-bold">{c.name}</td>
                                <td className="border border-gray-300 p-2 text-xs">{c.activity || '---'}</td>
                                <td className="border border-gray-300 p-2 font-mono">{c.phone || '---'}</td>
                                <td className="border border-gray-300 p-2 text-center font-bold">{c._count?.projects || 0}</td>
                                <td className={`border border-gray-300 p-2 text-left font-sans font-black ${c.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {c.balanceDue.toLocaleString()} دج
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-50 font-black">
                            <td colSpan={4} className="border border-gray-300 p-3 text-left">إجمالي المبالغ المستحقة:</td>
                            <td className="border border-gray-300 p-3 text-left text-red-600 font-sans">
                                {filteredCustomers.reduce((s, c) => s + (c.balanceDue > 0 ? c.balanceDue : 0), 0).toLocaleString()} دج
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div className="mt-12 text-center text-[10px] text-gray-400 font-bold border-t pt-4">
                    تم استخراج هذه القائمة آلياً بواسطة نظام "مخزون" - جميع الحقوق محفوظة
                </div>
            </div>
        </div>
    );
}
