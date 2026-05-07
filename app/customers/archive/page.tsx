'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, User, Phone, ChevronRight, Archive, RotateCcw, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface Customer {
    id: number;
    name: string;
    type: 'REGULAR' | 'LOYAL';
    phone: string | null;
    balanceDue: number;
    activity?: string | null;
    _count?: {
        projects: number;
        orders: number;
    };
}

export default function CustomersArchivePage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchArchivedCustomers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/customers?isArchived=true');
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
        fetchArchivedCustomers();
    }, []);

    const handleUnarchive = async (id: number) => {
        if (!confirm('هل تريد استعادة هذا العميل من الأرشيف؟')) return;
        try {
            const res = await fetch(`/api/customers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isArchived: false })
            });
            if (res.ok) {
                fetchArchivedCustomers();
            } else {
                alert('فشل في استعادة العميل');
            }
        } catch (e) {
            alert('خطأ في الاتصال');
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm))
    );

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-6 md:p-8 flex flex-col gap-6" dir="rtl">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
                    <Link href="/customers" className="hover:text-blue-600 transition-colors uppercase">قائمة العملاء</Link>
                    <ChevronRight size={14} className="rotate-180" />
                    <span className="text-gray-900">الأرشيف</span>
                </div>
                <PageHeader 
                    title="أرشيف العملاء" 
                    subtitle="قائمة العملاء المؤرشفين والذين ليس لديهم ديون عالقة" 
                    Icon={Archive} 
                />
            </div>

                <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="بحث في الأرشيف..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center text-gray-500 h-64 font-medium">جاري التحميل...</div>
            ) : filteredCustomers.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center text-gray-400 h-64 font-medium border-2 border-dashed border-gray-200 rounded-2xl gap-2">
                    <Archive size={40} className="opacity-20" />
                    <p>لا يوجد عملاء في الأرشيف</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredCustomers.map(customer => (
                        <div key={customer.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-start gap-4 group">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 shrink-0 group-hover:bg-amber-50 group-hover:border-amber-100 group-hover:text-amber-600 transition-colors">
                                <User size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 truncate mb-1">{customer.name}</h3>
                                {customer.phone && (
                                    <p className="text-gray-500 text-xs font-mono mb-2" dir="ltr">{customer.phone}</p>
                                )}
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                                    <button
                                        onClick={() => handleUnarchive(customer.id)}
                                        className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors uppercase tracking-wider"
                                    >
                                        <RotateCcw size={12} /> استعادة
                                    </button>
                                    <Link
                                        href={`/customers/${customer.id}`}
                                        className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 hover:bg-gray-50 px-2 py-1 rounded transition-colors uppercase tracking-wider"
                                    >
                                        التفاصيل
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
