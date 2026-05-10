'use client';

import React, { useState, useEffect } from 'react';
import { RotateCcw, CheckCircle, PackageOpen, ShoppingBag, AlertTriangle, Printer, X, ChevronRight, ArrowRight } from 'lucide-react';
import { printDocument } from '@/lib/print-helper';

interface OrderItem {
    id: number;
    quantity: number;
    returnedQuantity: number;
    unitPrice: number;
    total: number;
    product: { name: string; unit: string; quantity: number };
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

interface ReturnModalProps {
    orderId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const ReturnModal: React.FC<ReturnModalProps> = ({ orderId, onClose, onSuccess }) => {
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
    const [success, setSuccess] = useState(false);
    const [returnOrderNumber, setReturnOrderNumber] = useState('');
    const [returnOrderId, setReturnOrderId] = useState<number | null>(null);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/orders/${orderId}`);
                if (res.ok) {
                    const data = await res.json();
                    setOrder(data);
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

    const handleReturnAll = () => {
        if (!order) return;
        const all: Record<number, number> = {};
        order.items.forEach(item => {
            const alreadyReturned = item.returnedQuantity || 0;
            const maxReturnable = order.type === 'PURCHASE'
                ? Math.min(item.quantity - alreadyReturned, item.product.quantity)
                : item.quantity - alreadyReturned;
            all[item.id] = maxReturnable;
        });
        setReturnQtys(all);
    };

    const selectedItems = order?.items.filter(i => (returnQtys[i.id] || 0) > 0) || [];
    const returnTotal = selectedItems.reduce((sum, i) => sum + (returnQtys[i.id] || 0) * i.unitPrice, 0);

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            alert('يجب اختيار كمية مرتجعة واحدة على الأقل');
            return;
        }

        if (order?.type === 'PURCHASE') {
            for (const item of selectedItems) {
                const qty = returnQtys[item.id] || 0;
                if (qty > item.product.quantity) {
                    alert(`❌ الكمية المرتجعة من "${item.product.name}" (${qty}) تتجاوز المخزون المتوفر (${item.product.quantity})`);
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/orders/${orderId}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: selectedItems.map(i => ({
                        orderItemId: i.id,
                        returnQty: returnQtys[i.id]
                    }))
                })
            });
            if (res.ok) {
                const data = await res.json();
                setReturnOrderNumber(data.returnOrder?.orderNumber || 'N/A');
                setReturnOrderId(data.returnOrder?.id || null);
                setSuccess(true);
                onSuccess();
            } else {
                const err = await res.json();
                alert(`❌ خطأ: ${err.error}`);
            }
        } catch (e: any) {
            alert(`حدث خطأ: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4">
            <div className="bg-white p-8 rounded-[2rem] text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
                <p className="mt-4 text-gray-500 font-bold">جاري تحميل البيانات...</p>
            </div>
        </div>
    );

    if (!order) return null;

    const isSale = order.type === 'SALE';
    const partyName = isSale
        ? (order.customer?.name || order.customerName || 'زبون عابر')
        : (order.supplier?.name || order.customerName || 'مورد غير محدد');

