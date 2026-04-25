'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, RotateCcw, CheckCircle, PackageOpen, ShoppingBag, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
    id: number;
    quantity: number;
    returnedQuantity: number;
    unitPrice: number;
    total: number;
    product: { name: string; unit: string };
}

interface Order {
    id: number;
    orderNumber: string;
    type: string;
    status: string;
    total: number;
    customer?: { name: string } | null;
    supplier?: { name: string } | null;
    customerName?: string | null;
    items: OrderItem[];
}

export default function ReturnOrderPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notes, setNotes] = useState('');
    const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
    const [success, setSuccess] = useState(false);
    const [returnOrderNumber, setReturnOrderNumber] = useState('');

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/orders/${orderId}`);
                if (res.ok) {
                    const data = await res.json();
                    setOrder(data);
                    // Init all quantities to 0
                    const init: Record<number, number> = {};
                    data.items.forEach((item: OrderItem) => { init[item.id] = 0; });
                    setReturnQtys(init);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    const handleQtyChange = (itemId: number, val: number, max: number) => {
        setReturnQtys(prev => ({ ...prev, [itemId]: Math.max(0, Math.min(val, max)) }));
    };

    const selectedItems = order?.items.filter(i => (returnQtys[i.id] || 0) > 0) || [];
    const returnTotal = selectedItems.reduce((sum, i) => sum + (returnQtys[i.id] || 0) * i.unitPrice, 0);

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            alert('يجب اختيار كمية مرتجعة واحدة على الأقل');
            return;
        }
        if (!confirm(`هل أنت متأكد من استرجاع هذه المنتجات؟ لا يمكن التراجع عن هذه العملية.`)) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/orders/${orderId}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes,
                    items: selectedItems.map(i => ({
                        orderItemId: i.id,
                        returnQty: returnQtys[i.id]
                    }))
                })
            });
            if (res.ok) {
                const data = await res.json();
                console.log("Return success data:", data);
                setReturnOrderNumber(data.returnOrder?.orderNumber || 'N/A');
                setSuccess(true);
            } else {
                const err = await res.json();
                console.error("Return error data:", err);
                alert(`❌ خطأ: ${err.error}`);
            }
        } catch (e: any) {
            alert(`حدث خطأ: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
                <p className="mt-4 text-gray-500 font-bold">جاري تحميل بيانات الطلبية...</p>
            </div>
        </div>
    );

    if (!order) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
            <p className="text-gray-500 font-bold">الطلبية غير موجودة</p>
        </div>
    );

    const isSale = order.type === 'SALE';
    const partyName = isSale
        ? (order.customer?.name || order.customerName || 'زبون عابر')
        : (order.supplier?.name || order.customerName || 'مورد غير محدد');

    if (success) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8" dir="rtl">
            <div className="bg-white border border-gray-200 rounded-[2rem] p-10 max-w-md w-full text-center shadow-2xl">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} className="text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">تم الاسترجاع بنجاح!</h2>
                <p className="text-gray-500 font-medium mb-6">تم إنشاء طلبية الاسترجاع وتحديث المخزون تلقائياً.</p>
                <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-right space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-500 font-bold text-sm">رقم الاسترجاع:</span>
                        <span className="font-black text-rose-600 font-sans text-sm">{returnOrderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 font-bold text-sm">المبلغ المرتجع:</span>
                        <span className="font-black text-gray-900 font-sans">{returnTotal.toLocaleString()} دج</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link href="/orders" className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-2xl font-black text-sm transition-colors">
                        قائمة الطلبيات
                    </Link>
                    <Link href="/orders/new?type=SALE" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-2xl font-black text-sm transition-colors">
                        طلبية جديدة
                    </Link>
                </div>
            </div>
        </div>
    );

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/orders" className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-500">
                    <ArrowRight size={20} />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center">
                        <RotateCcw size={22} className="text-rose-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">استرجاع طلبية</h1>
                        <p className="text-sm text-gray-500 font-medium">
                            {isSale ? <span className="inline-flex items-center gap-1"><ShoppingBag size={13}/> بيع</span>
                                    : <span className="inline-flex items-center gap-1"><PackageOpen size={13}/> شراء</span>}
                            {' — '}{order.orderNumber}
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto space-y-6">
                {/* Order Info */}
                <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-400 font-bold mb-1">رقم الطلبية الأصلية</p>
                            <p className="font-black text-gray-900 font-sans">{order.orderNumber}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 font-bold mb-1">{isSale ? 'العميل' : 'المورد'}</p>
                            <p className="font-black text-gray-900">{partyName}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 font-bold mb-1">إجمالي الطلبية</p>
                            <p className="font-black text-gray-900 font-sans">{order.total.toLocaleString()} دج</p>
                        </div>
                        <div>
                            <p className="text-gray-400 font-bold mb-1">الحالة</p>
                            <span className={`px-3 py-1 rounded-lg text-xs font-black border inline-block
                                ${order.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                {order.status === 'DONE' ? '✅ مكتملة' : '⏳ معلقة'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-gray-100">
                        <h2 className="font-black text-gray-700">اختر الكميات المرتجعة</h2>
                        <p className="text-xs text-gray-400 font-medium mt-1">أدخل 0 لعدم استرجاع المنتج</p>
                    </div>
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 text-xs font-black uppercase">
                            <tr>
                                <th className="px-6 py-4">المنتج</th>
                                <th className="px-6 py-4 text-center">الكمية الأصلية</th>
                                <th className="px-6 py-4 text-center">تم استرجاعه</th>
                                <th className="px-6 py-4 text-center">الكمية المرتجعة الآن</th>
                                <th className="px-6 py-4 text-left">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {order.items.map(item => {
                                const alreadyReturned = item.returnedQuantity || 0;
                                const maxReturnable = item.quantity - alreadyReturned;
                                const currentReturnQty = returnQtys[item.id] || 0;
                                return (
                                    <tr key={item.id} className={`transition-colors ${currentReturnQty > 0 ? 'bg-rose-50' : 'hover:bg-gray-50'}`}>
                                        <td className="px-6 py-4 font-bold text-gray-800">{item.product.name}</td>
                                        <td className="px-6 py-4 text-center font-sans text-gray-600 font-medium">
                                            {item.quantity} {item.product.unit}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {alreadyReturned > 0
                                                ? <span className="text-amber-600 font-bold font-sans">{alreadyReturned}</span>
                                                : <span className="text-gray-300 font-sans">—</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {maxReturnable <= 0 ? (
                                                <span className="text-xs text-gray-400 font-bold">مستورجع بالكامل</span>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleQtyChange(item.id, currentReturnQty - 1, maxReturnable)}
                                                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-rose-100 text-gray-600 hover:text-rose-600 font-black transition-colors flex items-center justify-center"
                                                    >−</button>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={maxReturnable}
                                                        value={currentReturnQty}
                                                        onChange={e => handleQtyChange(item.id, parseInt(e.target.value) || 0, maxReturnable)}
                                                        className="w-16 text-center border border-gray-200 rounded-lg py-1 font-black font-sans text-gray-900 focus:ring-2 focus:ring-rose-400 outline-none"
                                                    />
                                                    <button
                                                        onClick={() => handleQtyChange(item.id, currentReturnQty + 1, maxReturnable)}
                                                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-rose-100 text-gray-600 hover:text-rose-600 font-black transition-colors flex items-center justify-center"
                                                    >+</button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-sans font-bold text-left text-rose-600">
                                            {currentReturnQty > 0 ? `${(currentReturnQty * item.unitPrice).toLocaleString()} دج` : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Notes + Summary */}
                <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <div>
                        <label className="block text-sm font-black text-gray-700 mb-2">سبب الاسترجاع (اختياري)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            placeholder="مثال: منتج تالف، خطأ في الطلبية..."
                            className="w-full border border-gray-200 rounded-2xl p-4 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-rose-400 outline-none resize-none"
                        />
                    </div>

                    {/* Warning */}
                    {selectedItems.length > 0 && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                            <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-amber-700 text-sm font-bold">
                                سيتم {isSale ? 'إعادة المنتجات إلى المخزون' : 'خصم المنتجات من المخزون'} فوراً بعد التأكيد. هذه العملية لا يمكن التراجع عنها.
                            </p>
                        </div>
                    )}

                    {/* Total & Submit */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div>
                            <p className="text-xs text-gray-400 font-bold">إجمالي المبلغ المرتجع</p>
                            <p className="text-2xl font-black text-rose-600 font-sans">{returnTotal.toLocaleString()} دج</p>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={saving || selectedItems.length === 0}
                            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg shadow-rose-200"
                        >
                            <RotateCcw size={18} className={saving ? 'animate-spin' : ''} />
                            {saving ? 'جاري المعالجة...' : 'تأكيد الاسترجاع'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
