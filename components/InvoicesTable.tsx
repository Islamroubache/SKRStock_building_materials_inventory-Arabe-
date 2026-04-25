import React from 'react';
import { 
    Eye, CreditCard, History, ShoppingBag, Banknote, 
    AlertCircle, Clock 
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
}

export const StatusBadge = ({ status, remaining, total }: { status: string, remaining: number, total: number }) => {
    if (status === 'CREDIT') return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">رصيد زائد للعميل</span>;
    if (status === 'PAID' || total === 0) return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">خالص بالكامل</span>;
    if (status === 'PARTIAL') {
        const percent = Math.round(((total - remaining) / total) * 100);
        return (
            <div className="flex flex-col items-end gap-1">
                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">دفع جزئي ({percent}%)</span>
                <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${percent}%` }}></div>
                </div>
            </div>
        );
    }
    return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">غير مدفوع</span>;
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
    setShowHistoryModal,
    fetchPaymentHistory,
    setShowReturnsModal,
    fetchReturnsHistory
}) => {
    return (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">رقم الفاتورة</th>
                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">{invoiceType === 'SALE' ? 'العميل / المشروع' : 'المورد / الشريك'}</th>
                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">المبلغ الإجمالي</th>
                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-center">الحالة</th>
                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-left">أدوات التحكم</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-8 py-6"><div className="h-8 bg-gray-100 rounded-lg"></div></td>
                                </tr>
                            ))
                        ) : invoices.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
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
                                                {isOverdue(inv.dueDate) && inv.status !== 'PAID' && (
                                                    <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded leading-none flex items-center gap-1">
                                                        <AlertCircle size={8} /> متجاوزة
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-gray-400">{inv.projectName || '---'}</span>
                                        </div>
                                    </td>
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
                                    <td className="px-8 py-6 text-center">
                                        <StatusBadge status={inv.status} remaining={inv.remaining} total={inv.total} />
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex justify-start gap-2">
                                            <button
                                                onClick={() => setSelectedInvoice(inv)}
                                                className="p-2.5 bg-gray-50 text-gray-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="عرض وطباعة"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {inv.status !== 'PAID' && inv.status !== 'CREDIT' && inv.total > 0 && (
                                                <button
                                                    onClick={() => { setShowPaymentModal(inv); setPaymentAmount(inv.remaining); }}
                                                    className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                    title="تسجيل دفع"
                                                >
                                                    <CreditCard size={18} />
                                                </button>
                                            )}
                                            {(inv.status === 'CREDIT' || inv.remaining < 0) && (
                                                <button
                                                    onClick={() => handleRefundExcess(inv)}
                                                    className="p-2.5 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white rounded-xl transition-all shadow-sm animate-pulse"
                                                    title="إرجاع الفائض نقداً"
                                                >
                                                    <Banknote size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => { setShowHistoryModal(inv); fetchPaymentHistory(inv.id); }}
                                                className="p-2.5 bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="سجل المدفوعات"
                                            >
                                                <History size={18} />
                                            </button>
                                            <button
                                                onClick={() => { setShowReturnsModal({ ...inv, returns: [] }); fetchReturnsHistory(inv.order?.orderNumber || inv.orderNumber); }}
                                                className="p-2.5 bg-gray-50 text-gray-400 hover:bg-orange-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="سجل المرتجعات"
                                            >
                                                <ShoppingBag size={18} />
                                            </button>
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
