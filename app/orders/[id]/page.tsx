'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
    ShoppingBag, Calendar, User, PackageOpen, LayoutGrid, 
    Eye, Printer, FileDown, Table as TableIcon, XCircle, CheckCircle, 
    ChevronDown, ChevronUp, Banknote, RotateCcw, Edit3, Save, ArrowRight, Trash2, Plus, Search,
    Undo2
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface OrderItem {
    id: number;
    productId: number;
    quantity: number;
    returnedQuantity: number;
    unitPrice: number;
    total: number;
    product: { name: string; unit: string };
}

interface Order {
    id: number;
    orderNumber: string;
    orderDate: string;
    total: number;
    grandTotal: number;
    taxTotal: number;
    timbreAmount: number;
    status: string;
    type: 'SALE' | 'PURCHASE' | 'RETURN_SALE' | 'RETURN_PURCHASE';
    notes: string | null;
    customer?: { name: string; balanceDue: number } | null;
    supplier?: { name: string; balanceDue: number } | null;
    project?: { name: string } | null;
    items: OrderItem[];
    invoice?: { paid: number; payments?: { paymentMethod: string }[] } | null;
}

interface Product {
    id: number;
    name: string;
    quantity: number;
    sellPrice: number;
    purchasePrice: number;
    unit: string;
}

