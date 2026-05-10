'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit, Trash2, X, AlertTriangle, ChevronDown, ChevronUp, Package, Building, ExternalLink, Printer, FileSpreadsheet, FileText, Archive, CreditCard, Phone, User, Download, Truck, RefreshCcw, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ALGERIA_LOCATIONS } from '@/lib/constants/algeria-locations';
import { printDocument } from '@/lib/print-helper';

interface Product {
    id: number;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    purchasePrice: number;
}

interface Supplier {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    balanceDue: number;
    products: Product[];
    rc: string | null;
    nif: string | null;
    ai: string | null;
    nis: string | null;
    activity?: string | null;
    _count?: {
        products: number;
    }
}

export default function SuppliersPage() {
    const router = useRouter();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'DEBT' | 'PAID' | 'CREDIT' | 'ARCHIVED'>('ALL');
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [activities, setActivities] = useState<string[]>([]);

    const [expandedRows, setExpandedRows] = useState<number[]>([]);

    // Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState({ 
        name: '', phone: '', email: '', address: '', 
        commune: 'المسيلة', 
        wilaya: 'المسيلة',
        rc: '', nif: '', ai: '', nis: '', activity: "Grossiste en Matériel Électrique"
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
                "Fabricant de Câbles & Fils Électriques",
                "Fabricant de Matériel Électrique",
                "Fabricant d'Éclairage & LED",
                "Fabricant d'Appareillage Électrique",
                "Grossiste en Matériel Électrique",
                "Importateur de Matériel Électrique",
                "Commerce en Gros d'Électricité",
                "Distributeur Agréé",
                "Fabricant de Coffrets & Tableaux",
                "Fabricant de Gaine & Tube",
                "Fournisseur d'Équipements Industriels",
                "Grossiste en Électricité",
            ];
            const isCustom = formData.activity === 'Autre' || (formData.activity && !predefinedActivities.includes(formData.activity));
            if (!isCustom) return true;
            const words = formData.activity.trim().split(/\s+/).filter(w => w.length > 0);
            return words.length >= 2;
        })(),
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

    // Dialog State
    const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });
    const [archiveDialog, setArchiveDialog] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });
    const [restoreDialog, setRestoreDialog] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const onlyArchived = balanceFilter === 'ARCHIVED';
            const res = await fetch(`/api/suppliers?onlyArchived=${onlyArchived}`);
            if (res.ok) {
                const data = await res.json();
                setSuppliers(data);
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
                if (data.activities) {
                    const acts = data.activities.split(',');
                    setActivities(acts);
                    if (!editingSupplier) setFormData(prev => ({ ...prev, activity: acts[0] }));
                }
            }
        } catch (e) {}
    };

    useEffect(() => {
        fetchSuppliers();
        fetchSettings();
    }, [balanceFilter]);

    const toggleExpand = async (supplierId: number) => {
        if (expandedRows.includes(supplierId)) {
            setExpandedRows(expandedRows.filter(id => id !== supplierId));
        } else {
            // If we don't have the products loaded yet, fetch full details
            const supplier = suppliers.find(s => s.id === supplierId);
            if (supplier && !supplier.products) {
                try {
                    const res = await fetch(`/api/suppliers/${supplierId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, products: data.products } : s));
                    }
                } catch (e) { }
            }
            setExpandedRows([...expandedRows, supplierId]);
        }
    };

    const handleOpenSheet = (sup?: Supplier) => {
        if (sup) {
            setEditingSupplier(sup);
            setFormData({ 
                name: sup.name, phone: sup.phone || '', email: sup.email || '', 
                address: sup.address || '', commune: (sup as any).commune || '', wilaya: (sup as any).wilaya || '',
                rc: sup.rc || '', nif: sup.nif || '', ai: sup.ai || '', nis: sup.nis || '',
                activity: sup.activity || "Grossiste en Matériel Électrique"
            });
        } else {
            setEditingSupplier(null);
            setFormData({ 
                name: '', phone: '', email: '', 
                address: '', 
                commune: 'المسيلة', 
                wilaya: 'المسيلة',
                rc: '', nif: '', ai: '', nis: '', activity: "Grossiste en Matériel Électrique"
            });
        }
        setTouched({});
        setIsSheetOpen(true);
    };

    const handleSave = async () => {
        const isEdit = !!editingSupplier;
        const url = isEdit ? `/api/suppliers/${editingSupplier.id}` : `/api/suppliers`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsSheetOpen(false);
                fetchSuppliers();
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
            const target = e.target as HTMLInputElement;
            const isTextAtStart = target.tagName !== 'INPUT' || (target.selectionStart === 0 && target.selectionEnd === 0);
            
            if (isTextAtStart && index > 0) {
                e.preventDefault();
                (focusableElements[index - 1] as HTMLElement).focus();
            }
        }
    };

    const confirmDelete = async () => {
        if (!deleteDialog.id) return;
        try {
            const res = await fetch(`/api/suppliers/${deleteDialog.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuppliers(suppliers.filter(s => s.id !== deleteDialog.id));
            setDeleteDialog({ isOpen: false, id: null });
        } catch (e: any) {
            alert(`خطأ: ${e.message}`);
            setDeleteDialog({ isOpen: false, id: null });
        }
    };

    const handleArchive = async (id: number) => {
        try {
            const res = await fetch(`/api/suppliers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isArchived: true })
            });
            if (res.ok) {
                fetchSuppliers();
                setArchiveDialog({ isOpen: false, id: null });
            } else {
                alert('فشل في أرشفة المورد');
            }
        } catch (e) {
            alert('خطأ في الاتصال');
        }
    };

    const handleRestore = async (id: number) => {
        try {
            const res = await fetch(`/api/suppliers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isArchived: false })
            });
            if (res.ok) {
                fetchSuppliers();
                setRestoreDialog({ isOpen: false, id: null });
            } else {
                alert('فشل في استعادة المورد');
            }
        } catch (e) {
            alert('خطأ في الاتصال');
        }
    };

    const handlePrint = () => {
        printDocument();
    };

    const handleExport = () => {
        const data = filteredSuppliers.map(s => ({
            'اسم المورد': s.name,
            'النشاط': s.activity || '---',
            'الهاتف': s.phone || '---',
            'الرصيد الحالي': s.balanceDue,
            'عدد المنتجات': s._count?.products || 0,
            'العنوان': s.address || '---',
            'البلدية': s.commune || '---',
            'الولاية': s.wilaya || '---'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "الموردين");
        XLSX.writeFile(wb, `قائمة_الموردين_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(20);
        doc.text('Liste des Fournisseurs', 14, 22);

        const tableData = filteredSuppliers.map(s => [
            s.name,
            s.phone || '---',
            s.balanceDue + ' DZD',
            s._count?.products || 0,
            s.activity || '---',
            s.wilaya || '---'
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['Nom', 'Telephone', 'Solde (Dette)', 'Produits', 'Activite', 'Wilaya']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: 255 },
            styles: { fontSize: 8, font: 'helvetica' }
        });

        doc.save(`fournisseurs_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const filteredSuppliers = suppliers.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.phone && s.phone.includes(searchTerm));
        if (balanceFilter === 'ARCHIVED') return matchesSearch;

        const matchesBalance =
            balanceFilter === 'ALL' ? true :
            balanceFilter === 'DEBT' ? s.balanceDue > 0 :
            balanceFilter === 'CREDIT' ? s.balanceDue < 0 :
            s.balanceDue === 0;
        return matchesSearch && matchesBalance;
    });

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
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 print:hidden p-4 md:p-8 pb-0">
                    <PageHeader 
                        title="إدارة الموردين" 
                        subtitle="متابعة المشتريات والديون والتعامل مع الموردين" 
                        Icon={Truck} 
                    />
                    <div className="flex gap-2 w-full lg:w-auto justify-end shrink-0">
                        <div className="relative group">
                            <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-black text-xs shadow-sm flex items-center gap-2 hover:bg-gray-50 transition-all">
                                <Download size={14} className="text-blue-600"/> تصدير
                            </button>
                            <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <button 
                                    onClick={handleExport} 
                                    className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-xs font-bold text-gray-700 flex items-center gap-2 border-b border-gray-50 transition-colors"
                                >
                                    <FileSpreadsheet size={14} className="text-emerald-600"/> Excel (.xlsx)
                                </button>
                                <button 
                                    onClick={handleExportPDF} 
                                    className="w-full text-right px-4 py-3 hover:bg-rose-50 text-xs font-bold text-gray-700 flex items-center gap-2 transition-colors"
                                >
                                    <FileText size={14} className="text-rose-600"/> PDF (.pdf)
                                </button>
                            </div>
                        </div>
                        <button 
                            onClick={handlePrint}
                            className="bg-[#8b5cf6] text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-[#7c3aed] transition-all shadow-lg active:scale-95"
                        >
                            <Printer size={16} /> طباعة القائمة
                        </button>
                        <Link
                            href="/suppliers/archive"
                            className="hidden" // Hidden because we now have a tab
                        >
                            الأرشيف
                        </Link>
                    </div>
                </div>
            </div>

            {/* Tabs Header */}
            <div className="flex items-center gap-6 no-print mb-2 pb-1 px-4 md:px-8 pt-0 mt-[-8px]">
                <button
                    onClick={() => setBalanceFilter('ALL')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${balanceFilter === 'ALL' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    الكل
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${balanceFilter === 'ALL' ? 'bg-violet-50 text-violet-600' : 'bg-gray-100 text-gray-500'}`}>
                        {suppliers.length}
                    </span>
                </button>
                <button
                    onClick={() => setBalanceFilter('DEBT')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${balanceFilter === 'DEBT' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    لهم ديون عندنا
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${balanceFilter === 'DEBT' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                        {suppliers.filter(s => s.balanceDue > 0).length}
                    </span>
                </button>
                <button
                    onClick={() => setBalanceFilter('PAID')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${balanceFilter === 'PAID' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    خالصين
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${balanceFilter === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                        {suppliers.filter(s => s.balanceDue === 0).length}
                    </span>
                </button>
                <button
                    onClick={() => setBalanceFilter('CREDIT')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${balanceFilter === 'CREDIT' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    رصيد زائد لنا
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${balanceFilter === 'CREDIT' ? 'bg-violet-50 text-violet-600' : 'bg-gray-100 text-gray-500'}`}>
                        {suppliers.filter(s => s.balanceDue < 0).length}
                    </span>
                </button>
                <button
                    onClick={() => setBalanceFilter('ARCHIVED')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${balanceFilter === 'ARCHIVED' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    الأرشيف
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${balanceFilter === 'ARCHIVED' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                        {balanceFilter === 'ARCHIVED' ? suppliers.length : '...'}
                    </span>
                </button>
            </div>

            {/* Filters Box */}
            <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm flex flex-col gap-4 print:hidden mx-4 md:mx-8">
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
                            onClick={() => handleOpenSheet()}
                            className="h-[52px] flex-1 lg:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-100 hover:shadow-blue-200 hover:scale-[1.02] active:scale-95"
                        >
                            <Plus size={20} /> مورد جديد
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center text-gray-500 h-64 font-medium italic">جاري التحميل...</div>
            ) : filteredSuppliers.length === 0 ? (
                <div className="flex-1 flex justify-center items-center text-gray-400 h-64 font-black border-2 border-dashed border-gray-100 rounded-[2rem] mx-4 md:mx-8">
                    لا يوجد موردين مطابقون للبحث
                </div>
            ) : (
                <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden mx-4 md:mx-8 mb-8">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">المورد / النشاط</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">رقم الهاتف</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">الرصيد المالي</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-center">الإحصائيات</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredSuppliers.map(supplier => {
                                    const rowClass = supplier.balanceDue > 0 
                                        ? "bg-red-50/50 hover:bg-red-100/70"
                                        : supplier.balanceDue < 0 
                                            ? "bg-violet-50/50 hover:bg-violet-100/70"
                                            : "bg-emerald-50/40 hover:bg-emerald-100/60";

                                    return (
                                        <tr 
                                            key={supplier.id} 
                                            onClick={() => router.push(`/suppliers/${supplier.id}`)}
                                            className={`${rowClass} transition-all group cursor-pointer`}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-gray-900 text-base mb-0.5">{supplier.name}</span>
                                                        {supplier.activity && (
                                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{supplier.activity}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {supplier.phone ? (
                                                    <span className="inline-flex bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-black font-sans tracking-tight border border-blue-100 shadow-sm" dir="ltr">
                                                        {supplier.phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 font-bold text-xs italic">---</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    {supplier.balanceDue > 0 ? (
                                                        <span className="inline-flex items-center justify-center bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-black font-sans border border-red-100 shadow-sm">
                                                            {supplier.balanceDue.toLocaleString()} دج
                                                        </span>
                                                    ) : supplier.balanceDue < 0 ? (
                                                        <span className="inline-flex items-center justify-center bg-violet-50 text-[#8b5cf6] px-3 py-1 rounded-lg text-xs font-black font-sans border border-violet-100 shadow-sm">
                                                            {Math.abs(supplier.balanceDue).toLocaleString()} دج-
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-xs font-black font-sans border border-emerald-100 shadow-sm">
                                                            0 دج
                                                        </span>
                                                    )}
                                                    
                                                    {supplier.balanceDue !== 0 && (
                                                        <span className={`text-[9px] font-black uppercase tracking-tighter text-center ${supplier.balanceDue > 0 ? 'text-red-400' : 'text-violet-400'}`}>
                                                            {supplier.balanceDue > 0 ? 'ديون له' : 'رصيد زائد لنا'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs font-black text-gray-900 font-sans">{supplier._count?.products || 0}</span>
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">منتجات</span>
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
                                                                     onClick={() => setRestoreDialog({ isOpen: true, id: supplier.id })}
                                                                     className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                                     title="استعادة المورد"
                                                                 >
                                                                     <RefreshCcw size={18} />
                                                                 </button>
                                                             );
                                                         }

                                                         const canArchive = supplier.balanceDue === 0;
                                                         return (
                                                             <button
                                                                 onClick={() => { if (canArchive) setArchiveDialog({ isOpen: true, id: supplier.id }); }}
                                                                 disabled={!canArchive}
                                                                 className={`p-2.5 rounded-xl transition-all ${canArchive 
                                                                     ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white shadow-sm' 
                                                                     : 'bg-gray-50/50 text-gray-200 cursor-not-allowed opacity-60'}`}
                                                                 title={canArchive ? "أرشفة المورد" : "لا يمكن الأرشفة: يوجد رصيد مالي"}
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

            {/* ADD/EDIT SHEET */}
            {isSheetOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsSheetOpen(false)} />
                    <div className="bg-white w-full max-w-md h-full z-10 p-6 flex flex-col shadow-2xl border-l border-gray-200 animate-in slide-in-from-right">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Building className="text-indigo-600" />
                            {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
                        </h2>

                        <div className="space-y-4 flex-1 overflow-y-auto" onKeyDown={handleKeyDown}>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">اسم المورد <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" value={formData.name} 
                                    onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} 
                                    onBlur={() => setFieldTouched('name')}
                                    className={`w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 transition-all font-black text-sm uppercase
                                        ${touched.name && !validations.name ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-300 focus:ring-indigo-500'}`} 
                                    placeholder="اسم الشركة أو المورد..." required 
                                />
                                {touched.name && !validations.name && (
                                    <p className="text-[10px] text-red-500 font-bold mt-1 text-right">يجب إدخال اسم المورد (كلمتان على الأقل، كل كلمة 3 أحرف على الأقل).</p>
                                )}
                            </div>

                            {/* ACTIVITY FIELD */}
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-1 block">النشاط التجاري <span className="text-red-500">*</span></label>
                                {(() => {
                                    const predefinedActivities = activities.length > 0 ? activities : [
                                        "Grossiste en Matériel Électrique",
                                        "Importateur",
                                        "Fabricant"
                                    ];
                                    const currentActivity = (formData as any).activity || '';
                                    const isCustom = currentActivity === 'Autre' || (currentActivity && !predefinedActivities.includes(currentActivity));
                                    const selectValue = isCustom ? 'Autre' : currentActivity;
                                    return (
                                        <>
                                            <select
                                                value={selectValue}
                                                onChange={e => {
                                                    if (e.target.value === 'Autre') {
                                                        setFormData({ ...formData, activity: 'Autre' } as any);
                                                    } else {
                                                        setFormData({ ...formData, activity: e.target.value } as any);
                                                    }
                                                }}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
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
                                                        value={currentActivity === 'Autre' ? '' : currentActivity}
                                                        onChange={e => setFormData({ ...formData, activity: e.target.value || 'Autre' } as any)}
                                                        onBlur={() => setFieldTouched('activity')}
                                                        placeholder="أدخل النشاط التجاري يدوياً..."
                                                        className={`w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 transition-all mt-2
                                                            ${touched.activity && !validations.activity ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-amber-400 focus:ring-amber-500/50 text-gray-900'}`}
                                                        autoFocus
                                                    />
                                                    {touched.activity && !validations.activity && (
                                                        <p className="text-[10px] text-red-500 font-bold mt-1 text-right">يجب إدخال كلمتين على الأقل للنشاط.</p>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    );
                                })()}
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
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-1 block">البريد الإلكتروني</label>
                                <input
                                    type="email" dir="ltr"
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                                />
                            </div>
                            <div className="space-y-3 pt-2">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700 block">العنوان (الشارع / الحي / Cité) <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value.toUpperCase() })} 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm uppercase" 
                                        placeholder="Cité, Street, Ave..." required 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-gray-700 block">الولاية <span className="text-red-500">*</span></label>
                                        <select 
                                            value={formData.wilaya} 
                                            onChange={e => {
                                                const w = ALGERIA_LOCATIONS.find(l => l.arabicName === e.target.value);
                                                setFormData({ ...formData, wilaya: e.target.value, commune: (w as any)?.communes?.[0] || '' });
                                            }}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm bg-white"
                                        >
                                            {ALGERIA_LOCATIONS.map(w => (
                                                <option key={w.id} value={w.arabicName}>{w.id} - {w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-gray-700 block">البلدية <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" value={formData.commune} onChange={e => setFormData({ ...formData, commune: e.target.value.toUpperCase() })} 
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm bg-white uppercase" 
                                            placeholder="البلدية..." required 
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-gray-100 space-y-3">
                                <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">الهوية الجبائية والقانونية</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* RC - 10 chars */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500">سجل تجاري (RC)</label>
                                        <div className="relative font-mono">
                                            <input 
                                                type="text" maxLength={10} value={formData.rc} 
                                                onChange={e => setFormData({ ...formData, rc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} 
                                                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text"
                                                onBlur={() => {
                                                    setFocusedField(null);
                                                    setFieldTouched('rc');
                                                }}
                                                dir="ltr"
                                            />
                                            <div className={`flex gap-0.5 w-full justify-between items-center bg-white border rounded-lg px-2 py-2 z-10 text-[10px] transition-all
                                                ${focusedField === 'rc' ? 'border-indigo-500 ring-4 ring-indigo-500/10' : (touched.rc && !validations.rc ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-200')}`} dir="ltr">
                                                {[...Array(10)].map((_, i) => (
                                                    <div key={i} className={`flex-1 flex justify-center items-center h-5 rounded-sm transition-all duration-200
                                                        ${formData.rc[i] ? 'text-gray-900 font-bold' : 
                                                            (i === formData.rc.length && focusedField === 'rc') ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-transparent'}`}>
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
                                                onFocus={() => setFocusedField('nif')}
                                                onBlur={() => {
                                                    setFocusedField(null);
                                                    setFieldTouched('nif');
                                                }}
                                                dir="ltr"
                                            />
                                            <div className={`flex gap-0.5 w-full justify-between items-center bg-white border rounded-lg px-1.5 py-2 z-10 text-[9px] transition-all
                                                ${focusedField === 'nif' ? 'border-indigo-500 ring-4 ring-indigo-500/10' : (touched.nif && !validations.nif ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-200')}`} dir="ltr">
                                                {[...Array(15)].map((_, i) => (
                                                    <div key={i} className={`flex-1 flex justify-center items-center h-5 rounded-sm transition-all duration-200
                                                        ${formData.nif[i] ? 'text-gray-900 font-bold' : 
                                                            (i === formData.nif.length && focusedField === 'nif') ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-transparent'}`}>
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
                                                onFocus={() => setFocusedField('ai')}
                                                onBlur={() => {
                                                    setFocusedField(null);
                                                    setFieldTouched('ai');
                                                }}
                                                dir="ltr"
                                            />
                                            <div className={`flex gap-0.5 w-full justify-between items-center bg-white border rounded-lg px-2 py-2 z-10 text-[10px] transition-all
                                                ${focusedField === 'ai' ? 'border-indigo-500 ring-4 ring-indigo-500/10' : (touched.ai && !validations.ai ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-200')}`} dir="ltr">
                                                {[...Array(11)].map((_, i) => (
                                                    <div key={i} className={`flex-1 flex justify-center items-center h-5 rounded-sm transition-all duration-200
                                                        ${formData.ai[i] ? 'text-gray-900 font-bold' : 
                                                            (i === formData.ai.length && focusedField === 'ai') ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-transparent'}`}>
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
                                                onFocus={() => setFocusedField('nis')}
                                                onBlur={() => {
                                                    setFocusedField(null);
                                                    setFieldTouched('nis');
                                                }}
                                                dir="ltr"
                                            />
                                            <div className={`flex gap-0.5 w-full justify-between items-center bg-white border rounded-lg px-1.5 py-2.5 z-10 text-[9px] transition-all
                                                ${focusedField === 'nis' ? 'border-indigo-500 ring-4 ring-indigo-500/10' : (touched.nis && !validations.nis ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-200')}`} dir="ltr">
                                                {[...Array(15)].map((_, i) => (
                                                    <div key={i} className={`flex-1 flex justify-center items-center h-5 rounded-sm transition-all duration-200
                                                        ${formData.nis[i] ? 'text-gray-900 font-bold' : 
                                                            (i === formData.nis.length && focusedField === 'nis') ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-transparent'}`}>
                                                        {formData.nis[i] || 'x'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-gray-200 mt-4">
                            <button
                                onClick={() => setIsSheetOpen(false)}
                                className="flex-[0.5] border border-gray-300 bg-white text-gray-700 py-2.5 rounded-lg font-bold text-sm"
                            >إلغاء</button>
                            <button
                                onClick={handleSave}
                                disabled={!formData.name}
                                className="flex-1 bg-indigo-600 text-white disabled:opacity-50 py-2.5 rounded-lg font-bold text-sm shadow-sm"
                            >حفظ بيانات المورد</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRM DIALOG */}
            {deleteDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDeleteDialog({ isOpen: false, id: null })} />
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-10 w-full max-w-sm p-6 animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <AlertTriangle size={24} />
                            <h2 className="text-lg font-bold text-gray-900">حذف المورد</h2>
                        </div>
                        <p className="text-gray-600 mb-6 text-sm">
                            هل أنت متأكد من الحذف؟ لا يمكن التراجع. (ملاحظة: لا يمكن حذف مورد مرتبط حالياً بمنتجات).
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteDialog({ isOpen: false, id: null })} className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold">إلغاء</button>
                            <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold">حذف نهائي</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ARCHIVE CONFIRM DIALOG */}
            {archiveDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setArchiveDialog({ isOpen: false, id: null })} />
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-10 w-full max-w-sm p-6 animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4 text-amber-600">
                            <Archive size={24} />
                            <h2 className="text-lg font-bold text-gray-900">أرشفة المورد</h2>
                        </div>
                        <p className="text-gray-600 mb-6 text-sm font-bold">
                            هل أنت متأكد من أرشفة هذا المورد؟ لن يظهر في القوائم النشطة.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setArchiveDialog({ isOpen: false, id: null })} className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold">إلغاء</button>
                            <button onClick={() => archiveDialog.id && handleArchive(archiveDialog.id)} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg font-bold">تأكيد الأرشفة</button>
                        </div>
                    </div>
                </div>
            )}

            {/* RESTORE CONFIRM DIALOG */}
            {restoreDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setRestoreDialog({ isOpen: false, id: null })} />
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-10 w-full max-w-sm p-6 animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4 text-blue-600">
                            <RefreshCcw size={24} />
                            <h2 className="text-lg font-bold text-gray-900">استعادة المورد</h2>
                        </div>
                        <p className="text-gray-600 mb-6 text-sm font-bold">
                            هل تريد استعادة هذا المورد إلى القائمة النشطة؟
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setRestoreDialog({ isOpen: false, id: null })} className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold">إلغاء</button>
                            <button onClick={() => restoreDialog.id && handleRestore(restoreDialog.id)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">تأكيد الاستعادة</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
