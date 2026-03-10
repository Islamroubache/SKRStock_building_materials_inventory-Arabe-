'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, User, Building2, Phone, CreditCard, ChevronLeft, AlertTriangle, X } from 'lucide-react';

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
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'ALL' | 'REGULAR' | 'LOYAL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [formData, setFormData] = useState<{ name: string, type: 'REGULAR' | 'LOYAL', phone: string, email: string, creditLimit: string }>({
        name: '', type: 'REGULAR', phone: '', email: '', creditLimit: ''
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
        const matchesSearch = c.name.includes(searchTerm) || (c.phone && c.phone.includes(searchTerm));
        const matchesTab = activeTab === 'ALL' || c.type === activeTab;
        return matchesSearch && matchesTab;
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
                setFormData({ name: '', type: 'REGULAR', phone: '', email: '', creditLimit: '' });
            } else {
                const err = await res.json();
                alert(`خطأ: ${err.error}`);
            }
        } catch (e) {
            alert('حدث خطأ');
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
                    <User className="text-blue-600" /> المقاولون والمشاريع
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
                        <Plus size={18} /> مقاول جديد
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 border-b border-gray-200">
                <button
                    className="px-4 py-2.5 text-sm font-bold border-b-2 border-blue-600 text-blue-600 flex items-center gap-2 transition-colors"
                >
                    عرض جميع المقاولين
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">
                        {customers.length}
                    </span>
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center text-gray-500 h-64 font-medium">جاري التحميل...</div>
            ) : customers.length === 0 ? (
                <div className="flex-1 flex justify-center items-center text-gray-500 h-64 font-medium border-2 border-dashed border-gray-200 rounded-xl">لا يوجد مقاولون مسجلون</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {customers.map(customer => {
                        const isLoyal = true; // All are contractors now
                        const progress = isLoyal && customer.creditLimit ? Math.min((customer.balanceDue / customer.creditLimit) * 100, 100) : 0;
                        const isWarning = progress >= 90;

                        return (
                            <div key={customer.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">

                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0
                    ${isLoyal ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {getInitials(customer.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="font-bold text-gray-900 truncate" title={customer.name}>{customer.name}</h3>
                                            <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold shrink-0 bg-purple-50 text-purple-700 border border-purple-200">
                                                <Building2 size={12} />
                                                مقاول مخلص
                                            </span>
                                        </div>
                                        {customer.phone && (
                                            <p className="text-gray-500 text-sm flex items-center gap-1.5 mt-1" dir="ltr">
                                                <Phone size={14} /> {customer.phone}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {isLoyal && (
                                    <div className="flex items-center gap-2">
                                        <span className="bg-gray-100 bg-opacity-80 text-gray-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-gray-200">
                                            مشاريع: {customer._count?.projects || 0}
                                        </span>
                                        <span className="bg-gray-100 bg-opacity-80 text-gray-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-gray-200">
                                            طلبات: {customer._count?.orders || 0}
                                        </span>
                                    </div>
                                )}

                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                            <CreditCard size={14} /> الرصيد المستحق
                                        </span>
                                        {customer.balanceDue > 0 ? (
                                            <span className="bg-red-50 text-red-600 border border-red-200 text-xs px-2 py-0.5 rounded font-bold">
                                                {customer.balanceDue.toLocaleString()} دج مستحق
                                            </span>
                                        ) : (
                                            <span className="bg-green-50 text-green-600 border border-green-200 text-xs px-2 py-0.5 rounded font-bold">
                                                ✓ لا ديون
                                            </span>
                                        )}
                                    </div>

                                    {isLoyal && customer.creditLimit && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-gray-500 font-medium font-sans">
                                                <span>{customer.balanceDue.toLocaleString()}</span>
                                                <span>الحد: {customer.creditLimit.toLocaleString()}</span>
                                            </div>
                                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${isWarning ? 'bg-red-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            {isWarning && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1"><AlertTriangle size={10} /> اقترب من الحد الائتماني!</p>}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto pt-2 flex gap-2">
                                    <Link href={`/customers/${customer.id}`} className="flex-1 flex justify-center items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-bold transition-colors">
                                        عرض المشاريع <ChevronLeft size={16} />
                                    </Link>
                                    <Link href={`/orders/new?customerId=${customer.id}`} className="flex justify-center items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-5 py-2 rounded-lg text-sm font-bold transition-colors">
                                        <Plus size={16} /> طلب
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
                                <Plus size={20} className="text-blue-600" /> تسجيل مقاول جديد
                            </h2>
                            <button onClick={() => setIsSheetOpen(false)} className="text-gray-500 hover:bg-gray-200 rounded-full p-1.5 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">اسم العميل <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    required
                                />
                            </div>

                            <input type="hidden" value="LOYAL" />
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex items-start gap-3">
                                <Building2 className="text-purple-600 shrink-0" size={20} />
                                <div>
                                    <p className="text-sm font-bold text-purple-900">حساب مقاول معتمد</p>
                                    <p className="text-xs text-purple-700 leading-relaxed">سيتم إنشاء حساب مقاول يسمح بتتبع المشاريع والديون مع تحديد سقف ائتماني.</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">الحد الائتماني (دج) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    value={formData.creditLimit}
                                    onChange={e => setFormData({ ...formData, type: 'LOYAL', creditLimit: e.target.value })}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-sans"
                                    placeholder="مثال: 500000"
                                    required
                                />
                                <p className="text-xs text-gray-500">الحد الأقصى للديون المسموح بها لهذا المقاول.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">رقم الهاتف</label>
                                <input
                                    type="tel" dir="ltr"
                                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-sans"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">البريد الإلكتروني</label>
                                <input
                                    type="email" dir="ltr"
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-sans"
                                />
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
                                disabled={!formData.name || !formData.creditLimit}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all"
                            >
                                تسجيل المقاول
                            </button>
                        </div>
                    </div>
                </>
            )}

        </div>
    );
}
