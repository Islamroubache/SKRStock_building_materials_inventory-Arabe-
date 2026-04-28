import React from 'react';
import Link from 'next/link';
import { 
    Eye, CreditCard, History, ShoppingBag, Banknote, 
    AlertCircle, Clock, RotateCcw 
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface InvoicesTableProps {
    invoices: any[];
    loading: boolean;
    invoiceType: 'SALE' | 'PURCHASE';
    setSelectedInvoice: (inv: any) => void;
    setShowPaymentModal: (inv: any) => void;
    setPaymentAmount: (amount: number) => void;
    handleRefundExcess: (inv: any) => void;
    setShowHistoryModal: (inv: any) => void;
    fetchPaymentHistory: (id: number) => void;
    setShowReturnsModal: (inv: any) => void;
    fetchReturnsHistory: (orderNumber: string) => void;
    hideParty?: boolean;
}

export const StatusBadge = ({ status, remaining, total, originalTotal, dueDate }: { status: string, remaining: number, total: number, originalTotal: number, dueDate?: string }) => {
    const overdue = isOverdue(dueDate) && remaining > 0;

    // 1. خالص بالكامل (Paid): Balance = 0
    if (remaining === 0) {
        return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">خالص بالكامل</span>;
    }
    
    // 2. رصيد زائد (Credit): Balance < 0
    if (remaining < 0) {
        return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">رصيد زائد</span>;
    }
    
    // 3. مدفوع جزئي (Partial): Balance > 0 and < Original Total
    if (remaining > 0 && remaining < originalTotal) {
        const percent = Math.round(((originalTotal - remaining) / originalTotal) * 100);
        return (
            <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">مدفوع جزئي ({percent}%)</span>
                    {overdue && <span className="bg-red-500 text-white p-1 rounded-full animate-pulse" title="متأخرة"><Clock size={10} /></span>}
                </div>
                <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${percent}%` }}></div>
                </div>
            </div>
        );
    }
    
    // 4. غير مدفوع (Unpaid): Balance = Original Total (or > 0 and not partial/paid)
    return (
        <div className="flex items-center gap-2">
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">غير مدفوع</span>
            {overdue && <span className="bg-red-600 text-white p-1 rounded-full animate-bounce" title="متأخرة"><AlertCircle size={10} /></span>}
        </div>
    );
};

const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
};

export const InvoicesTable: React.FC<InvoicesTableProps> = ({
    invoices,
    loading,
    invoiceType,
    setSelectedInvoice,
    setShowPaymentModal,
    setPaymentAmount,
    handleRefundExcess,
    setShowReturnsModal,
    fetchReturnsHistory,
    hideParty = false
}) => {
    return (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">رقم الفاتورة</th>
                            {!hideParty && <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">{invoiceType === 'SALE' ? 'العميل / المشروع' : 'المورد / الشريك'}</th>}
                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">المبلغ الإجمالي</th>
                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">الحالة</th>
                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">أدوات التحكم</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={hideParty ? 4 : 5} className="px-8 py-6"><div className="h-8 bg-gray-100 rounded-lg"></div></td>
                                </tr>
                            ))
                        ) : invoices.length === 0 ? (
                            <tr>
                                <td colSpan={hideParty ? 4 : 5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4 text-gray-300">
                                        <ShoppingBag size={64} />
                                        <p className="text-xl font-black">لا توجد فواتير مطابقة لبحثك</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-blue-50/30 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-black text-gray-900 font-sans tracking-tight">{inv.invoiceNumber}</span>
                                            <span className="text-[10px] font-black text-gray-400 font-sans">{formatDate(inv.date)}</span>
                                        </div>
                                    </td>
                                    {!hideParty && (
                                        <td className="px-8 py-6 text-right" dir="rtl">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3 justify-start">
                                                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 shrink-0">
                                                        <img 
                                                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(inv.customerName)}&backgroundColor=transparent&textColor=1e293b&fontWeight=900&fontSize=40`} 
                                                            alt={inv.customerName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-gray-900 leading-none mb-1">{inv.customerName}</span>
                                                        {inv.projectName && (
                                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">مشروع: {inv.projectName}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1 font-sans">
                                            <span className="font-black text-gray-900">{inv.total.toLocaleString()} دج</span>
                                            {inv.remaining !== 0 && (
                                                <span className={`text-[10px] font-black ${inv.remaining > 0 ? 'text-red-500' : 'text-purple-600'}`}>
                                                    {inv.remaining > 0 ? `متبقي: ${inv.remaining.toLocaleString()} دج` : `رصيد زائد: ${Math.abs(inv.remaining).toLocaleString()} دج`}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <StatusBadge 
                                            status={inv.status} 
                                            remaining={inv.remaining} 
                                            total={inv.total} 
                                            originalTotal={inv.originalTotal} 
                                            dueDate={inv.dueDate} 
                                        />
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex justify-start gap-2">
                                            {/* 1. View Button (Always Active) */}
                                            <button
                                                onClick={() => setSelectedInvoice(inv)}
                                                className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="عرض وطباعة"
                                            >
                                                <Eye size={18} />
                                            </button>

                                            {/* 2. Payment Button */}
                                            {(() => {
                                                const isActive = inv.status !== 'PAID' && inv.status !== 'CREDIT' && inv.total > 0;
                                                return (
                                                    <button
                                                        onClick={() => { if (isActive) { setShowPaymentModal(inv); setPaymentAmount(inv.remaining); } }}
                                                        disabled={!isActive}
                                                        className={`p-2.5 rounded-xl transition-all ${isActive 
                                                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-sm' 
                                                            : 'bg-gray-50/50 text-gray-300 cursor-not-allowed opacity-60'}`}
                                                        title={isActive ? "تسجيل دفع" : ""}
                                                    >
                                                        <CreditCard size={18} />
                                                    </button>
                                                );
                                            })()}

                                            {/* 3. Refund Button */}
                                            {(() => {
                                                const isActive = inv.status === 'CREDIT' || inv.remaining < 0;
                                                return (
                                                    <button
                                                        onClick={() => { if (isActive) handleRefundExcess(inv); }}
                                                        disabled={!isActive}
                                                        className={`p-2.5 rounded-xl transition-all ${isActive 
                                                            ? 'bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white shadow-sm animate-pulse' 
                                                            : 'bg-gray-50/50 text-gray-300 cursor-not-allowed opacity-60'}`}
                                                        title={isActive ? "إرجاع الفائض نقداً" : ""}
                                                    >
                                                        <Banknote size={18} />
                                                    </button>
                                                );
                                            })()}

                                            {/* 4. History Button (Always Active) */}
                                            <button
                                                onClick={() => { setShowHistoryModal(inv); fetchPaymentHistory(inv.id); }}
                                                className="p-2.5 bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="سجل المدفوعات"
                                            >
                                                <History size={18} />
                                            </button>

                                            {/* 5. Return Button */}
                                            {(() => {
                                                const order = inv.order;
                                                const totalQty = order?.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
                                                const totalReturnedQty = order?.items?.reduce((sum: number, item: any) => sum + (item.returnedQuantity || 0), 0) || 0;
                                                const isFullyReturned = totalReturnedQty > 0 && totalReturnedQty === totalQty;
                                                const isReturnOrder = order?.type === 'RETURN_SALE' || order?.type === 'RETURN_PURCHASE';
                                                const isActive = order && order.items && !isFullyReturned && !isReturnOrder && order.status !== 'CANCELLED';

                                                if (isActive) {
                                                    return (
                                                        <Link 
                                                            href={`/orders/${order.id}/return`}
                                                            className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                            title="استرجاع"
                                                        >
                                                            <RotateCcw size={18} />
                                                        </Link>
                                                    );
                                                }
                                                return (
                                                    <div className="p-2.5 bg-gray-50/50 text-gray-300 cursor-not-allowed opacity-60 rounded-xl">
                                                        <RotateCcw size={18} />
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
