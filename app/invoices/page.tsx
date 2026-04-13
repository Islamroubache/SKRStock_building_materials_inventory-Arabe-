'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, FileText, Printer, Eye, Download, Filter,
    CheckCircle, Clock, AlertCircle, ShoppingBag, X,
    Store, CreditCard, History, ChevronLeft, Calendar,
    User, ArrowUpRight, ArrowDownLeft, MoreVertical
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { numberToArabicWords } from '@/lib/number-to-arabic-words';
import { formatDate } from '@/lib/utils';

// --- Types ---
interface Payment {
    id: number;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    notes?: string;
}

interface Invoice {
    id: number;
    invoiceNumber: string;
    orderNumber: string;
    date: string;
    customerId?: number;
    customerName: string;
    customerPhone?: string;
    projectName?: string;
    total: number;
    paid: number;
    remaining: number;
    status: 'PAID' | 'PARTIAL' | 'UNPAID';
    dueDate?: string;
    order: any;
    payments?: Payment[];
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [dashboardStats, setDashboardStats] = useState<any>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE'>('ALL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Modals
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState<Invoice | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState<Invoice | null>(null);

    // Payment Form
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/orders?type=SALE');
            if (res.ok) {
                const data = await res.json();
                const invs = data.map((o: any) => ({
                    ...o.invoice,
                    order: o,
                    customerName: o.customer?.name || o.customerName || 'عميل عابر',
                    projectName: o.project?.name,
                    total: o.invoice?.total || o.total,
                    paid: o.invoice?.paid || 0,
                    remaining: o.invoice?.remaining || o.total,
                    status: o.invoice?.status || 'UNPAID'
                })).filter((inv: any) => inv.id); // Only objects that have an actual invoice record
                setInvoices(invs);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
        fetch('/api/dashboard/stats').then(res => res.json()).then(data => setDashboardStats(data)).catch(console.error);
    }, []);

    // --- Calculations for KPIs ---
    const stats = useMemo(() => {
        const totalOpenDebt = invoices.reduce((sum, inv) => sum + inv.remaining, 0);
        const unpaidCount = invoices.filter(inv => inv.status === 'UNPAID').length;
        const partialCount = invoices.filter(inv => inv.status === 'PARTIAL').length;

        // Collections this month
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        // This would ideally come from a separate payments API, but for now we'll estimate or just show debt

        return { totalOpenDebt, unpaidCount, partialCount };
    }, [invoices]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const isOverdueItem = inv.dueDate ? new Date(inv.dueDate) < new Date() && new Date(inv.dueDate).toDateString() !== new Date().toDateString() : false;
            
            const matchesStatus = statusFilter === 'ALL' || 
                (statusFilter === 'OVERDUE' ? (isOverdueItem && inv.status !== 'PAID') : inv.status === statusFilter);

            let matchesDate = true;
            if (dateRange.start && dateRange.end) {
                const invDate = new Date(inv.date);
                matchesDate = invDate >= new Date(dateRange.start) && invDate <= new Date(dateRange.end);
            }

            return matchesSearch && matchesStatus && matchesDate;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices, searchTerm, statusFilter, dateRange]);

    const handleRecordPayment = async () => {
        if (!showPaymentModal || paymentAmount <= 0) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: showPaymentModal.id,
                    customerId: showPaymentModal.order.customerId || 0,
                    amount: paymentAmount,
                    paymentMethod,
                    notes: paymentNotes
                })
            });

            if (res.ok) {
                await fetchInvoices();
                setShowPaymentModal(null);
                setPaymentAmount(0);
                setPaymentNotes('');
            } else {
                const err = await res.json();
                alert(err.error || 'فشل تسجيل الدفع');
            }
        } catch (e) {
            alert('خطأ في الاتصال بالخادم');
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchPaymentHistory = async (invoiceId: number) => {
        try {
            const res = await fetch(`/api/invoices/${invoiceId}/payments`);
            if (res.ok) {
                const data = await res.json();
                if (showHistoryModal) {
                    setShowHistoryModal({ ...showHistoryModal, payments: data });
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const StatusBadge = ({ status, remaining, total }: { status: string, remaining: number, total: number }) => {
        if (status === 'PAID') return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">خالص بالكامل</span>;
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

    const exportToExcel = () => {
        const data = filteredInvoices.map(inv => ({
            'رقم الفاتورة': inv.invoiceNumber,
            'العميل': inv.customerName,
            'المشروع': inv.projectName || '---',
            'التاريخ': formatDate(inv.date),
            'الإجمالي': inv.total,
            'المدفوع': inv.paid,
            'المتبقي': inv.remaining,
            'الحالة': inv.status === 'PAID' ? 'خالص' : inv.status === 'PARTIAL' ? 'جزئي' : 'غير مدفوع',
            'تاريخ الاستحقاق': formatDate(inv.dueDate)
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Invoices");
        XLSX.writeFile(wb, `fatures_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 flex flex-col gap-8" dir="rtl">

            {/* Header & Search */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
                            <FileText size={28} />
                        </div>
                        إدارة الديون والفواتير
                    </h1>
                    <p className="text-gray-500 font-bold mt-2 mr-12">تتبع التحصيلات، الفواتير غير المدفوعة، وحالة ائتمان المقاولين</p>
                </div>

                <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="بحث برقم الفاتورة، اسم العميل..."
                            className="w-full bg-white border border-gray-200 rounded-2xl pr-12 pl-4 py-4 font-bold shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={exportToExcel}
                        className="bg-white border border-gray-200 text-gray-700 px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <Download size={20} /> تصدير Excel
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute -top-6 -left-6 w-24 h-24 bg-red-500/5 rounded-full"></div>
                    <div className="flex justify-between items-start">
                        <div className="bg-red-50 p-3 rounded-2xl text-red-600"><ArrowUpRight size={24} /></div>
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase">إجمالي الديون</span>
                    </div>
                    <div>
                        <p className="text-2xl font-black font-sans">{stats.totalOpenDebt.toLocaleString()} دج</p>
                        <p className="text-xs font-bold text-gray-400 mt-1">مبالغ لم يتم تحصيلها بعد</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute -top-6 -left-6 w-24 h-24 bg-amber-500/5 rounded-full"></div>
                    <div className="flex justify-between items-start">
                        <div className="bg-amber-50 p-3 rounded-2xl text-amber-600"><Clock size={24} /></div>
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase">فواتير مفتوحة</span>
                    </div>
                    <div>
                        <p className="text-2xl font-black font-sans">{stats.unpaidCount + stats.partialCount}</p>
                        <p className="text-xs font-bold text-gray-400 mt-1">{stats.unpaidCount} غير مدفوعة | {stats.partialCount} جزئية</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute -top-6 -left-6 w-24 h-24 bg-green-500/5 rounded-full"></div>
                    <div className="flex justify-between items-start">
                        <div className="bg-green-50 p-3 rounded-2xl text-green-600"><CheckCircle size={24} /></div>
                        <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase">تحصيلات اليوم</span>
                    </div>
                    <div>
                        <p className="text-2xl font-black font-sans">{dashboardStats?.todayCollections?.toLocaleString() || 0} دج</p>
                        <p className="text-xs font-bold text-gray-400 mt-1">إجمالي المبالغ المحصلة اليوم</p>
                    </div>
                </div>

                <div className="bg-blue-600 p-6 rounded-[2rem] shadow-xl shadow-blue-200 flex flex-col gap-4 relative overflow-hidden group">
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div className="bg-white/20 p-3 rounded-2xl text-white"><History size={24} /></div>
                        <span className="text-[10px] font-black text-white/60 uppercase">النمو الشهري</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-2xl font-black text-white font-sans">+12.5%</p>
                        <p className="text-xs font-bold text-white/60 mt-1">معدل التحصيل مقارنة بالشهر السابق</p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2 pr-2 border-l border-gray-100">
                    <Filter size={18} className="text-gray-400" />
                    <span className="text-sm font-black text-gray-900">تصفية حسب:</span>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setStatusFilter('ALL')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === 'ALL' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-900'}`}>الكل</button>
                    <button onClick={() => setStatusFilter('UNPAID')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === 'UNPAID' ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:text-red-500'}`}>لم يدفع</button>
                    <button onClick={() => setStatusFilter('PARTIAL')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === 'PARTIAL' ? 'bg-amber-50 text-amber-600' : 'text-gray-400 hover:text-amber-500'}`}>جزئي</button>
                    <button onClick={() => setStatusFilter('PAID')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === 'PAID' ? 'bg-green-50 text-green-600' : 'text-gray-400 hover:text-green-500'}`}>خالص</button>
                    <button onClick={() => setStatusFilter('OVERDUE')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${statusFilter === 'OVERDUE' ? 'bg-rose-100/50 border-rose-500 text-rose-600 shadow-sm' : 'border-transparent text-gray-400 hover:text-rose-500 hover:bg-rose-50'}`}>🚨 متجاوزة</button>
                </div>

                <div className="flex items-center gap-3 mr-auto">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                        <Calendar size={14} className="text-gray-400" />
                        <input
                            type="date"
                            className="bg-transparent text-xs font-bold outline-none"
                            value={dateRange.start}
                            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                        />
                        <span className="text-gray-300 mx-1">|</span>
                        <input
                            type="date"
                            className="bg-transparent text-xs font-bold outline-none"
                            value={dateRange.end}
                            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">رقم الفاتورة</th>
                                <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">العميل / المشروع</th>
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
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-gray-300">
                                            <ShoppingBag size={64} />
                                            <p className="text-xl font-black">لا توجد فواتير مطابقة لبحثك</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-blue-50/30 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-black text-gray-900 font-sans tracking-tight">{inv.invoiceNumber}</span>
                                                <span className="text-[10px] font-black text-gray-400 font-sans">{formatDate(inv.date)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-gray-900">{inv.customerName}</span>
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
                                                {inv.remaining > 0 && (
                                                    <span className="text-[10px] font-black text-red-500">متبقي: {inv.remaining.toLocaleString()} دج</span>
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
                                                {inv.status !== 'PAID' && (
                                                    <button
                                                        onClick={() => { setShowPaymentModal(inv); setPaymentAmount(inv.remaining); }}
                                                        className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                        title="تسجيل دفع"
                                                    >
                                                        <CreditCard size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => { setShowHistoryModal(inv); fetchPaymentHistory(inv.id); }}
                                                    className="p-2.5 bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white rounded-xl transition-all shadow-sm"
                                                    title="سجل المدفوعات"
                                                >
                                                    <History size={18} />
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

            {/* PAYMENT MODAL */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-2xl font-black text-gray-900">تسجيل دفعة مالية</h2>
                            <button onClick={() => setShowPaymentModal(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2"><X size={24} /></button>
                        </div>

                        <div className="p-8 flex flex-col gap-6">
                            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-blue-800 uppercase mb-1">المبلغ المتبقي للفاتورة</p>
                                    <p className="text-2xl font-black text-blue-900 font-sans">{showPaymentModal.remaining.toLocaleString()} دج</p>
                                </div>
                                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
                                    <ArrowDownLeft size={24} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">المبلغ المحصل (دج)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={paymentAmount || ''}
                                            onChange={e => setPaymentAmount(Math.min(showPaymentModal.remaining, parseFloat(e.target.value) || 0))}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-black font-sans text-lg focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => setPaymentAmount(showPaymentModal.remaining)} className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-all">دفع الكل</button>
                                        <button onClick={() => setPaymentAmount(Math.round(showPaymentModal.remaining / 2))} className="text-[10px] font-black bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-all">نصف المبلغ</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">وسيلة الدفع</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={e => setPaymentMethod(e.target.value as any)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                        >
                                            <option value="CASH">نقداً (Cash)</option>
                                            <option value="BANK_TRANSFER">تحويل بنكي</option>
                                            <option value="CHEQUE">شيك بنكي</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">التاريخ</label>
                                        <div className="w-full bg-gray-100 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-400 flex items-center gap-2 cursor-not-allowed text-sm">
                                            <Calendar size={16} /> اليوم
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">ملاحظات (اختياري)</label>
                                    <textarea
                                        value={paymentNotes}
                                        onChange={e => setPaymentNotes(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                        placeholder="ذكر أي تفاصيل إضافية..."
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 pt-0">
                            <button
                                onClick={handleRecordPayment}
                                disabled={isSubmitting || paymentAmount <= 0}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-20 text-white h-16 rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? 'جاري الحفظ...' : <><CheckCircle size={24} /> تأكيد استلام المبلغ</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HISTORY MODAL */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="bg-gray-900 p-3 rounded-2xl text-white shadow-lg"><History size={24} /></div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">سجل مدفوعات الفاتورة</h2>
                                    <p className="text-xs font-bold text-gray-400 font-sans tracking-tight">{showHistoryModal.invoiceNumber}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowHistoryModal(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2"><X size={24} /></button>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto p-8">
                            {!showHistoryModal.payments || showHistoryModal.payments.length === 0 ? (
                                <div className="py-20 text-center text-gray-300 flex flex-col items-center gap-4">
                                    <CreditCard size={48} />
                                    <p className="font-black">لا توجد دفعات مسجلة لهذه الفاتورة بعد</p>
                                </div>
                            ) : (
                                <div className="relative space-y-8 pr-4 border-r-2 border-gray-100 mr-2">
                                    {showHistoryModal.payments.map((p, idx) => (
                                        <div key={p.id} className="relative">
                                            <div className="absolute top-2 -right-[23px] w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm ring-2 ring-blue-100"></div>
                                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col gap-2 hover:bg-white hover:shadow-lg transition-all group">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-lg font-black font-sans text-gray-900">{p.amount.toLocaleString()} دج</span>
                                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{p.paymentMethod}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                                    <Clock size={12} />
                                                    <span>{new Date(p.paymentDate).toLocaleString('ar-DZ')}</span>
                                                </div>
                                                {p.notes && (
                                                    <div className="mt-2 text-[10px] font-bold text-gray-600 italic border-t border-gray-100 pt-2">
                                                        {p.notes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-gray-50 flex justify-between items-center bg-gray-50/30">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase">إجمالي المحصل</p>
                                <p className="text-xl font-black text-green-600 font-sans">{showHistoryModal.paid.toLocaleString()} دج</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase text-left">المتبقي</p>
                                <p className="text-xl font-black text-red-600 font-sans text-left">{showHistoryModal.remaining.toLocaleString()} دج</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* INVOICE VIEW MODAL (PRINT-READY) */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-[110] bg-gray-900/60 backdrop-blur-sm flex justify-center p-4 md:p-8 overflow-y-auto font-tajawal rtl" dir="rtl">
                    <div className="relative w-full max-w-4xl animate-in zoom-in-95 duration-300">

                        <div className="absolute top-4 left-4 flex gap-2 print:hidden">
                            <button onClick={() => window.print()} className="bg-blue-600 text-white p-3 rounded-xl shadow-xl hover:scale-105 transition-all"><Printer size={20} /></button>
                            <button onClick={() => setSelectedInvoice(null)} className="bg-white text-gray-900 p-3 rounded-xl shadow-xl hover:scale-105 transition-all"><X size={20} /></button>
                        </div>

                        <div className="bg-white shadow-2xl p-6 md:p-12 min-h-[1056px] text-gray-900 print:shadow-none print:p-0 border border-gray-100">
                            <div className="text-center mb-10 border-b-2 border-gray-900 pb-6">
                                <h1 className="text-4xl font-black text-gray-900 tracking-wide uppercase">مخــزونـي</h1>
                                <p className="text-gray-600 text-lg font-medium mt-1">لتجارة مواد البناء والتوريدات العامة</p>
                                <div className="absolute top-0 right-0 hidden md:block opacity-10"><Store size={80} /></div>
                            </div>

                            <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
                                <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl flex-1 w-full order-2 md:order-1">
                                    <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tighter">فـاتـورة مبيعـات رصـيـد</h2>
                                    <p className="text-sm font-bold text-gray-600 mb-1">رقم الفاتورة: <span className="text-gray-900 font-sans" dir="ltr">{selectedInvoice.invoiceNumber}</span></p>
                                    <p className="text-sm font-bold text-gray-600">التاريخ: <span className="text-gray-900 font-sans">{formatDate(selectedInvoice.date)}</span></p>
                                    {selectedInvoice.dueDate && (
                                        <p className="text-sm font-bold text-red-600 mt-2">تاريخ الاستحقاق: <span className="font-sans">{formatDate(selectedInvoice.dueDate)}</span></p>
                                    )}
                                </div>
                                <div className="border-r-4 border-blue-600 pr-5 flex-1 w-full order-1 md:order-2">
                                    <p className="text-xs font-black text-blue-600 mb-1 uppercase tracking-widest">موجه إلى العميل:</p>
                                    <p className="text-xl font-black text-gray-900 leading-tight">{selectedInvoice.customerName}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {selectedInvoice.projectName && <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">مشروع: {selectedInvoice.projectName}</span>}
                                        {selectedInvoice.customerPhone && <span className="text-xs font-bold bg-gray-50 text-gray-500 px-2 py-0.5 rounded font-sans" dir="ltr">{selectedInvoice.customerPhone}</span>}
                                    </div>
                                </div>
                            </div>

                            <table className="w-full text-right border-collapse mb-8">
                                <thead className="bg-gray-900 text-white">
                                    <tr>
                                        <th className="px-4 py-3 font-bold w-12 text-center rounded-tr-lg">#</th>
                                        <th className="px-4 py-3 font-bold">المنتج / الوصف</th>
                                        <th className="px-4 py-3 font-bold text-center w-24">الكمية</th>
                                        <th className="px-4 py-3 font-bold text-center w-32">السعر الوحدوي</th>
                                        <th className="px-4 py-3 font-bold text-left w-36 rounded-tl-lg">المجموع</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-800">
                                    {selectedInvoice.order.items.map((item: any, idx: number) => (
                                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="px-4 py-4 text-center text-gray-400 font-sans">{idx + 1}</td>
                                            <td className="px-4 py-4 font-bold">{item.product.name}</td>
                                            <td className="px-4 py-4 text-center font-bold font-sans" dir="ltr">{item.quantity}</td>
                                            <td className="px-4 py-4 text-center font-bold font-sans" dir="ltr">{item.unitPrice.toLocaleString()}</td>
                                            <td className="px-4 py-4 text-left font-black text-gray-900 font-sans" dir="ltr">{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    <tr className="h-40"><td colSpan={5}></td></tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} className="pt-6">
                                            <div className="bg-gray-50 border-r-4 border-gray-900 p-4">
                                                <p className="text-xs font-bold text-gray-500 mb-1">المبلغ الإجمالي بالحروف:</p>
                                                <p className="font-black text-gray-900">{numberToArabicWords(selectedInvoice.total)}</p>
                                            </div>
                                        </td>
                                        <td colSpan={2} className="pt-6">
                                            <div className="bg-gray-900 text-white p-6 rounded-b-xl flex flex-col items-end shadow-xl">
                                                <div className="flex justify-between w-full opacity-60 text-xs mb-2">
                                                    <span>إجمالي الفاتورة:</span>
                                                    <span className="font-sans" dir="ltr">{selectedInvoice.total.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between w-full opacity-60 text-xs mb-4">
                                                    <span>إجمالي المدفوع:</span>
                                                    <span className="font-sans" dir="ltr">{selectedInvoice.paid.toLocaleString()}</span>
                                                </div>
                                                <span className="text-sm font-bold opacity-70">المتبقي للدفع (دج)</span>
                                                <span className="text-3xl font-black font-sans leading-none" dir="ltr">{selectedInvoice.remaining.toLocaleString()}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="grid grid-cols-2 gap-12 mt-20 px-10">
                                <div className="text-center font-bold text-gray-600 border-t-2 border-gray-100 pt-8"><p>توقيع الـبـائـــــع</p></div>
                                <div className="text-center font-bold text-gray-600 border-t-2 border-gray-100 pt-8"><p>توقيع و استـلام العـمـيـل</p></div>
                            </div>

                            <style dangerouslySetInnerHTML={{
                                __html: `
                    @media print {
                      body * { visibility: hidden; }
                      .fixed, .print\\:hidden { display: none !important; }
                      .bg-white { visibility: visible; position: absolute; left: 0; top: 0; width: 100% !important; margin: 0 !important; padding: 15mm !important; box-shadow: none !important; border: none !important; }
                      .bg-white * { visibility: visible; }
                      @page { size: portrait; margin: 0; }
                    }
                  `}} />
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