export default function OrderDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = params.id;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [allProducts, setAllProducts] = useState<Product[]>([]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/orders/${orderId}`);
            if (res.ok) {
                const data = await res.json();
                setOrder(data);
            } else {
                alert('فشل في جلب بيانات الطلبية');
                router.push('/orders');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/products');
            if (res.ok) {
                const data = await res.json();
                setAllProducts(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchOrder();
        fetchProducts();
    }, [orderId]);


    const handleQuickReturn = async (item: OrderItem) => {
        const remaining = item.quantity - item.returnedQuantity;
        if (remaining <= 0) return;

        const qty = prompt(`كم تريد استرجاع من "${item.product.name}"؟ (الحد الأقصى: ${remaining})`, remaining.toString());
        if (qty === null) return;

        const returnQty = parseInt(qty);
        if (isNaN(returnQty) || returnQty <= 0 || returnQty > remaining) {
            alert('كمية غير صالحة');
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`/api/orders/${orderId}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [{ orderItemId: item.id, returnQty }],
                    notes: `استرجاع سريع من صفحة التفاصيل`
                })
            });

            if (res.ok) {
                alert('تم الاسترجاع بنجاح');
                fetchOrder();
            } else {
                const err = await res.json();
                alert(`خطأ: ${err.error}`);
            }
        } catch (e) {
            console.error(e);
            alert('فشلت عملية الاسترجاع');
        } finally {
            setLoading(false);
        }
    };

    const subtotal = useMemo(() => {
        return (order?.items || []).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    }, [order]);

    if (loading && !order) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!order) return null;

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 flex flex-col gap-8" dir="rtl">
            {/* TOP NAVIGATION & ACTIONS */}
            <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/orders')} className="p-2 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors shadow-sm">
                        <ArrowRight size={20} className="text-gray-600" />
                    </button>
                    <div className="bg-blue-600/20 p-3 rounded-2xl border border-blue-500/30">
                        <ShoppingBag size={28} className="text-blue-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">طلبية رقم: {order.orderNumber}</h1>
                            <span className={`px-3 py-1 rounded-xl text-xs font-black border ${
                                order.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                order.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            }`}>
                                {order.status === 'DONE' ? '✅ مكتملة' : order.status === 'PENDING' ? '⏳ معلقة' : '❌ ملغاة'}
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm font-medium mt-1">تاريخ الطلب: {formatDate(order.orderDate)} • {order.type === 'SALE' ? 'طلبية بيع' : 'طلبية شراء'}</p>
                    </div>
                </div>

                <div className="flex gap-3 no-print">
                    <Link 
                        href={`/orders/${orderId}/print`}
                        className="bg-gray-900 text-white px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                    >
                        <Printer size={16} /> طباعة المستند
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* MAIN CONTENT - ITEMS */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                <TableIcon size={20} className="text-blue-500" /> تفاصيل المنتجات
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-50 text-gray-400 font-black text-xs uppercase tracking-widest border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">المنتج</th>
                                        <th className="px-6 py-4">الكمية الأصلية</th>
                                        <th className="px-6 py-4">مسترجع</th>
                                        <th className="px-6 py-4">الباقي</th>
                                        <th className="px-6 py-4">سعر الوحدة</th>
                                        <th className="px-6 py-4">المجموع</th>
                                        <th className="px-6 py-4 w-10">إجراء</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {order.items.map((item) => {
                                            const rest = item.quantity - (item.returnedQuantity || 0);
                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-800">{item.product.name}</span>
                                                            {item.returnedQuantity > 0 && (
                                                                <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-2 rounded-md w-fit mt-1">مسترجع جزئياً</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 font-sans font-medium text-gray-500">{item.quantity} {item.product.unit}</td>
                                                    <td className="px-6 py-5 font-sans font-bold text-rose-500">{item.returnedQuantity || 0}</td>
                                                    <td className="px-6 py-5 font-sans font-black text-emerald-600">{rest}</td>
                                                    <td className="px-6 py-5 font-sans font-bold text-gray-700">{item.unitPrice.toLocaleString()} دج</td>
                                                    <td className="px-6 py-5 font-black text-blue-600 font-sans">{item.total.toLocaleString()} دج</td>
                                                    <td className="px-6 py-5">
                                                        {rest > 0 && order.status !== 'CANCELLED' && (
                                                            <button 
                                                                onClick={() => handleQuickReturn(item)}
                                                                title="استرجاع"
                                                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all flex items-center gap-1 border border-amber-200"
                                                            >
                                                                <RotateCcw size={16} />
                                                                <span className="text-[10px] font-black">استرجاع</span>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-gray-400 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Edit3 size={14} /> ملاحظات الطلبية
                        </h3>
                        <p className="text-gray-700 leading-relaxed font-medium bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">
                            {order.notes || "لا توجد ملاحظات لهذه الطلبية."}
                        </p>
                    </div>
                </div>

                {/* SIDEBAR - INFO & SUMMARY */}
                <div className="flex flex-col gap-6">
                    {/* CUSTOMER/SUPPLIER INFO */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all"></div>
                        <h3 className="text-gray-400 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                            <User size={14} /> {order.type === 'SALE' ? 'معلومات العميل' : 'معلومات المورد'}
                        </h3>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                                {order.type === 'SALE' ? <User className="text-blue-500" /> : <PackageOpen className="text-blue-500" />}
                            </div>
                            <div>
                                <h4 className="font-black text-gray-900 text-lg">
                                    {order.type === 'SALE' ? (order.customer?.name || 'زبون عام') : (order.supplier?.name || 'مورد عام')}
                                </h4>
                                <p className="text-gray-500 text-xs font-bold mt-0.5">
                                    {order.project ? `مشروع: ${order.project.name}` : 'لا يوجد مشروع مرتبط'}
                                </p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400 font-bold">الرصيد الحالي:</span>
                                <span className="text-gray-900 font-black font-sans">
                                    {((order.type === 'SALE' ? order.customer?.balanceDue : order.supplier?.balanceDue) || 0).toLocaleString()} دج
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* FINANCIAL SUMMARY */}
                    <div className="bg-gray-900 rounded-3xl p-6 shadow-2xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all"></div>
                        <h3 className="text-gray-400 font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Banknote size={14} /> ملخص الحساب
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 font-bold text-sm">المجموع الفرعي:</span>
                                <span className="text-lg font-black font-sans">{subtotal.toLocaleString()} دج</span>
                            </div>
                            {order.taxTotal > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 font-bold text-sm">ضريبة القيمة المضافة:</span>
                                    <span className="text-sm font-bold font-sans">{(order.taxTotal).toLocaleString()} دج</span>
                                </div>
                            )}
                            {order.timbreAmount > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 font-bold text-sm">حقوق الطابع:</span>
                                    <span className="text-sm font-bold font-sans">{(order.timbreAmount).toLocaleString()} دج</span>
                                </div>
                            )}
                            <div className="pt-4 border-t border-gray-700/50 flex justify-between items-center">
                                <span className="text-blue-400 font-black">الإجمالي الكلي:</span>
                                <span className="text-2xl font-black font-sans text-blue-400">
                                    {order.grandTotal.toLocaleString()} دج
                                </span>
                            </div>
                            <div className="pt-2 flex justify-between items-center text-sm">
                                <span className="text-gray-400 font-bold">المبلغ المدفوع:</span>
                                <span className="text-emerald-400 font-black font-sans">{(order.invoice?.paid || 0).toLocaleString()} دج</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400 font-bold">المتبقي:</span>
                                <span className="text-rose-400 font-black font-sans">{(order.grandTotal - (order.invoice?.paid || 0)).toLocaleString()} دج</span>
                            </div>
                        </div>

                        {order.status !== 'CANCELLED' && (order.grandTotal - (order.invoice?.paid || 0)) > 0 && (
                            <button className="w-full mt-8 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                                <Banknote size={20} /> تسجيل عملية دفع
                            </button>
                        )}
                    </div>

                    {/* TIMELINE / HISTORY */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-gray-400 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                            <RotateCcw size={14} /> سجل العمليات
                        </h3>
                        <div className="space-y-6">
                            <div className="relative pr-6 border-r-2 border-gray-100 flex flex-col gap-1">
                                <div className="absolute right-[-7px] top-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                                <span className="text-xs font-black text-gray-800">تم إنشاء الطلبية</span>
                                <span className="text-[10px] font-bold text-gray-400 font-sans tracking-tight">{formatDate(order.orderDate)}</span>
                            </div>
                            {order.status === 'DONE' && (
                                <div className="relative pr-6 border-r-2 border-gray-100 flex flex-col gap-1">
                                    <div className="absolute right-[-7px] top-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
                                    <span className="text-xs font-black text-emerald-500">تم اكتمال الطلبية وتوصيلها</span>
                                    <span className="text-[10px] font-bold text-gray-400 font-sans tracking-tight">{formatDate(order.orderDate)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
