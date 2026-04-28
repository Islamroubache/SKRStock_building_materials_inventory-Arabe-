'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, User, Building2, Phone, CreditCard, ChevronLeft, AlertTriangle, X, Info, Archive, Printer, FileSpreadsheet, FileText, ChevronDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    activity?: string | null;
    commune?: string | null;
    wilaya?: string | null;
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
        rc: string, nif: string, ai: string, nis: string, address: string, activity: string, commune: string, wilaya: string
    }>({
        name: '', type: 'REGULAR', phone: '', email: '', creditLimit: '',
        rc: '', nif: '', ai: '', nis: '', address: '', activity: "شركة خاصة",
        commune: 'المسيلة',
        wilaya: 'المسيلة'
    });

    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const setFieldTouched = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const validations = {
        name: (() => {
            const words = formData.name.trim().split(/\s+/).filter(w => w.length > 0);
            return words.length >= 2 && words.slice(0, 2).every(w => w.length >= 3);
        })(),
        activity: (() => {
            const predefinedActivities = [
                "شركة خاصة",
                "Entreprise de Bâtiment Tous Corps d'État",
                "Entreprise d'Électricité Générale",
                "Entreprise d'Électricité Bâtiment",
                "Entreprise d'Électricité Industrielle",
                "Installateur Électricien Agréé",
                "Entreprise de Travaux Publics",
                "Entreprise de Construction",
                "Entreprise de Plomberie & Sanitaire",
                "Entreprise de Climatisation & Froid",
                "Promoteur Immobilier",
                "Bureau d'Études Technique",
                "Revendeur / Détaillant Électricité",
                "Commerce de Matériaux de Construction",
                "Administration / Établissement Public",
                "Artisan Électricien",
                "Particulier",
            ];
            const isCustom = formData.activity === 'Autre' || (formData.activity && !predefinedActivities.includes(formData.activity));
            if (!isCustom) return true;
            const words = formData.activity.trim().split(/\s+/).filter(w => w.length > 0);
            return words.length >= 2;
        })(),
        creditLimit: formData.creditLimit.length > 0,
        phone: formData.phone === '' || /^0[567]\d{8}$/.test(formData.phone),
        email: formData.email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
        rc: formData.rc === '' || formData.rc.length === 10,
        nif: formData.nif === '' || formData.nif.length === 15,
        ai: formData.ai === '' || formData.ai.length === 11,
        nis: formData.nis === '' || formData.nis.length === 15,
        address: formData.address.length >= 5,
        commune: formData.commune.length > 0,
        wilaya: formData.wilaya.length > 0,
    };

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
                activity: formData.activity || undefined,
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
                    rc: '', nif: '', ai: '', nis: '', address: '', activity: 'شركة خاصة',
                    commune: 'المسيلة',
                    wilaya: 'المسيلة'
                });
                setTouched({});
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

    const handlePrint = () => {
        window.print();
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
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-6 md:p-8 flex flex-col gap-6" dir="rtl">

            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center no-print">
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
                    <div className="flex gap-3">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-xs transition-all hover:bg-gray-800 shadow-lg"
                        >
                            <Printer size={16} /> طباعة
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-black text-xs transition-all hover:bg-gray-50 shadow-sm"
                            >
                                <Download size={16} className="text-blue-600" /> تصدير <ChevronDown size={14} className={`transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isExportMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                    <button
                                        onClick={() => {
                                            handleExport();
                                            setIsExportMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors border-b border-gray-100"
                                    >
                                        <FileSpreadsheet size={16} className="text-emerald-600" /> Excel
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleExportPDF();
                                            setIsExportMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                    >
                                        <FileText size={16} className="text-rose-600" /> PDF
                                    </button>
                                </div>
                            )}
                        </div>
                        <Link
                            href="/customers/archive"
                            className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-5 py-2.5 rounded-xl font-black text-xs transition-all hover:bg-amber-100 shadow-sm"
                        >
                            <Archive size={16} /> الأرشيف
                        </Link>
                    </div>
                    <button
                        onClick={() => setIsSheetOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
                    >
                        <Plus size={18} /> عميل جديد
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-6 border-b border-gray-200 no-print">
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
                                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 shrink-0">
                                    <img 
                                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customer.name)}&backgroundColor=transparent&textColor=1e293b&fontWeight=900&fontSize=40`} 
                                        alt={customer.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                    <div className="min-w-0 flex flex-col gap-1">
                                        <h3 className="font-bold text-gray-900 truncate text-base" title={customer.name}>{customer.name}</h3>
                                        {customer.activity && (
                                            <p className="text-gray-500 text-[10px] font-bold truncate leading-tight -mt-0.5">{customer.activity}</p>
                                        )}
                                        {customer.phone && (
                                            <p className="text-blue-600 bg-blue-50 self-start px-2 py-0.5 rounded text-xs font-mono font-bold flex items-center gap-1.5" dir="ltr">
                                                <Phone size={12} className="text-blue-500" />
                                                {customer.phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}
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

                                <div className="flex items-center gap-2 shrink-0">
                                    {(customer.balanceDue <= 0 && (customer._count?.projects || 0) === 0) && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleArchive(customer.id);
                                            }}
                                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                            title="أرشفة العميل"
                                        >
                                            <Archive size={18} />
                                        </button>
                                    )}
                                    <Link 
                                        href={`/customers/${customer.id}`}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    >
                                        <ChevronLeft size={20} />
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
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                    onBlur={() => setFieldTouched('name')}
                                    className={`w-full bg-white border rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 uppercase transition-all
                                        ${touched.name && !validations.name ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-300 focus:ring-blue-500/50'}`}
                                    required
                                />
                                {touched.name && !validations.name && (
                                    <p className="text-[10px] text-red-500 font-bold mt-1">يجب إدخال اسم العميل (كلمتان على الأقل، كل كلمة 3 أحرف على الأقل).</p>
                                )}
                            </div>

                            {/* ACTIVITY FIELD */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">النشاط التجاري <span className="text-red-500">*</span></label>
                                {(() => {
                                    const predefinedActivities = [
                                        "شركة خاصة",
                                        "Entreprise de Bâtiment Tous Corps d'État",
                                        "Entreprise d'Électricité Générale",
                                        "Entreprise d'Électricité Bâtiment",
                                        "Entreprise d'Électricité Industrielle",
                                        "Installateur Électricien Agréé",
                                        "Entreprise de Travaux Publics",
                                        "Entreprise de Construction",
                                        "Entreprise de Plomberie & Sanitaire",
                                        "Entreprise de Climatisation & Froid",
                                        "Promoteur Immobilier",
                                        "Bureau d'Études Technique",
                                        "Revendeur / Détaillant Électricité",
                                        "Commerce de Matériaux de Construction",
                                        "Administration / Établissement Public",
                                        "Artisan Électricien",
                                        "Particulier",
                                    ];
                                    const isCustom = formData.activity === 'Autre' || (formData.activity && !predefinedActivities.includes(formData.activity));
                                    const selectValue = isCustom ? 'Autre' : formData.activity;
                                    return (
                                        <>
                                            <select
                                                value={selectValue}
                                                onChange={e => {
                                                    if (e.target.value === 'Autre') {
                                                        setFormData({ ...formData, activity: 'Autre' });
                                                    } else {
                                                        setFormData({ ...formData, activity: e.target.value });
                                                    }
                                                }}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                            >
                                                {predefinedActivities.map(a => (
                                                    <option key={a} value={a}>{a}</option>
                                                ))}
                                                <option value="Autre">Autre (saisie manuelle)</option>
                                            </select>
                                            {isCustom && (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={formData.activity === 'Autre' ? '' : formData.activity}
                                                        onChange={e => setFormData({ ...formData, activity: e.target.value || 'Autre' })}
                                                        onBlur={() => setFieldTouched('activity')}
                                                        placeholder="أدخل النشاط التجاري يدوياً..."
                                                        className={`w-full bg-white border rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 transition-all mt-2
                                                            ${touched.activity && !validations.activity ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-amber-400 focus:ring-amber-500/50'}`}
                                                        autoFocus
                                                    />
                                                    {touched.activity && !validations.activity && (
                                                        <p className="text-[10px] text-red-500 font-bold mt-1">يجب إدخال كلمتين على الأقل للنشاط.</p>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

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
                                        onBlur={() => setFieldTouched('creditLimit')}
                                        className={`w-full bg-white border rounded-lg pr-16 pl-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 transition-all font-sans text-right
                                            ${touched.creditLimit && !validations.creditLimit ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-300 focus:ring-blue-500/50'}`}
                                        placeholder="100 000"
                                        required
                                    />
                                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-sans font-bold pointer-events-none uppercase ${touched.creditLimit && !validations.creditLimit ? 'text-red-500' : 'text-gray-900'}`}>DZD</span>
                                </div>
                                {touched.creditLimit && !validations.creditLimit && (
                                    <p className="text-[10px] text-red-500 font-bold mt-1">يرجى تحديد الحد الائتماني للديون.</p>
                                )}
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
                                        onBlur={() => {
                                            setFocusedField(null);
                                            setFieldTouched('phone');
                                        }}
                                        autoFocus
                                    />
                                    <div className={`flex gap-1 w-full justify-between items-center bg-white border rounded-lg px-3 py-2.5 z-10 font-mono text-lg transition-all
                                        ${focusedField === 'phone' ? 'border-blue-500 ring-4 ring-blue-500/10' : (touched.phone && !validations.phone ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-300')}`} dir="ltr">
                                        {[...Array(10)].map((_, i) => (
                                            <React.Fragment key={i}>
                                                <div
                                                    className={`flex-1 flex justify-center items-center h-9 rounded-md transition-all duration-200
                                                        ${formData.phone[i] ? 'text-gray-900 font-bold' : 
                                                            (i === formData.phone.length && focusedField === 'phone') ? 'bg-blue-100 text-blue-600 font-bold' : 'text-transparent'}`}
                                                >
                                                    {formData.phone[i] || 'x'}
                                                </div>
                                                {(i === 1 || i === 3 || i === 5 || i === 7) && <div className="w-2" />}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    {touched.phone && !validations.phone && (
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-red-500 animate-pulse pointer-events-none z-30">
                                            <AlertTriangle size={16} />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold mt-1">يجب أن يبدأ بـ 05، 06، أو 07.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">البريد الإلكتروني (اختياري)</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    onBlur={() => setFieldTouched('email')}
                                    className={`w-full bg-white border rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 font-sans transition-all
                                        ${touched.email && !validations.email ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-300 focus:ring-blue-500/50'}`}
                                    placeholder="example@domain.com"
                                />
                                {touched.email && !validations.email && (
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
                                                onBlur={() => {
                                                    setFocusedField(null);
                                                    setFieldTouched('rc');
                                                }}
                                            />
                                            <div className={`flex gap-0.5 w-full justify-between items-center bg-white border rounded-lg px-2 py-2 z-10 text-[10px] transition-all
                                                ${focusedField === 'rc' ? 'border-blue-500 ring-4 ring-blue-500/10' : (touched.rc && !validations.rc ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-200')}`} dir="ltr">
                                                {[...Array(10)].map((_, i) => (
                                                    <div key={i} className={`flex-1 flex justify-center items-center h-5 rounded-sm transition-all duration-200
                                                        ${formData.rc[i] ? 'text-gray-900 font-bold' : 
                                                            (i === formData.rc.length && focusedField === 'rc') ? 'bg-blue-100 text-blue-600 font-bold' : 'text-transparent'}`}>
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
                                                onBlur={() => {
                                                    setFocusedField(null);
                                                    setFieldTouched('nif');
                                                }}
                                            />
                                            <div className={`flex gap-0.5 w-full justify-between items-center bg-white border rounded-lg px-1.5 py-2 z-10 text-[9px] transition-all
                                                ${focusedField === 'nif' ? 'border-blue-500 ring-4 ring-blue-500/10' : (touched.nif && !validations.nif ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-200')}`} dir="ltr">
                                                {[...Array(15)].map((_, i) => (
                                                    <div key={i} className={`flex-1 flex justify-center items-center h-5 rounded-sm transition-all duration-200
                                                        ${formData.nif[i] ? 'text-gray-900 font-bold' : 
                                                            (i === formData.nif.length && focusedField === 'nif') ? 'bg-blue-100 text-blue-600 font-bold' : 'text-transparent'}`}>
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
                                                onBlur={() => {
                                                    setFocusedField(null);
                                                    setFieldTouched('ai');
                                                }}
                                            />
                                            <div className={`flex gap-0.5 w-full justify-between items-center bg-white border rounded-lg px-2 py-2 z-10 text-[10px] transition-all
                                                ${focusedField === 'ai' ? 'border-blue-500 ring-4 ring-blue-500/10' : (touched.ai && !validations.ai ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-200')}`} dir="ltr">
                                                {[...Array(11)].map((_, i) => (
                                                    <div key={i} className={`flex-1 flex justify-center items-center h-5 rounded-sm transition-all duration-200
                                                        ${formData.ai[i] ? 'text-gray-900 font-bold' : 
                                                            (i === formData.ai.length && focusedField === 'ai') ? 'bg-blue-100 text-blue-600 font-bold' : 'text-transparent'}`}>
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
                                                onBlur={() => {
                                                    setFocusedField(null);
                                                    setFieldTouched('nis');
                                                }}
                                            />
                                            <div className={`flex gap-0.5 w-full justify-between items-center bg-white border rounded-lg px-1.5 py-2 z-10 text-[9px] transition-all
                                                ${focusedField === 'nis' ? 'border-blue-500 ring-4 ring-blue-500/10' : (touched.nis && !validations.nis ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-200')}`} dir="ltr">
                                                {[...Array(15)].map((_, i) => (
                                                    <div key={i} className={`flex-1 flex justify-center items-center h-5 rounded-sm transition-all duration-200
                                                        ${formData.nis[i] ? 'text-gray-900 font-bold' : 
                                                            (i === formData.nis.length && focusedField === 'nis') ? 'bg-blue-100 text-blue-600 font-bold' : 'text-transparent'}`}>
                                                        {formData.nis[i] || 'x'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500">العنوان (الشارع / الحي) <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value.toUpperCase() })}
                                            onBlur={() => setFieldTouched('address')}
                                            className={`w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 transition-all uppercase font-black
                                                ${touched.address && !validations.address ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-200 focus:border-blue-500'}`}
                                            placeholder="الشارع, الحي, الطريق..." required
                                        />
                                        {touched.address && !validations.address && (
                                            <p className="text-[10px] text-red-500 font-bold mt-1">يرجى إدخال العنوان بالتفصيل.</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500">الولاية <span className="text-red-500">*</span></label>
                                            <select
                                                value={formData.wilaya}
                                                onChange={e => {
                                                    const w = ALGERIA_LOCATIONS.find(l => l.arabicName === e.target.value);
                                                    setFormData({ ...formData, wilaya: e.target.value, commune: (w as any)?.communes?.[0] || '' });
                                                }}
                                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 font-bold"
                                            >
                                                {ALGERIA_LOCATIONS.map(w => (
                                                    <option key={w.id} value={w.arabicName}>{w.id} - {w.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500">البلدية <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                value={formData.commune}
                                                onChange={e => setFormData({ ...formData, commune: e.target.value.toUpperCase() })}
                                                onBlur={() => setFieldTouched('commune')}
                                                className={`w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 transition-all font-bold uppercase
                                                    ${touched.commune && !validations.commune ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-200 focus:border-blue-500'}`}
                                                placeholder="البلدية..." required
                                            />
                                            {touched.commune && !validations.commune && (
                                                <p className="text-[10px] text-red-500 font-bold mt-1">يرجى إدخال البلدية.</p>
                                            )}
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
                                disabled={Object.values(validations).some(v => !v)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all"
                            >
                                تسجيل العميل
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
