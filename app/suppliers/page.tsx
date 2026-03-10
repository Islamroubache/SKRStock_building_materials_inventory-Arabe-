'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, Edit, Trash2, X, AlertTriangle, ChevronDown, ChevronUp, Package, Building, ExternalLink } from 'lucide-react';

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
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });

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
            setFormData({ name: sup.name, phone: sup.phone || '', email: sup.email || '', address: sup.address || '' });
        } else {
            setEditingSupplier(null);
            setFormData({ name: '', phone: '', email: '', address: '' });
        }
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
                                                <td className="px-5 py-4 font-bold text-gray-900">{s.name}</td>
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

                        <div className="space-y-4 flex-1 overflow-y-auto">
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-1 block">اسم المورد / الشركة <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-1 block">رقم الهاتف</label>
                                <input
                                    type="tel" dir="ltr"
                                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-1 block">البريد الإلكتروني</label>
                                <input
                                    type="email" dir="ltr"
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-1 block">العنوان والتفاصيل</label>
                                <textarea
                                    value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                                />
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