    return (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center">
                            <RotateCcw size={22} className="text-rose-600" />
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-black text-gray-900">استرجاع طلبية</h2>
                            <p className="text-xs font-bold text-gray-400 font-sans">{order.orderNumber}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-2 bg-white rounded-xl border border-gray-100"><X size={24} /></button>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle size={40} className="text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">تم الاسترجاع بنجاح</h2>
                            <p className="text-gray-500 font-medium mb-6">تم تسجيل المرتجع وتحديث المخزون بنجاح</p>
                            <div className="bg-gray-50 rounded-2xl p-6 text-right space-y-3 mb-8">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-bold text-sm">رقم الاسترجاع:</span>
                                    <span className="font-black text-rose-600 font-sans text-sm">{returnOrderNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-bold text-sm">المبلغ المرتجع:</span>
                                    <span className="font-black text-gray-900 font-sans">{returnTotal.toLocaleString()} دج</span>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-2xl font-black text-sm transition-all">إغلاق النافذة</button>
                                {returnOrderId && (
                                    <button 
                                        onClick={() => {
                                            window.open(`/orders/${returnOrderId}/print`, '_blank');
                                        }}
                                        className="flex-1 bg-[#5EABD5] hover:bg-[#4d9bc2] text-white py-4 rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <Printer size={18} /> طباعة وصل الاسترجاع
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 grid grid-cols-2 gap-6 text-right">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">الطرف المعني</p>
                                    <p className="font-black text-gray-900">{partyName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">إجمالي الفاتورة</p>
                                    <p className="font-black text-gray-900 font-sans">{order.total.toLocaleString()} دج</p>
                                </div>
                            </div>

                            <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                                <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="font-black text-gray-700 text-sm">تفاصيل السلع المرتجعة</h3>
                                </div>
                                <table className="w-full text-right text-xs">
                                    <thead>
                                        <tr className="bg-gray-50/30 text-gray-400 font-black border-b border-gray-50">
                                            <th className="px-6 py-4">المنتج</th>
                                            <th className="px-6 py-4 text-center">المباع</th>
                                            <th className="px-6 py-4 text-center">المرتجع الآن</th>
                                            <th className="px-6 py-4 text-left">القيمة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {order.items.map(item => {
                                            const alreadyReturned = item.returnedQuantity || 0;
                                            const maxReturnable = order.type === 'PURCHASE' 
                                                ? Math.min(item.quantity - alreadyReturned, item.product.quantity)
                                                : item.quantity - alreadyReturned;
                                            const currentQty = returnQtys[item.id] || 0;

                                            return (
                                                <tr key={item.id} className={currentQty > 0 ? 'bg-rose-50/50' : ''}>
                                                    <td className="px-6 py-4">
                                                        <p className="font-black text-gray-900">{item.product.name}</p>
                                                        {alreadyReturned > 0 && <p className="text-[9px] text-amber-600 font-bold">مرتجع سابقاً: {alreadyReturned}</p>}
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-sans font-bold text-gray-500">{item.quantity}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        {maxReturnable <= 0 ? (
                                                            <span className="text-[10px] text-gray-400 font-bold">مكتمل</span>
                                                        ) : (
                                                            <div className="flex items-center justify-center">
                                                                <input 
                                                                    type="number" value={currentQty} 
                                                                    onChange={e => handleQtyChange(item.id, parseInt(e.target.value) || 0, maxReturnable)}
                                                                    onFocus={e => e.target.select()}
                                                                    className="w-20 text-center border border-gray-200 rounded-md font-sans font-black py-1 focus:ring-2 focus:ring-rose-400 outline-none" 
                                                                />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-left font-sans font-black text-rose-600">
                                                        {currentQty > 0 ? (currentQty * item.unitPrice).toLocaleString() : '---'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="space-y-4">

                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] font-bold text-amber-700 leading-relaxed">سيتم تحديث المخزون وحساب العميل تلقائياً عند التأكيد. يرجى مراجعة الكميات المختارة بدقة.</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">إجمالي الاسترجاع</p>
                                    <p className="text-2xl font-black text-rose-600 font-sans">{returnTotal.toLocaleString()} دج</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={handleReturnAll} 
                                        className="text-xs font-black text-rose-600 bg-rose-50 px-6 py-4 rounded-2xl border border-rose-100 hover:bg-rose-100 transition-colors"
                                    >
                                        استرجاع الكل
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={saving || selectedItems.length === 0}
                                        className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-rose-100 transition-all flex items-center gap-2"
                                    >
                                        <RotateCcw size={18} className={saving ? 'animate-spin' : ''} />
                                        {saving ? 'جاري المعالجة...' : 'تأكيد الاسترجاع'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReturnModal;
