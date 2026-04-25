'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, Edit, Trash2, X, AlertTriangle, ChevronDown, ChevronUp, Package, Building, ExternalLink } from 'lucide-react';
import { ALGERIA_LOCATIONS } from '@/lib/constants/algeria-locations';

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
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
                "Fabricant de Gaines & Tubes",
                "Fournisseur d'Équipements Industriels",
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

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/suppliers');
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
    }, []);

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

    const filteredSuppliers = suppliers.filter(s => s.name.includes(searchTerm) || (s.phone && s.phone.includes(searchTerm)));

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-6 md:p-8 flex flex-col gap-6" dir="rtl">

            {/* HEADER */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                    <Building className="text-indigo-600" /> إدارة الموردين
                </h1>

                <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="بحث باسم المورد..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenSheet()}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
                    >
                        <Plus size={18} /> مورد جديد
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                            <tr>
                                <th className="px-5 py-4 font-semibold">اسم المورد</th>
                                <th className="px-5 py-4 font-semibold">تواصل</th>
                                <th className="px-5 py-4 font-semibold">المنتجات توريد</th>
                                <th className="px-5 py-4 font-semibold">المبلغ المستحق له (دج)</th>
                                <th className="px-5 py-4 font-semibold text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-12 text-gray-500 font-medium">جاري التحميل...</td></tr>
                            ) : filteredSuppliers.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-gray-500 font-medium">لا يوجد موردين</td></tr>
                            ) : (
                                filteredSuppliers.map((s) => {
                                    const isExpanded = expandedRows.includes(s.id);
                                    return (
                                        <React.Fragment key={s.id}>
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3 text-right" dir="rtl">
                                                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 shrink-0">
                                                            <img 
                                                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.name)}&backgroundColor=transparent&textColor=4f46e5&fontWeight=900&fontSize=40`} 
                                                                alt={s.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <span className="font-bold text-gray-900">{s.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-gray-600">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span dir="ltr" className="text-right">{s.phone || '-'}</span>
                                                        <span className="text-xs text-gray-400">{s.email || ''}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded font-bold text-xs">
                                                        {s._count?.products || 0} منتج
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {s.balanceDue > 0 ? (
                                                        <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-200" dir="ltr">
                                                            {s.balanceDue.toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500 font-medium whitespace-nowrap" dir="ltr">0</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
                                                        <Link href={`/suppliers/${s.id}`} className="text-gray-400 hover:text-indigo-600 transition-colors" title="عرض التفاصيل">
                                                            <ExternalLink size={18} />
                                                        </Link>
                                                        <button onClick={() => handleOpenSheet(s)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                                                            <Edit size={18} />
                                                        </button>
                                                        <button onClick={() => setDeleteDialog({ isOpen: true, id: s.id })} className="text-gray-400 hover:text-red-600 transition-colors">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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
                                        "Fabricant de Gaines & Tubes",
                                        "Fournisseur d'Équipements Industriels",
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
                            <button
                                onClick={() => setDeleteDialog({ isOpen: false, id: null })}
                                className="flex-1 bg-white text-gray-700 border border-gray-300 py-2 rounded-lg font-bold text-sm"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold text-sm"
                            >
                                تأكيد الحذف
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
