'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Plus, Search, Calendar, User, CreditCard, ChevronLeft } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Order {
    id: number;
    orderNumber: string;
    orderDate: string;
    customer: { name: string };
    total: number;
    status: string;
    type: string;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/orders');
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = orders.filter(o =>
        o.orderNumber.includes(searchTerm) ||
        o.customer?.name.includes(searchTerm)
    );

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-6 md:p-8 flex flex-col gap-6" dir="rtl">

            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                    <ShoppingBag className="text-blue-600" /> إدارة الطلبات
                </h1>

                <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="بحث برقم الطلب أو العميل..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                        />
                    </div>
                    <Link
                        href="/orders/new"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
                    >
                        <Plus size={18} /> طلبية جديدة
                    </Link>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                            <tr>
                                <th className="px-6 py-4 font-semibold">رقم الطلب</th>
                                <th className="px-6 py-4 font-semibold">التاريخ</th>
                                <th className="px-6 py-4 font-semibold">العميل</th>
                                <th className="px-6 py-4 font-semibold">المبلغ الإجمالي</th>
                                <th className="px-6 py-4 font-semibold">الحالة</th>
                                <th className="px-6 py-4 font-semibold text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-12 text-gray-500 font-medium">جاري التحميل...</td></tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-gray-500 font-medium">لا توجد طلبات مسجلة</td></tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900" dir="ltr">{order.orderNumber}</td>
                                        <td className="px-6 py-4 text-gray-600 flex items-center gap-2">
                                            <Calendar size={14} className="text-gray-400" />
                                            <span dir="ltr">{formatDate(order.orderDate)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                                                <User size={14} className="text-gray-400" />
                                                {order.customer?.name || 'غير محدد'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-blue-600" dir="ltr">
                                            {order.total.toLocaleString()} دج
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full border
                        ${order.status === 'DONE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                {order.status === 'DONE' ? 'مكتمل' : 'معلق'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Link
                                                href={`/orders/${order.id}`}
                                                className="text-gray-400 hover:text-blue-600 transition-colors inline-block"
                                            >
                                                <ChevronLeft size={20} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
