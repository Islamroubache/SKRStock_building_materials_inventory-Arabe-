'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { FileText, Receipt, ArrowLeft, Printer } from 'lucide-react';

export default function OrderPrintPage() {
    const { id } = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [printMode, setPrintMode] = useState<'A4' | 'THERMAL'>('A4');

    useEffect(() => {
        if (!id) return;
        const fetchOrder = async () => {
            try {
                // Fetch the order. We probably don't have an endpoint for single order, but wait, do we? Let's check `api/orders/[id]`.
                const res = await fetch(`/api/orders/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setOrder(data);
                } else {
                    alert('تعذر جلب بيانات الطلبية');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    // Derived values
    const effectiveItems = useMemo(() => {
        if (!order?.items) return [];
        return order.items.filter((i: any) => (i.quantity - i.returnedQuantity) > 0);
    }, [order]);

    if (loading) return <div className="p-20 text-center font-black text-gray-400">جاري تجهيز بيانات الطباعة...</div>;
    if (!order) return <div className="p-20 text-center font-black text-rose-500">حدث خطأ. بيانات الطلبية غير متوفرة.</div>;

    const { customer, project, invoice } = order;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center">
            {/* Control Bar (No Print) */}
            <div className="w-full bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm print:hidden sticky top-0 z-50">
                <div className="flex gap-4 items-center">
                    <button 
                        onClick={() => window.close()} 
                        className="p-3 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-black text-gray-900 text-lg">معاينة المستندات ({order.orderNumber})</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">تتضمن المرتجعات إن وجدت</p>
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setPrintMode('A4')} 
                        className={`px-6 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${printMode === 'A4' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <FileText size={14} /> فاتورة قياسية (A4)
                    </button>
                    <button 
                        onClick={() => setPrintMode('THERMAL')} 
                        className={`px-6 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${printMode === 'THERMAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Receipt size={14} /> وصل حراري (80mm)
                    </button>
                </div>

                <button 
                    onClick={() => window.print()} 
                    className="bg-gray-900 text-white px-8 py-3 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-gray-200"
                >
                    <Printer size={16} /> ابدأ الطباعة
                </button>
            </div>

            {/* Print Container */}
            <div className={`mt-8 mb-20 ${printMode === 'A4' ? 'w-[210mm] min-h-[297mm] p-[20mm]' : 'w-[80mm] p-[5mm]'} bg-white shadow-xl print:shadow-none print:m-0 print:p-0 border border-gray-200`}>
                
                {printMode === 'A4' ? (
                    // ================= A4 INVOICE TEMPLATE =================
                    <div className="flex flex-col gap-6 h-full print:bg-white text-gray-900" dir="rtl">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6">
                            <div>
                                <h1 className="text-4xl font-black mb-1">Makhzoun</h1>
                                <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">نظام إدارة المخزون المتقدم</p>
                            </div>
                            <div className="text-left bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <h2 className="text-3xl font-black uppercase tracking-widest text-gray-900 mb-2">فاتورة</h2>
                                <p className="text-sm font-bold text-gray-600"><span className="text-gray-400 pl-2">رقم الفاتورة:</span> {invoice?.invoiceNumber || order.orderNumber}</p>
                                <p className="text-sm font-bold text-gray-600"><span className="text-gray-400 pl-2">تاريخ الإصدار:</span> {formatDate(order.orderDate)}</p>
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div className="grid grid-cols-2 gap-8 my-4">
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-3">بيانات العميل المستحق المفوتر</p>
                                <h3 className="font-black text-xl mb-1">{customer?.name || order.guestName || 'عميل عابر'}</h3>
                                {customer?.type === 'LOYAL' ? (
                                    <>
                                        <p className="text-sm font-bold text-gray-500">عميل مقاول معتمد</p>
                                        {project && <p className="text-xs font-black text-blue-600 border border-blue-100 bg-blue-50 px-2 py-1 rounded inline-block mt-2">المشروع: {project.name}</p>}
                                    </>
                                ) : (
                                    <p className="text-sm font-bold text-gray-500">عميل عابر</p>
                                )}
                            </div>
                            <div className="flex flex-col justify-end text-left">
                                <p className="text-xs font-bold text-gray-500">العنوان المستلم</p>
                                <p className="font-black text-sm text-gray-900">{customer?.address || 'غير محدد'}</p>
                                <p className="text-xs font-bold text-gray-500 mt-2">رقم الهاتف</p>
                                <p className="font-black font-sans text-sm text-gray-900" dir="ltr">{customer?.phone || order.guestPhone || 'غير محدد'}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="flex-1 my-4 min-h-[300px]">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-gray-900">
                                        <th className="py-4 text-xs tracking-widest font-black text-gray-400">البيان (المنتج)</th>
                                        <th className="py-4 text-xs tracking-widest font-black text-gray-400">سعر الوحدة</th>
                                        <th className="py-4 text-xs tracking-widest font-black text-gray-400">الكمية الصافية</th>
                                        <th className="py-4 text-xs tracking-widest font-black text-gray-400 text-left">المجموع الصافي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {effectiveItems.map((item: any, idx: number) => {
                                        const cleanQty = item.quantity - item.returnedQuantity;
                                        return (
                                        <tr key={idx} className="border-b border-gray-100">
                                            <td className="py-4 font-black text-sm">{item.product?.name || 'منتج غير معروف'}</td>
                                            <td className="py-4 font-black font-sans text-gray-600 text-sm">{item.unitPrice.toLocaleString()} دج</td>
                                            <td className="py-4 font-black font-sans text-sm">{cleanQty} <span className="text-gray-400 text-[10px]">{item.product?.unit}</span></td>
                                            <td className="py-4 text-left font-black font-sans text-lg">{item.total.toLocaleString()} دج</td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end mt-auto pt-6">
                            <div className="w-1/2 bg-gray-50 p-6 rounded-3xl border border-gray-100 print:bg-transparent print:border-2 print:border-gray-900">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-black text-gray-500 text-sm">المجموع الإجمالي</span>
                                    <span className="font-black font-sans text-xl text-gray-900">{order.total.toLocaleString()} دج</span>
                                </div>
                                {invoice && (
                                    <>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="font-black text-gray-500 text-sm">المدفوع سلفاً</span>
                                            <span className="font-black font-sans text-green-600">{invoice.paid.toLocaleString()} دج</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                            <span className="font-black text-gray-900">المتبقي الصافي</span>
                                            <span className="font-black font-sans text-2xl text-rose-600">{invoice.remaining.toLocaleString()} دج</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="mt-8 text-center text-[10px] font-bold text-gray-400 pt-6 border-t border-gray-100 flex flex-col gap-2">
                            <p>هذه الفاتورة مستخرجة آلياً من نظام إدارة المبيعات، مبنية على أرقام الشراء الصافية ومخصومة منها أية مرتجعات سابقة.</p>
                            <p className="font-sans">مخزون &copy; {new Date().getFullYear()}</p>
                        </div>
                    </div>

                ) : (
                    // ================= THERMAL BON TEMPLATE =================
                    <div className="flex flex-col text-[11px] text-gray-900 print:text-black font-sans" dir="rtl">
                        <div className="text-center pb-3 border-b-2 border-dashed border-gray-300 mb-3">
                            <h1 className="text-xl font-black mb-1">Makhzoun</h1>
                            <p className="text-[9px] font-bold text-gray-600 leading-tight">وصل طلبية محدث</p>
                        </div>
                        
                        <div className="mb-3 space-y-1">
                            <p className="font-black"><span className="text-gray-500">تاريخ:</span> {formatDate(order.orderDate)}</p>
                            <p className="font-black line-clamp-1"><span className="text-gray-500">العميل:</span> {customer?.name || order.guestName || 'عابر'}</p>
                            {project && <p className="font-black line-clamp-1"><span className="text-gray-500">م:</span> {project.name}</p>}
                        </div>

                        <div className="border-b border-t border-gray-300 py-2 mb-3 space-y-2">
                            {effectiveItems.map((item: any, idx: number) => {
                                const cleanQty = item.quantity - item.returnedQuantity;
                                return (
                                <div key={idx} className="flex flex-col">
                                    <span className="font-black text-[11px] leading-tight break-words">{item.product?.name || 'قيد الاسترجاع كامل'}</span>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-[10px] text-gray-600" dir="ltr">{cleanQty} x {item.unitPrice.toLocaleString()}</span>
                                        <span className="font-black text-[11px]">{item.total.toLocaleString()} دج</span>
                                    </div>
                                </div>
                            )})}
                        </div>

                        <div className="space-y-1 mb-6 text-[11px]">
                            <div className="flex justify-between font-black text-[12px] bg-gray-50 py-1 px-1 rounded-sm">
                                <span>الإجمالي</span>
                                <span>{order.total.toLocaleString()} دج</span>
                            </div>
                            {invoice && (
                                <>
                                    <div className="flex justify-between text-gray-600 px-1">
                                        <span>المدفوع</span>
                                        <span>{invoice.paid.toLocaleString()} دج</span>
                                    </div>
                                    <div className="flex justify-between font-black pt-1 px-1 border-t border-gray-300">
                                        <span>المتبقي</span>
                                        <span>{invoice.remaining.toLocaleString()} دج</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="text-center text-[9px] text-gray-500 font-bold leading-tight">
                            <p>تم استخراج الوصل آلياً</p>
                            <p>يرجى الاحتفاظ بالوصل كمرجع قانوني</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
