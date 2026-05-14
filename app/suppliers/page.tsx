'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit, Trash2, X, AlertTriangle, ChevronDown, ChevronUp, Package, Building, ExternalLink, Printer, FileSpreadsheet, FileText, Archive, CreditCard, Phone, User, Download, Truck, RefreshCcw, Users, MapPin, Check, Info } from 'lucide-react';
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
    wilaya?: string | null;
    commune?: string | null;
    postCode?: string | null;
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
    const [activities, setActivities] = useState<string[]>([]);

    // Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState({ 
        name: '', phone: '', email: '', address: '', 
        commune: "M'sila", 
        wilaya: "M'Sila",
        postCode: '28000',
        rc: '', nif: '', ai: '', nis: '', activity: ""
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
        phone: formData.phone === '' || /^0[567]\d{8}$/.test(formData.phone),
        email: formData.email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
        address: formData.address.length >= 5,
        commune: formData.commune.length > 0,
        wilaya: formData.wilaya.length > 0,
    };

    // --- Strict Algerian Business Number Validations ---
    const validateNIF = (nif: string) => {
        if (!nif) return null;
        const clean = nif.replace(/\s/g, '');
        if (!/^\d+$/.test(clean)) return { valid: false, error: "يجب أن يحتوي على أرقام فقط بدون مسافات" };
        if (clean.length < 14 || clean.length > 20) return { valid: false, error: "يجب أن يكون بين 14 و 20 رقماً" };
        return { valid: true, breakdown: "صحيح" };
    };

    const validateNIS = (nis: string) => {
        if (!nis) return null;
        const clean = nis.replace(/\s/g, '');
        if (!/^\d+$/.test(clean)) return { valid: false, error: "يجب أن يحتوي على أرقام فقط بدون مسافات" };
        if (clean.length < 15 || clean.length > 20) return { valid: false, error: "يجب أن يكون بين 15 و 20 رقماً" };
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
        if (!/^\d+$/.test(cleanAI)) return { valid: false, error: "رقم المادة يجب أن يحتوي على أرقام فقط" };
        if (cleanAI.length < 11 || cleanAI.length > 13) return { valid: false, error: "رقم المادة يجب أن يكون بين 11 و 13 رقماً" };
        return { valid: true, breakdown: "صحيح" };
    };

    const nifInfo = validateNIF(formData.nif);
    const nisInfo = validateNIS(formData.nis);
    const rcInfo = validateRC(formData.rc);
    const aiInfo = validateAI(formData.ai);

    const isFormValid = 
        validations.name && 
        validations.phone && 
        validations.address &&
        (nifInfo === null || nifInfo.valid) &&
        (nisInfo === null || nisInfo.valid) &&
        (rcInfo === null || rcInfo.valid) &&
        (aiInfo === null || aiInfo.valid);

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

    useEffect(() => {
        fetchSuppliers();
    }, [balanceFilter]);

    const handleOpenSheet = (sup?: Supplier) => {
        if (sup) {
            setEditingSupplier(sup);
            setFormData({ 
                name: sup.name, phone: sup.phone || '', email: sup.email || '', 
                address: sup.address || '', commune: sup.commune || "M'sila", wilaya: sup.wilaya || "M'Sila",
                postCode: sup.postCode || '28000',
                rc: sup.rc || '', nif: sup.nif || '', ai: sup.ai || '', nis: sup.nis || '',
                activity: sup.activity || ""
            });
        } else {
            setEditingSupplier(null);
            setFormData({ 
                name: '', phone: '', email: '', 
                address: '', 
                commune: "M'sila", 
                wilaya: "M'Sila",
                postCode: '28000',
                rc: '', nif: '', ai: '', nis: '', activity: ""
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
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 print:hidden p-4 md:p-6 pb-0">
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
                                <button onClick={handleExport} className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-xs font-bold text-gray-700 flex items-center gap-2 border-b border-gray-50 transition-colors">
                                    <FileSpreadsheet size={14} className="text-emerald-600"/> Excel (.xlsx)
                                </button>
                                <button onClick={handleExportPDF} className="w-full text-right px-4 py-3 hover:bg-rose-50 text-xs font-bold text-gray-700 flex items-center gap-2 transition-colors">
                                    <FileText size={14} className="text-rose-600"/> PDF (.pdf)
                                </button>
                            </div>
                        </div>
                        <button onClick={handlePrint} className="bg-[#8b5cf6] text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-[#7c3aed] transition-all shadow-lg active:scale-95">
                            <Printer size={16} /> طباعة القائمة
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6 no-print mb-2 pb-1 px-4 md:px-6 pt-0 mt-[-8px]">
                {['ALL', 'DEBT', 'PAID', 'CREDIT', 'ARCHIVED'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setBalanceFilter(tab as any)}
                        className={`px-4 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${balanceFilter === tab ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                    >
                        {tab === 'ALL' ? 'الكل' : tab === 'DEBT' ? 'لهم ديون عندنا' : tab === 'PAID' ? 'خالصين' : tab === 'CREDIT' ? 'رصيد زائد لنا' : 'الأرشيف'}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${balanceFilter === tab ? 'bg-violet-50 text-violet-600' : 'bg-gray-100 text-gray-500'}`}>
                            {tab === 'ALL' ? suppliers.length : tab === 'DEBT' ? suppliers.filter(s => s.balanceDue > 0).length : tab === 'PAID' ? suppliers.filter(s => s.balanceDue === 0).length : tab === 'CREDIT' ? suppliers.filter(s => s.balanceDue < 0).length : (balanceFilter === 'ARCHIVED' ? suppliers.length : '...')}
                        </span>
                    </button>
                ))}
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm flex flex-col gap-4 print:hidden mx-4 md:mx-6">
                <div className="flex flex-col lg:flex-row gap-3 items-center">
                    <div className="relative flex-1 min-w-[300px] group">
                        <input 
                            type="text" placeholder="بحث بالاسم أو الهاتف..." value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full h-[52px] bg-white border border-gray-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10 rounded-2xl pr-14 pl-4 text-sm font-bold transition-all outline-none shadow-sm"
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-[#8b5cf6] rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none group-focus-within:scale-110 transition-transform">
                            <Search size={20} strokeWidth={3} />
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenSheet()}
                        className="h-[52px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-100 hover:shadow-blue-200 hover:scale-[1.02] active:scale-95"
                    >
                        <Plus size={20} /> مورد جديد
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center text-gray-500 h-64">جاري التحميل...</div>
            ) : filteredSuppliers.length === 0 ? (
                <div className="flex-1 flex justify-center items-center text-gray-400 h-64 font-black border-2 border-dashed border-gray-100 rounded-[2rem] mx-4 md:mx-6">
                    لا يوجد موردين مطابقون للبحث
                </div>
            ) : (
                <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden mx-4 md:mx-6 mb-8">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">المورد / النشاط</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">رقم الهاتف</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">الرصيد المالي</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs text-center uppercase tracking-widest">إحصائيات</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs text-center uppercase tracking-widest">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredSuppliers.map(supplier => {
                                    const rowClass = supplier.balanceDue > 0 ? "bg-red-50/30 hover:bg-red-50/50" : supplier.balanceDue < 0 ? "bg-violet-50/30 hover:bg-violet-50/50" : "hover:bg-gray-50/50";
                                    return (
                                        <tr key={supplier.id} onClick={() => router.push(`/suppliers/${supplier.id}`)} className={`${rowClass} transition-all group cursor-pointer`}>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-gray-900 group-hover:text-[#8b5cf6] transition-colors">{supplier.name}</span>
                                                    {supplier.activity && <span className="text-[10px] font-black text-blue-600 uppercase mt-0.5">{supplier.activity}</span>}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {supplier.phone ? (
                                                    <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-[11px] font-black" dir="ltr">
                                                        <Phone size={12} /> {supplier.phone}
                                                    </span>
                                                ) : <span className="text-gray-300 font-bold text-xs italic">---</span>}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-black ${supplier.balanceDue > 0 ? 'bg-red-50 text-red-600 shadow-sm shadow-red-100' : supplier.balanceDue < 0 ? 'bg-violet-50 text-[#8b5cf6] shadow-sm shadow-violet-100' : 'bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100'}`}>
                                                        {Math.abs(supplier.balanceDue).toLocaleString()} دج {supplier.balanceDue < 0 && '-'}
                                                    </span>
                                                    {supplier.balanceDue !== 0 && <span className={`text-[9px] font-black uppercase text-center ${supplier.balanceDue > 0 ? 'text-red-400' : 'text-violet-400'}`}>{supplier.balanceDue > 0 ? 'لهم ديون' : 'رصيد زائد لنا'}</span>}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-[10px] font-black">{supplier._count?.products || 0} منتجات</span>
                                            </td>
                                            <td className="px-8 py-6" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-2">
                                                    {balanceFilter === 'ARCHIVED' ? (
                                                        <button onClick={() => setRestoreDialog({ isOpen: true, id: supplier.id })} className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-90" title="استعادة من الأرشيف"><RefreshCcw size={18} /></button>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => handleOpenSheet(supplier)} className="p-2.5 bg-gray-50 text-gray-500 hover:bg-gray-200 rounded-xl transition-all active:scale-90" title="تعديل"><Edit size={18} /></button>
                                                            <button onClick={() => { if (supplier.balanceDue === 0) setArchiveDialog({ isOpen: true, id: supplier.id }); }} disabled={supplier.balanceDue !== 0} className={`p-2.5 rounded-xl transition-all active:scale-90 ${supplier.balanceDue === 0 ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white shadow-sm' : 'bg-gray-50/50 text-gray-200 cursor-not-allowed opacity-60'}`} title={supplier.balanceDue === 0 ? "أرشفة" : "لا يمكن الأرشفة: يوجد رصيد مالي"}><Archive size={18} /></button>
                                                        </>
                                                    )}
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
                <>
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] transition-opacity duration-300" onClick={() => setIsSheetOpen(false)} />
                    <div className="fixed top-0 bottom-0 left-0 w-full max-w-lg bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-left duration-500 overflow-hidden">
                        <div className="p-8 w-full flex items-center justify-between bg-[#8b5cf6] text-white shadow-lg shrink-0">
                            <div>
                                <h2 className="text-2xl font-black flex items-center gap-3">
                                    <Plus size={28} className="bg-white/20 p-1 rounded-lg" /> {editingSupplier ? 'تعديل بيانات المورد' : 'تسجيل مورد جديد'}
                                </h2>
                                <p className="text-white/70 text-xs font-bold mt-1 tracking-tight uppercase">إضافة بيانات المورد الجديد إلى قاعدة البيانات</p>
                            </div>
                            <button onClick={() => setIsSheetOpen(false)} className="bg-white/10 hover:bg-white/20 text-white rounded-2xl p-2 transition-all active:scale-90"><X size={24} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-gray-50/30" onKeyDown={handleKeyDown}>
                            {/* Section 1: Basic Info */}
                            <div className="space-y-6 p-6 bg-white border-2 border-violet-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-violet-200">
                                <div className="flex items-center gap-3"><div className="w-2 h-8 bg-violet-500 rounded-full"></div><h3 className="text-sm font-black text-violet-600 uppercase tracking-widest">المعلومات الشخصية</h3></div>
                                <div className="grid grid-cols-1 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">اسم المورد <span className="text-red-500">*</span></label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} onBlur={() => setFieldTouched('name')} placeholder="اسم المورد أو الشركة..." className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none transition-all ${touched.name && !validations.name ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white'}`} required />
                                        {touched.name && !validations.name && <p className="text-[10px] text-red-500 font-bold mr-2 animate-bounce">يجب إدخال اسم المورد (كلمتان على الأقل).</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1 tracking-tighter">النشاط التجاري (اختياري)</label>
                                        <input
                                            type="text"
                                            value={formData.activity}
                                            onChange={e => setFormData({ ...formData, activity: e.target.value.toUpperCase() })}
                                            placeholder="أدخل النشاط التجاري هنا..."
                                            className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">رقم الهاتف <span className="text-red-500">*</span></label>
                                        <div className="relative group"><input type="text" maxLength={10} value={formData.phone} onChange={e => { const val = e.target.value.replace(/\D/g, ''); if (val.length === 1 && val[0] !== '0') return; if (val.length === 2 && !['5', '6', '7'].includes(val[1])) return; setFormData({ ...formData, phone: val }); }} onBlur={() => setFieldTouched('phone')} placeholder="05 / 06 / 07 ..." className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-12 py-3.5 text-gray-900 font-bold font-sans transition-all ${touched.phone && !validations.phone ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white'}`} dir="ltr" /><div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-violet-400 transition-colors"><Phone size={18} /></div></div>
                                        {touched.phone && !validations.phone && <p className="text-[10px] text-red-500 font-bold mr-2">رقم الهاتف غير صحيح.</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">البريد الإلكتروني (اختياري)</label>
                                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} onBlur={() => setFieldTouched('email')} placeholder="example@domain.com" className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all ${touched.email && !validations.email ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white'}`} />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Location */}
                            <div className="space-y-6 p-6 bg-white border-2 border-emerald-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-emerald-200">
                                <div className="flex items-center gap-3"><div className="w-2 h-8 bg-emerald-500 rounded-full"></div><h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest">الموقع الجغرافي</h3></div>
                                <div className="grid grid-cols-1 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">الولاية <span className="text-red-500">*</span></label>
                                        <select value={formData.wilaya} onChange={e => { 
                                            const w = ALGERIA_LOCATIONS.find(l => l.name === e.target.value || l.arabicName === e.target.value); 
                                            const firstCommune = w?.communes?.[0];
                                            setFormData({ ...formData, wilaya: e.target.value, commune: firstCommune?.name || '', postCode: firstCommune?.postCode || '' }); 
                                        }} className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-emerald-400 focus:bg-white transition-all appearance-none cursor-pointer">
                                            {ALGERIA_LOCATIONS.map(w => <option key={w.id} value={w.name}>{w.id} - {w.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">البلدية <span className="text-red-500">*</span></label>
                                        <select
                                            value={formData.commune}
                                            onChange={e => {
                                                const selectedWilaya = ALGERIA_LOCATIONS.find(l => l.name === formData.wilaya || l.arabicName === formData.wilaya);
                                                const selectedCommune = selectedWilaya?.communes?.find(c => c.name === e.target.value);
                                                setFormData({ ...formData, commune: e.target.value, postCode: selectedCommune?.postCode || '' });
                                            }}
                                            onBlur={() => setFieldTouched('commune')}
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-4 py-3.5 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer ${touched.commune && !validations.commune ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 focus:bg-white'}`}
                                        >
                                            {(ALGERIA_LOCATIONS.find(l => l.name === formData.wilaya || l.arabicName === formData.wilaya)?.communes || []).map(c => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">الرمز البريدي</label>
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
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">العنوان بالتفصيل</label>
                                        <div className="relative group">
                                            <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value.toUpperCase() })} placeholder="اختياري (الشارع، رقم الباب...)" className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 focus:bg-white transition-all" />
                                            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-400 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Legal & Tax */}
                            <div className="space-y-6 p-6 bg-white border-2 border-amber-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-amber-200">
                                <div className="flex items-center gap-3"><div className="w-2 h-8 bg-amber-500 rounded-full"></div><h3 className="text-sm font-black text-amber-600 uppercase tracking-widest">المعلومات الجبائية والاتصال</h3></div>
                                <div className="grid grid-cols-1 gap-5">
                                    {/* RC Field */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">رقم السجل التجاري (RC)</label>
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
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">رقم التعريف الجبائي (NIF)</label>
                                        <input
                                            type="text"
                                            value={formData.nif}
                                            onChange={e => setFormData({ ...formData, nif: e.target.value.replace(/\D/g, '') })}
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
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">رقم المادة (AI)</label>
                                        <input
                                            type="text"
                                            value={formData.ai}
                                            onChange={e => setFormData({ ...formData, ai: e.target.value.replace(/\D/g, '') })}
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
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">رقم التعريف الإحصائي (NIS)</label>
                                        <input
                                            type="text"
                                            value={formData.nis}
                                            onChange={e => setFormData({ ...formData, nis: e.target.value.replace(/\D/g, '') })}
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

                        <div className="p-8 border-t border-gray-100 bg-white flex gap-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] shrink-0">
                            <button onClick={() => setIsSheetOpen(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-[1.2rem] font-black text-sm hover:bg-gray-200 transition-all active:scale-95">إلغاء</button>
                            <button onClick={handleSave} disabled={!isFormValid} className={`flex-[2] py-4 rounded-[1.2rem] font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${ isFormValid ? 'bg-[#8b5cf6] text-white shadow-violet-200 hover:bg-[#7c3aed] hover:shadow-violet-300' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' }`}><Plus size={20} /> {editingSupplier ? 'حفظ التعديلات' : 'تسجيل المورد'}</button>
                        </div>
                    </div>
                </>
            )}

            {/* DELETE CONFIRM DIALOG */}
            {deleteDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDeleteDialog({ isOpen: false, id: null })} />
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-10 w-full max-w-sm p-6 animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4 text-red-600"><AlertTriangle size={24} /><h2 className="text-lg font-bold text-gray-900">حذف المورد</h2></div>
                        <p className="text-gray-600 mb-6 text-sm">هل أنت متأكد من الحذف؟ لا يمكن التراجع. (ملاحظة: لا يمكن حذف مورد مرتبط حالياً بمنتجات).</p>
                        <div className="flex gap-3"><button onClick={() => setDeleteDialog({ isOpen: false, id: null })} className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold">إلغاء</button><button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold">حذف نهائي</button></div>
                    </div>
                </div>
            )}

            {/* ARCHIVE CONFIRM DIALOG */}
            {archiveDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setArchiveDialog({ isOpen: false, id: null })} />
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-10 w-full max-w-sm p-6 animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4 text-amber-600"><Archive size={24} /><h2 className="text-lg font-bold text-gray-900">أرشفة المورد</h2></div>
                        <p className="text-gray-600 mb-6 text-sm font-bold">هل أنت متأكد من أرشفة هذا المورد؟ لن يظهر في القوائم النشطة.</p>
                        <div className="flex gap-3"><button onClick={() => setArchiveDialog({ isOpen: false, id: null })} className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold">إلغاء</button><button onClick={() => archiveDialog.id && handleArchive(archiveDialog.id)} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg font-bold">تأكيد الأرشفة</button></div>
                    </div>
                </div>
            )}

            {/* RESTORE CONFIRM DIALOG */}
            {restoreDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setRestoreDialog({ isOpen: false, id: null })} />
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-10 w-full max-w-sm p-6 animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4 text-blue-600"><RefreshCcw size={24} /><h2 className="text-lg font-bold text-gray-900">استعادة المورد</h2></div>
                        <p className="text-gray-600 mb-6 text-sm font-bold">هل تريد استعادة هذا المورد إلى القائمة النشطة؟</p>
                        <div className="flex gap-3"><button onClick={() => setRestoreDialog({ isOpen: false, id: null })} className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold">إلغاء</button><button onClick={() => restoreDialog.id && handleRestore(restoreDialog.id)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">تأكيد الاستعادة</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
