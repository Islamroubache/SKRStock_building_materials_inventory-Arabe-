'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Building2, ChevronRight, Phone, Mail, MapPin, Package, ShoppingCart,
    ArrowDownLeft, ArrowUpRight, CreditCard, X, CheckCircle, AlertTriangle,
    ChevronDown, ChevronUp, RotateCcw, Calendar, DollarSign
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface OrderItem {
    id: number;
    productId: number;
    quantity: number;
    returnedQuantity: number;
    unitPrice: number;
    total: number;
    product: { id: number; name: string; unit: string; quantity: number };
}

interface Order {
    id: number;
    orderNumber: string;
    orderDate: string;
    total: number;
    status: string;
    notes: string | null;
    items: OrderItem[];
}

interface Supplier {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    balanceDue: number;
    products: { id: number; name: string; code: string | null; quantity: number; unit: string; purchasePrice: number }[];
    orders: Order[];
}

export default function SupplierDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

    // Return product modal
    const [returnModal, setReturnModal] = useState<{ item: OrderItem; maxQty: number } | null>(null);
    const [returnQty, setReturnQty] = useState(1);
    const [isReturning, setIsReturning] = useState(false);

    // Pay credit modal
    const [payModal, setPayModal] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [isPaying, setIsPaying] = useState(false);

    const fetchSupplier = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/suppliers/${id}`);
            if (res.ok) setSupplier(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (id) fetchSupplier(); }, [id]);

    const handleReturn = async () => {
        if (!returnModal) return;
        setIsReturning(true);
        try {
            const res = await fetch(`/api/suppliers/${id}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderItemId: returnModal.item.id, quantity: returnQty })
            });
            const data = await res.json();
            if (res.ok) {
                setReturnModal(null);
                fetchSupplier();
                alert(`✅ تم الإرجاع بنجاح. تم تخفيض رصيد المورد بـ ${data.returnValue?.toLocaleString()} دج`);
            } else {
                alert(`❌ ${data.error}`);
            }
        } catch { alert('خطأ في الاتصال'); }
        finally { setIsReturning(false); }
    };

    const handlePay = async () => {
        const amount = parseFloat(payAmount);
        if (!amount || amount <= 0) return;
        setIsPaying(true);
        try {
            const res = await fetch(`/api/suppliers/${id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });
            const data = await res.json();
            if (res.ok) {
                setPayModal(false);
                setPayAmount('');
                fetchSupplier();
                alert(`✅ تم تسجيل الدفع. الرصيد الجديد: ${data.newBalance?.toLocaleString()} دج`);
            } else {
                alert(`❌ ${data.error}`);
            }
        } catch { alert('خطأ في الاتصال'); }
        finally { setIsPaying(false); }
    };

    if (loading) return (
        <div className="flex-1 flex justify-center items-center h-screen bg-gray-50" dir="rtl">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!supplier) return (
        <div className="p-8 text-center text-red-500 font-black" dir="rtl">لم يتم العثور على المورد</div>
    );

    const totalOrders = supplier.orders.length;
    const totalPurchased = supplier.orders.reduce((s, o) => s + o.total, 0);

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 flex flex-col gap-8" dir="rtl">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                <Link href="/suppliers" className="hover:text-indigo-600 transition-colors">الموردون</Link>
                <ChevronRight size={14} className="rotate-180" />
                <span className="text-gray-900">{supplier.name}</span>
            </div>

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-200">
                        {supplier.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">{supplier.name}</h1>
                        <p className="text-gray-400 font-bold text-sm mt-1">مورد نشط</p>
                    </div>
                </div>

                {supplier.balanceDue > 0 && (
                    <button
                        onClick={() => { setPayModal(true); setPayAmount(supplier.balanceDue.toString()); }}
                        className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                    >
                        <CreditCard size={20} /> تسوية الرصيد المستحق
                    </button>
                )}
            </div>

            {/* Info + Stats Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Left: Supplier Info */}
                <div className="flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">معلومات المورد</h3>
                        <div className="space-y-3">
                            {supplier.phone && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <Phone size={16} className="text-gray-400" />
                                    <span className="font-bold font-sans text-gray-900" dir="ltr">{supplier.phone}</span>
                                </div>
                            )}
                            {supplier.email && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <Mail size={16} className="text-gray-400" />
                                    <span className="font-bold text-gray-900 font-sans" dir="ltr">{supplier.email}</span>
                                </div>
                            )}
                            {supplier.address && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span className="font-bold text-gray-700">{supplier.address}</span>
                                </div>
                            )}
                            {!supplier.phone && !supplier.email && !supplier.address && (
                                <p className="text-gray-400 text-sm font-bold text-center py-4">لا توجد معلومات تواصل</p>
                            )}
                        </div>
                    </div>

                    {/* Products */}
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Package size={14} /> المنتجات الموردة ({supplier.products.length})
                        </h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {supplier.products.length === 0 ? (
                                <p className="text-gray-400 text-sm font-bold text-center py-4">لا توجد منتجات</p>
                            ) : supplier.products.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-indigo-50 transition-colors">
                                    <div>
                                        <p className="font-black text-gray-900 text-sm">{p.name}</p>
                                        <p className="text-xs text-gray-400 font-bold">{p.purchasePrice.toLocaleString()} دج</p>
                                    </div>
                                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${p.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                        {p.quantity} {p.unit}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Stats + Balance */}
                <div className="xl:col-span-2 flex flex-col gap-6">
                    {/* KPI Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-2">
                            <div className="bg-indigo-50 p-3 rounded-2xl w-fit text-indigo-600"><ShoppingCart size={20} /></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase">إجمالي الطلبيات</span>
                            <span className="text-2xl font-black font-sans text-gray-900">{totalOrders}</span>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-2">
                            <div className="bg-green-50 p-3 rounded-2xl w-fit text-green-600"><ArrowDownLeft size={20} /></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase">إجمالي المشتريات</span>
                            <span className="text-2xl font-black font-sans text-gray-900">{totalPurchased.toLocaleString()} <span className="text-sm">دج</span></span>
                        </div>
                        <div className={`p-6 rounded-[2rem] border shadow-sm flex flex-col gap-2 ${supplier.balanceDue > 0 ? 'bg-red-600 border-red-600 shadow-red-200' : 'bg-white border-gray-100'}`}>
                            <div className={`p-3 rounded-2xl w-fit ${supplier.balanceDue > 0 ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                <DollarSign size={20} />
                            </div>
                            <span className={`text-[10px] font-black uppercase ${supplier.balanceDue > 0 ? 'text-white/70' : 'text-gray-400'}`}>الرصيد المستحق له</span>
                            <span className={`text-2xl font-black font-sans ${supplier.balanceDue > 0 ? 'text-white' : 'text-gray-900'}`}>
                                {supplier.balanceDue.toLocaleString()} <span className="text-sm">دج</span>
                            </span>
                            {supplier.balanceDue > 0 && (
                                <button
                                    onClick={() => { setPayModal(true); setPayAmount(supplier.balanceDue.toString()); }}
                                    className="mt-2 bg-white text-red-600 text-xs font-black px-3 py-2 rounded-xl hover:bg-red-50 transition-all w-fit"
                                >
                                    دفع الآن
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Orders List */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <ShoppingCart size={18} className="text-indigo-600" /> سجل الطلبيات من هذا المورد
                            </h3>
                        </div>

                        {supplier.orders.length === 0 ? (
                            <div className="py-16 text-center text-gray-300 flex flex-col items-center gap-3">
                                <ShoppingCart size={48} />
                                <p className="font-black">لا توجد طلبيات شراء من هذا المورد</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {supplier.orders.map(order => (
                                    <div key={order.id}>
                                        {/* Order Row */}
                                        <div
                                            className="flex items-center justify-between p-5 hover:bg-gray-50/80 cursor-pointer group transition-colors"
                                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-xl transition-colors ${expandedOrder === order.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                                                    {expandedOrder === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 font-sans tracking-tight">{order.orderNumber}</p>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                                        <Calendar size={11} />
                                                        {formatDate(order.orderDate)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-black text-gray-900 font-sans">{order.total.toLocaleString()} دج</span>
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${order.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {order.status === 'DONE' ? 'مكتمل' : 'معلق'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Expanded Order Items */}
                                        {expandedOrder === order.id && (
                                            <div className="bg-indigo-50/30 border-t border-indigo-50 px-5 pb-5 pt-4 animate-in slide-in-from-top-2 duration-200">
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">منتجات هذه الطلبية:</p>
                                                <div className="flex flex-col gap-2">
                                                    {order.items.map(item => {
                                                        const maxReturnable = Math.min(item.quantity - item.returnedQuantity, item.product.quantity);
                                                        return (
                                                            <div key={item.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="font-black text-gray-900">{item.product.name}</span>
                                                                    <span className="text-xs font-bold text-gray-400">
                                                                        الكمية المشتراة: {item.quantity} {item.product.unit} × {item.unitPrice.toLocaleString()} دج
                                                                        <span className="mr-2 text-gray-300">|</span>
                                                                        في المخزون: <span className={`font-black ${item.product.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>{item.product.quantity}</span>
                                                                        {item.returnedQuantity > 0 && (
                                                                            <>
                                                                                <span className="mr-2 text-gray-300">|</span>
                                                                                <span className="text-amber-600 font-black">تم إرجاع: {item.returnedQuantity}</span>
                                                                            </>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-black text-indigo-600 font-sans">{item.total.toLocaleString()} دج</span>
                                                                    {maxReturnable > 0 ? (
                                                                        <button
                                                                            onClick={() => { setReturnModal({ item, maxQty: maxReturnable }); setReturnQty(1); }}
                                                                            className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 hover:bg-amber-100 transition-all"
                                                                        >
                                                                            <RotateCcw size={12} /> إرجاع
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-[10px] font-black bg-gray-100 text-gray-400 px-2 py-1 rounded-xl">لا يمكن استرجاع المزيد</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RETURN MODAL */}
            {returnModal && (
                <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-amber-50/50">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    <RotateCcw className="text-amber-600" size={20} /> إرجاع بضاعة للمورد
                                </h2>
                                <p className="text-xs font-bold text-gray-500 mt-1">{returnModal.item.product.name}</p>
                            </div>
                            <button onClick={() => setReturnModal(null)} className="text-gray-400 hover:text-gray-900 p-2"><X size={20} /></button>
                        </div>

                        <div className="p-6 flex flex-col gap-6">
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-amber-800 uppercase mb-1">الحد الأقصى للإرجاع</p>
                                    <p className="text-xl font-black text-amber-900 font-sans">{returnModal.maxQty} {returnModal.item.product.unit}</p>
                                    <p className="text-[10px] font-bold text-amber-600 mt-1">أقل قيمة: المخزون الحالي أو كمية الطلبية</p>
                                </div>
                                <ArrowUpRight size={28} className="text-amber-400" />
                            </div>

                            <div>
                                <label className="block text-sm font-black text-gray-700 mb-2">الكمية المُرجَعة</label>
                                <input
                                    type="number"
                                    min={1} max={returnModal.maxQty}
                                    value={returnQty}
                                    onChange={e => setReturnQty(Math.min(returnModal.maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-black font-sans text-2xl text-center focus:ring-4 focus:ring-amber-100 outline-none"
                                />
                                <div className="flex gap-2 mt-3 justify-center">
                                    <button onClick={() => setReturnQty(returnModal.maxQty)} className="text-[10px] font-black bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200">تحديد الكل ({returnModal.maxQty})</button>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl text-sm font-bold flex justify-between">
                                <span className="text-gray-500">قيمة الإرجاع:</span>
                                <span className="text-green-600 font-black">{(returnQty * returnModal.item.unitPrice).toLocaleString()} دج</span>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs font-bold text-blue-800">
                                ℹ️ سيتم تلقائياً: سحب الكمية من المخزون + تخفيض رصيد المورد المستحق
                            </div>

                            <button
                                onClick={handleReturn}
                                disabled={isReturning || returnQty <= 0}
                                className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white h-14 rounded-2xl font-black text-lg transition-all shadow-xl shadow-amber-200 flex items-center justify-center gap-2"
                            >
                                {isReturning ? 'جاري التنفيذ...' : <><CheckCircle size={20} /> تأكيد الإرجاع</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PAY MODAL */}
            {payModal && (
                <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-green-50/50">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    <CreditCard className="text-green-600" size={20} /> تسوية رصيد المورد
                                </h2>
                                <p className="text-xs font-bold text-gray-500 mt-1">المستحق الإجمالي: {supplier.balanceDue.toLocaleString()} دج</p>
                            </div>
                            <button onClick={() => setPayModal(false)} className="text-gray-400 hover:text-gray-900 p-2"><X size={20} /></button>
                        </div>

                        <div className="p-6 flex flex-col gap-6">
                            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-green-800 uppercase mb-1">الرصيد المستحق للمورد</p>
                                    <p className="text-2xl font-black text-green-900 font-sans">{supplier.balanceDue.toLocaleString()} دج</p>
                                </div>
                                <ArrowUpRight size={28} className="text-green-400" />
                            </div>

                            <div>
                                <label className="block text-sm font-black text-gray-700 mb-2">المبلغ الذي ستدفعه (دج)</label>
                                <input
                                    type="number"
                                    min={1} max={supplier.balanceDue}
                                    value={payAmount}
                                    onChange={e => setPayAmount(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-black font-sans text-2xl text-center focus:ring-4 focus:ring-green-100 outline-none"
                                    placeholder="0"
                                />
                                <div className="flex gap-2 mt-3 justify-center">
                                    <button onClick={() => setPayAmount((supplier.balanceDue / 2).toString())} className="text-[10px] font-black bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200">نصف المبلغ</button>
                                    <button onClick={() => setPayAmount(supplier.balanceDue.toString())} className="text-[10px] font-black bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200">دفع الكل</button>
                                </div>
                            </div>

                            {parseFloat(payAmount) > 0 && (
                                <div className="bg-gray-50 p-4 rounded-xl text-sm font-bold flex justify-between">
                                    <span className="text-gray-500">الرصيد بعد الدفع:</span>
                                    <span className={`font-black ${(supplier.balanceDue - parseFloat(payAmount)) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {(supplier.balanceDue - parseFloat(payAmount)).toLocaleString()} دج
                                    </span>
                                </div>
                            )}

                            {parseFloat(payAmount) > supplier.balanceDue && (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-red-700">
                                    <AlertTriangle size={14} /> المبلغ أكبر من الرصيد المستحق
                                </div>
                            )}

                            <button
                                onClick={handlePay}
                                disabled={isPaying || !parseFloat(payAmount) || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > supplier.balanceDue}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white h-14 rounded-2xl font-black text-lg transition-all shadow-xl shadow-green-200 flex items-center justify-center gap-2"
                            >
                                {isPaying ? 'جاري التنفيذ...' : <><CheckCircle size={20} /> تأكيد الدفع</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
