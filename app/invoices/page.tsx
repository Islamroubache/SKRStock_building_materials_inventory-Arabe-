'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, FileText, Printer, Eye, Download, Filter,
    CheckCircle, Clock, AlertCircle, ShoppingBag, X,
    Store, CreditCard, History, ChevronLeft, Calendar,
    User, ArrowUpRight, ArrowDownLeft, MoreVertical, Banknote, RotateCcw,
    FileSpreadsheet, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToArabicWords } from '@/lib/number-to-arabic-words';
import { numberToFrenchWords } from '@/lib/number-to-french-words';
import { formatDate } from '@/lib/utils';
import { printDocument } from '@/lib/print-helper';
import { InvoicesTable } from '@/components/InvoicesTable';
import PageHeader from '@/components/PageHeader';
import DateRangePicker from '@/components/DateRangePicker';

// --- Types ---
interface Payment {
    id: number;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    notes?: string;
    bankName?: string;
    chequeNumber?: string;
    isReturn?: boolean;
    items?: any[];
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
    originalTotal: number;
    returnsValue: number;
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
    const [invoiceType, setInvoiceType] = useState<'SALE' | 'PURCHASE'>('SALE');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE' | 'CREDIT'>('ALL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | 'GUEST' | 'FIDEL'>('ALL');
    const [showExportDropdown, setShowExportDropdown] = useState(false);

    // Modals
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState<Invoice | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState<Invoice | null>(null);
    const [showReturnsModal, setShowReturnsModal] = useState<any | null>(null);

    // Payment Form
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
    const [chequeNumber, setChequeNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/orders?type=${invoiceType}`);
            if (res.ok) {
                const data = await res.json();
                const invs = data.map((o: any) => {
                    const invoice = o.invoice;
                    if (!invoice) return null;

                    const returnsValue = (o.items || []).reduce((sum: number, item: any) => sum + ((item.returnedQuantity || 0) * item.unitPrice), 0);
                    
                    return {
                        ...invoice,
                        order: o,
                        customerName: invoiceType === 'SALE' 
                            ? (o.customer?.name || o.customerName || 'عميل عابر')
                            : (o.supplier?.name || o.customerName || 'مورد غير مسجل'),
                        projectName: o.project?.name,
                        total: invoice.total, // Use DB total (Net)
                        originalTotal: invoice.total + returnsValue, // Back-calculate original if needed
                        returnsValue: returnsValue,
                        paid: invoice.paid,
                        remaining: invoice.remaining,
                        status: invoice.status
                    };
                }).filter((inv: any) => inv !== null);
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
    }, [invoiceType]);

    useEffect(() => {
        fetchInvoices();
        fetch('/api/dashboard/stats').then(res => res.json()).then(data => setDashboardStats(data)).catch(console.error);
    }, []);

    // --- Calculations for KPIs ---
    const stats = useMemo(() => {
        const totalOpenDebt = invoices.reduce((sum, inv) => sum + Math.max(0, inv.remaining), 0);
        const unpaidCount = invoices.filter(inv => inv.remaining > 0 && inv.paid === 0).length;
        const partialCount = invoices.filter(inv => inv.remaining > 0 && inv.paid > 0).length;
        const creditCount = invoices.filter(inv => inv.remaining < 0).length;
        
        const now = new Date();
        const overdueCount = invoices.filter(inv => {
            const isOverdue = inv.dueDate ? new Date(inv.dueDate) < now && new Date(inv.dueDate).toDateString() !== now.toDateString() : false;
            return isOverdue && inv.remaining > 0;
        }).length;

        return { totalOpenDebt, unpaidCount, partialCount, creditCount, overdueCount };
    }, [invoices]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const isOverdueItem = inv.dueDate ? new Date(inv.dueDate) < new Date() && new Date(inv.dueDate).toDateString() !== new Date().toDateString() : false;
            
            const matchesStatus = (() => {
                if (statusFilter === 'ALL') return true;
                if (statusFilter === 'OVERDUE') return isOverdueItem && inv.remaining > 0;
                if (statusFilter === 'CREDIT') return inv.remaining < 0;
                if (statusFilter === 'UNPAID') return inv.remaining > 0 && inv.paid === 0;
                if (statusFilter === 'PARTIAL') return inv.remaining > 0 && inv.paid > 0;
                if (statusFilter === 'PAID') return inv.remaining === 0;
                return inv.status === statusFilter;
            })();

            let matchesDate = true;
            const invDate = new Date(inv.date);
            
            if (dateRange.start) {
                const startDate = new Date(dateRange.start);
                startDate.setHours(0, 0, 0, 0);
                if (invDate < startDate) matchesDate = false;
            }
            
            if (dateRange.end) {
                const endDate = new Date(dateRange.end);
                endDate.setHours(23, 59, 59, 999);
                if (invDate > endDate) matchesDate = false;
            }

            const matchesCustomerType = customerTypeFilter === 'ALL' || 
                (customerTypeFilter === 'GUEST' ? !inv.order?.customerId : !!inv.order?.customerId);

            return matchesSearch && matchesStatus && matchesDate && matchesCustomerType;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices, searchTerm, statusFilter, dateRange, customerTypeFilter]);

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
                    chequeNumber: (paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') ? chequeNumber : null,
                    bankName: (paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') ? bankName : null,
                    notes: paymentNotes,
                    supplierId: showPaymentModal.order.supplierId || null
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
                setShowHistoryModal((prev: any) => prev ? { ...prev, payments: data } : null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchReturnsHistory = async (orderNumber: string) => {
        try {
            const type = invoiceType === 'SALE' ? 'RETURN_SALE' : 'RETURN_PURCHASE';
            const res = await fetch(`/api/orders?type=${type}`);
            if (res.ok) {
                const allReturns = await res.json();
                const relevantReturns = allReturns.filter((r: any) => r.orderNumber.includes(orderNumber));
                setShowReturnsModal((prev: any) => prev ? { ...prev, returns: relevantReturns } : null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleRefundExcess = async (inv: any) => {
        const isSale = invoiceType === 'SALE';
        const partyLabel = isSale ? 'للزبون' : 'من المورد';
        const actionLabel = isSale ? 'إرجاع' : 'استرجاع';
        
        if (!confirm(`هل أنت متأكد من تسجيل ${actionLabel} مبلغ ${Math.abs(inv.remaining).toLocaleString()} دج ${partyLabel} نقداً؟ سيتم تصفير الرصيد.`)) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: inv.id,
                    customerId: inv.order.customerId || 0,
                    amount: inv.remaining, // It's already negative, e.g., -50
                    paymentMethod: 'CASH',
                    notes: 'إرجاع فائض المرتجعات للزبون نقداً',
                    supplierId: inv.order.supplierId || null
                })
            });

            if (res.ok) {
                alert('تم إرجاع المبلغ الزائد وتصفير الحساب بنجاح');
                await fetchInvoices();
                if (showHistoryModal && showHistoryModal.id === inv.id) {
                    fetchPaymentHistory(inv.id);
                }
            } else {
                const err = await res.json();
                alert(err.error || 'فشلت عملية الإرجاع');
            }
        } catch (e) {
            alert('خطأ في الاتصال');
        } finally {
            setIsSubmitting(false);
        }
    };


    const exportToExcel = () => {
        const data = filteredInvoices.map(inv => ({
            'N° Facture': inv.invoiceNumber,
            [invoiceType === 'SALE' ? 'Client' : 'Fournisseur']: inv.customerName,
            'Projet': inv.projectName || '---',
            'Date': formatDate(inv.date),
            'Total TTC': inv.total,
            'Versé': inv.paid,
            'Reste': inv.remaining,
            'Statut': inv.status === 'PAID' ? 'Payé' : inv.status === 'PARTIAL' ? 'Partiel' : 'Non payé',
            'Échéance': formatDate(inv.dueDate)
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Invoices");
        XLSX.writeFile(wb, `factures_${invoiceType.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const title = invoiceType === 'SALE' ? 'Rapport des Ventes' : 'Rapport des Achats';
        
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(10);
        doc.text(`Généré le: ${new Date().toLocaleString()}`, 14, 30);

        const tableData = filteredInvoices.map(inv => [
            inv.invoiceNumber,
            formatDate(inv.date),
            inv.customerName,
            inv.total.toLocaleString() + ' DZD',
            inv.paid.toLocaleString() + ' DZD',
            inv.remaining.toLocaleString() + ' DZD',
            inv.status === 'PAID' ? 'Payé' : (inv.status === 'PARTIAL' ? 'Partiel' : 'Non payé')
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['N°', 'Date', invoiceType === 'SALE' ? 'Client' : 'Fournisseur', 'Total', 'Versé', 'Reste', 'Statut']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], textColor: 255 },
            styles: { fontSize: 8, font: 'helvetica' }
        });

        doc.save(`rapport_${invoiceType.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handlePrintList = () => {
        printDocument();
    };

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 flex flex-col gap-8" dir="rtl">

            {/* Header & Search */}
            <PageHeader 
                title="الفواتير والسندات" 
                subtitle="إدارة فواتير البيع، الشراء، وسندات التسليم" 
                Icon={FileText} 
            >
                <div className="flex p-1 bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <button 
                        onClick={() => setInvoiceType('SALE')} 
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${invoiceType === 'SALE' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-900'}`}
                    >
                        🛍️ فواتير المبيعات
                    </button>
                    <button 
                        onClick={() => setInvoiceType('PURCHASE')} 
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${invoiceType === 'PURCHASE' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-gray-400 hover:text-gray-900'}`}
                    >
                        📦 فواتير المشتريات
                    </button>
                </div>
            </PageHeader>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Card 1: Total Debt */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-rose-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
                    <div className="bg-rose-50 p-4 rounded-2xl text-rose-600 relative z-10 shadow-sm">
                        <ArrowUpRight size={24} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-wider mb-1 inline-block">
                            {invoiceType === 'SALE' ? 'إجمالي الديون (عند الزبائن)' : 'إجمالي الديون (للموردين)'}
                        </span>
                        <p className="text-2xl font-black font-sans text-gray-900">{stats.totalOpenDebt.toLocaleString()} <span className="text-xs font-bold text-gray-400 mr-1">دج</span></p>
                        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                            {invoiceType === 'SALE' ? 'مبالغ لم يتم تحصيلها' : 'مبالغ لم يتم تسديدها'}
                        </p>
                    </div>
                </div>

                {/* Card 2: Open Invoices */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
                    <div className="bg-amber-50 p-4 rounded-2xl text-amber-600 relative z-10 shadow-sm">
                        <Clock size={24} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-wider mb-1 inline-block">
                            {invoiceType === 'SALE' ? 'فواتير مفتوحة' : 'فواتير غير مسددة'}
                        </span>
                        <p className="text-2xl font-black font-sans text-gray-900">{stats.unpaidCount + stats.partialCount}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                            {invoiceType === 'SALE' 
                                ? `${stats.unpaidCount} غير مدفوعة • ${stats.partialCount} جزئية` 
                                : `${stats.unpaidCount} لم نسدد • ${stats.partialCount} جزئية`}
                        </p>
                    </div>
                </div>

                {/* Card 3: Today's Collections */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
                    <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 relative z-10 shadow-sm">
                        <CheckCircle size={24} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider mb-1 inline-block">
                            {invoiceType === 'SALE' ? 'تحصيلات اليوم' : 'مدفوعات اليوم'}
                        </span>
                        <p className="text-2xl font-black font-sans text-gray-900">
                            {invoiceType === 'SALE' 
                                ? (dashboardStats?.todayCustomerCollections?.toLocaleString() || 0)
                                : (dashboardStats?.todaySupplierPayments?.toLocaleString() || 0)
                            } <span className="text-xs font-bold text-gray-400 mr-1">دج</span>
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                            {invoiceType === 'SALE' ? 'إجمالي المحصل اليوم' : 'إجمالي المسدد اليوم'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-6">
                    {/* Search Bar integrated in filter line */}
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder={invoiceType === 'SALE' ? "بحث برقم فاتورة، اسم العميل..." : "بحث برقم فاتورة، اسم المورد..."}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-12 pl-4 py-2.5 font-bold shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="w-px h-8 bg-gray-100 mx-2 hidden lg:block"></div>

                    <div className="flex items-center gap-2 pr-2">
                        <Filter size={18} className="text-gray-400" />
                        <span className="text-sm font-black text-gray-900">تصفية حسب:</span>
                    </div>
                    
                    <div className="flex gap-2">
                        <button onClick={() => setStatusFilter('ALL')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === 'ALL' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-900'}`}>الكل</button>
                        <button onClick={() => setStatusFilter('UNPAID')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === 'UNPAID' ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:text-red-500'}`}>لم يدفع</button>
                        <button onClick={() => setStatusFilter('PARTIAL')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === 'PARTIAL' ? 'bg-amber-50 text-amber-600' : 'text-gray-400 hover:text-amber-500'}`}>جزئي</button>
                        <button onClick={() => setStatusFilter('PAID')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === 'PAID' ? 'bg-green-50 text-green-600' : 'text-gray-400 hover:text-green-500'}`}>خالص</button>
                        <button onClick={() => setStatusFilter('CREDIT')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === 'CREDIT' ? 'bg-purple-50 text-purple-600' : 'text-gray-400 hover:text-purple-500'}`}>رصيد زائد للعميل</button>
                        <button onClick={() => setStatusFilter('OVERDUE')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${statusFilter === 'OVERDUE' ? 'bg-rose-100/50 border-rose-500 text-rose-600 shadow-sm' : 'border-transparent text-gray-400 hover:text-rose-500 hover:bg-rose-50'}`}>🚨 متجاوزة</button>
                    </div>

                    <div className="w-px h-8 bg-gray-100 mx-2"></div>

                    <DateRangePicker 
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onChange={(start, end) => setDateRange({ start, end })}
                    />

                    {/* Customer Type Dropdown */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase">نوع العميل:</span>
                        <select 
                            value={customerTypeFilter} 
                            onChange={(e) => setCustomerTypeFilter(e.target.value as any)}
                            className="bg-white border-2 border-gray-100 rounded-xl px-4 py-2 text-xs font-black text-gray-700 outline-none focus:border-orange-400 transition-all cursor-pointer shadow-sm"
                        >
                            <option value="ALL">الكل (الزبائن)</option>
                            <option value="FIDEL">👤 زبائن مسجلون</option>
                            <option value="GUEST">👥 زبائن عابرون</option>
                        </select>
                    </div>

                    {/* Actions (Export & Print) on the Left */}
                    <div className="mr-auto flex items-center gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setShowExportDropdown(!showExportDropdown)}
                                className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
                            >
                                <Download size={16} className="text-blue-600" /> تصدير <ChevronDown size={14} className={`transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {showExportDropdown && (
                                <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button
                                        onClick={() => { exportToExcel(); setShowExportDropdown(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-b border-gray-50"
                                    >
                                        <FileSpreadsheet size={16} className="text-emerald-600" /> Excel (.xlsx)
                                    </button>
                                    <button
                                        onClick={() => { exportToPDF(); setShowExportDropdown(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                    >
                                        <FileText size={16} className="text-rose-600" /> PDF (.pdf)
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handlePrintList}
                            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg"
                        >
                            <Printer size={16} /> طباعة القائمة
                        </button>
                    </div>
                </div>

                {/* Date Filter Row */}
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-6 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex items-center gap-3 pr-2">
                        <Calendar size={18} className="text-gray-400" />
                        <span className="text-sm font-black text-gray-900">الفترة الزمنية:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 bg-gray-50 px-5 py-2.5 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase">من</span>
                            <input
                                type="date"
                                className="bg-transparent text-xs font-bold outline-none border-none focus:ring-0 p-0"
                                value={dateRange.start}
                                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                            />
                        </div>

                        <span className="text-gray-200 mx-2">|</span>

                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase">إلى</span>
                            <input
                                type="date"
                                className="bg-transparent text-xs font-bold outline-none border-none focus:ring-0 p-0"
                                value={dateRange.end}
                                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                            />
                        </div>

                        {(dateRange.start || dateRange.end) && (
                            <button 
                                onClick={() => setDateRange({ start: '', end: '' })}
                                className="mr-4 flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-amber-600 hover:bg-amber-50 font-black text-[10px] transition-all shadow-sm"
                            >
                                <RotateCcw size={14} /> إعادة تعيين التاريخ
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <InvoicesTable 
                invoices={filteredInvoices}
                loading={loading}
                invoiceType={invoiceType}
                setSelectedInvoice={setSelectedInvoice}
                setShowPaymentModal={setShowPaymentModal}
                setPaymentAmount={setPaymentAmount}
                handleRefundExcess={handleRefundExcess}
                setShowHistoryModal={setShowHistoryModal}
                fetchPaymentHistory={fetchPaymentHistory}
                setShowReturnsModal={setShowReturnsModal}
                fetchReturnsHistory={fetchReturnsHistory}
            />

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

                                <div className="space-y-6">
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

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">وسيلة الدفع</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'CASH', label: 'نقداً', icon: '💵' },
                                                { id: 'CHEQUE', label: 'شيك', icon: '📝' },
                                                { id: 'BANK_TRANSFER', label: 'تحويل', icon: '🏛️' }
                                            ].map(method => (
                                                <button
                                                    key={method.id}
                                                    type="button"
                                                    onClick={() => setPaymentMethod(method.id as any)}
                                                    className={`py-3 px-2 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center gap-1 ${paymentMethod === method.id ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg shadow-blue-200/50' : 'border-gray-100 hover:border-gray-200 text-gray-500'}`}
                                                >
                                                    <span className="text-xl">{method.icon}</span>
                                                    {method.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {(paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') && (
                                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top duration-300">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">
                                                    {paymentMethod === 'CHEQUE' ? 'رقم الشيك' : 'رقم التحويل'}
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="00000000"
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                                                    value={chequeNumber}
                                                    onChange={e => setChequeNumber(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">البنك</label>
                                                <select
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                                                    value={bankName}
                                                    onChange={e => setBankName(e.target.value)}
                                                >
                                                    <option value="">اختر البنك...</option>
                                                    <option value="Algérie Poste (بريد الجزائر)">Algérie Poste (بريد الجزائر)</option>
                                                    <option value="BNA (البنك الوطني الجزائري)">BNA (البنك الوطني الجزائري)</option>
                                                    <option value="CPA (القرض الشعبي الجزائري)">CPA (القرض الشعبي الجزائري)</option>
                                                    <option value="BADR (الفلاحة والتنمية الريفية)">BADR (الفلاحة والتنمية الريفية)</option>
                                                    <option value="BDL (بنك التنمية المحلية)">BDL (بنك التنمية المحلية)</option>
                                                    <option value="CNEP (الصندوق للتوفير والاحتياط)">CNEP (الصندوق للتوفير والاحتياط)</option>
                                                    <option value="BEA (بنك الجزائر الخارجي)">BEA (بنك الجزائر الخارجي)</option>
                                                    <option value="Société Générale Algérie">Société Générale Algérie</option>
                                                    <option value="BNP Paribas El Djazaïr">BNP Paribas El Djazaïr</option>
                                                    <option value="Gulf Bank Algérie (AGB)">Gulf Bank Algérie (AGB)</option>
                                                    <option value="Natixis Algérie">Natixis Algérie</option>
                                                    <option value="Al Baraka (بنك البركة)">Al Baraka (بنك البركة)</option>
                                                    <option value="Al Salam Bank (مصرف السلام)">Al Salam Bank (مصرف السلام)</option>
                                                    <option value="Trust Bank Algeria">Trust Bank Algeria</option>
                                                    <option value="Housing Bank Algeria">Housing Bank Algeria</option>
                                                    <option value="Fransabank El Djazaïr">Fransabank El Djazaïr</option>
                                                    <option value="OTHER">بنك آخر</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

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
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const printContent = document.getElementById('full-history-print');
                                        if (printContent) {
                                            const originalContent = document.body.innerHTML;
                                            document.body.innerHTML = printContent.innerHTML;
                                            printDocument();
                                            document.body.innerHTML = originalContent;
                                            window.location.reload();
                                        }
                                    }}
                                    className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg no-print"
                                >
                                    <Printer size={16} /> طباعة السجل
                                </button>
                                <button onClick={() => setShowHistoryModal(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2 no-print"><X size={24} /></button>
                            </div>
                        </div>

                        {/* Hidden Full History Template for Print (French) */}
                        <div id="full-history-print" className="hidden">
                            <div className="p-10 font-sans text-left" dir="ltr">
                                <div className="flex justify-between items-center border-b-2 border-gray-900 pb-4 mb-6">
                                    <h1 className="text-2xl font-black">HISTORIQUE DES PAIEMENTS</h1>
                                    <div className="text-right">
                                        <p className="font-bold text-blue-600">SKR Stock</p>
                                    </div>
                                </div>
                                <p className="text-gray-600 mb-8 font-bold">
                                    Facture N°: {showHistoryModal.invoiceNumber} <br/>
                                    {showHistoryModal.invoiceNumber.startsWith('PUR') ? 'Fournisseur' : 'Client'}: {showHistoryModal.customerName}
                                </p>
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-3 text-left">Date</th>
                                            <th className="border p-3 text-left">Mode de Paiement</th>
                                            <th className="border p-3 text-right">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {showHistoryModal.payments?.map((p, i) => (
                                            <tr key={i}>
                                                <td className="border p-3">{new Date(p.paymentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td className="border p-3">
                                                    {p.paymentMethod} 
                                                    {p.bankName ? ` - ${p.bankName}` : ''} 
                                                    {p.chequeNumber ? ` (N°: ${p.chequeNumber})` : ''}
                                                </td>
                                                <td className="border p-3 text-right font-black">
                                                    {p.amount < 0 ? (
                                                        <span className="text-purple-600">-{Math.abs(p.amount).toLocaleString()} (Remboursement)</span>
                                                    ) : (
                                                        `${p.amount.toLocaleString()}`
                                                    )} DZD
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-50 font-black">
                                            <td colSpan={2} className="border p-3 text-right">TOTAL ENCAISSÉ:</td>
                                            <td className="border p-3 text-right">{showHistoryModal.paid.toLocaleString()} DZD</td>
                                        </tr>
                                        <tr className={`font-black ${showHistoryModal.remaining < 0 ? 'text-purple-600' : 'text-red-600'}`}>
                                            <td colSpan={2} className="border p-3 text-right">
                                                {showHistoryModal.remaining < 0 ? 'CRÉDIT CLIENT (SURPLUS):' : 'RESTE À PAYER:'}
                                            </td>
                                            <td className="border p-3 text-right">{Math.abs(showHistoryModal.remaining).toLocaleString()} DZD</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
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
                                                <div className="flex justify-between items-center text-right" dir="rtl">
                                                    <div className="flex items-center gap-3">
                                                         <span className={`text-lg font-black font-sans ${p.isReturn ? 'text-orange-600' : (p.amount < 0 ? 'text-purple-600' : 'text-gray-900')}`}>
                                                             {p.isReturn ? '-' : ''}{Math.abs(p.amount).toLocaleString()} دج
                                                         </span>
                                                         <button
                                                              onClick={() => {
                                                                  const printContent = document.getElementById(`receipt-${p.id}`);
                                                                  if (printContent) {
                                                                      const originalContent = document.body.innerHTML;
                                                                      document.body.innerHTML = printContent.innerHTML;
                                                                      printDocument();
                                                                      document.body.innerHTML = originalContent;
                                                                      window.location.reload();
                                                                  }
                                                              }}
                                                              className={`flex items-center gap-1.5 px-3 py-1.5 ${p.isReturn ? 'bg-orange-600' : (p.amount < 0 ? 'bg-purple-600' : 'bg-blue-600')} text-white rounded-lg hover:opacity-90 transition-all shadow-md no-print`}
                                                          >
                                                              <Printer size={12} />
                                                              <span className="text-[10px] font-black">طباعة الوصل</span>
                                                          </button>
                                                     </div>
                                                     <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${p.isReturn ? 'text-orange-600 bg-orange-50' : (p.amount < 0 ? 'text-purple-600 bg-purple-50' : 'text-blue-600 bg-blue-50')}`}>
                                                         {p.isReturn ? 'DÉDUCTION RETOUR' : (p.amount < 0 ? 'Remboursement' : p.paymentMethod)}
                                                     </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 justify-end" dir="rtl">
                                                    <span>{new Date(p.paymentDate).toLocaleString('ar-DZ')}</span>
                                                    <Clock size={12} />
                                                </div>
                                                {(p.paymentMethod === 'CHEQUE' || p.paymentMethod === 'BANK_TRANSFER' || p.chequeNumber) && (
                                                    <div className="mt-2 flex flex-col gap-1 bg-blue-50 border border-blue-100 p-3 rounded-xl text-right" dir="rtl">
                                                        {p.bankName && <div className="text-[10px] font-black text-blue-700 flex items-center gap-1 justify-end">🏛️ {p.bankName}</div>}
                                                        {p.chequeNumber && <div className="text-[11px] font-black text-gray-900 font-sans">№ {p.chequeNumber}</div>}
                                                    </div>
                                                )}



                                                {/* Hidden Receipt Template for Single Print (French) */}
                                                <div id={`receipt-${p.id}`} className="hidden">
                                                    <div className="p-10 font-sans text-left" dir="ltr">
                                                        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                                                            <div>
                                                                <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase">
                                                                    {p.isReturn ? 'BON DE RETOUR' : (p.amount < 0 ? 'REÇU DE REMBOURSEMENT' : (showHistoryModal.invoiceNumber.startsWith('PUR') ? 'BON DE PAIEMENT' : 'REÇU DE PAIEMENT'))}
                                                                </h1>
                                                                <p className="text-gray-500 font-bold">Réf. Transaction: {p.id}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xl font-black text-blue-600">SKR Stock</p>
                                                                <p className="text-[10px] font-bold text-gray-400 italic">Construction & Travaux Publics</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-6">
                                                            <div className="flex justify-between border-b border-gray-100 py-4">
                                                                <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Date:</span>
                                                                <span className="font-black font-sans">{new Date(p.paymentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-gray-100 py-4">
                                                                <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">
                                                                    {showHistoryModal.invoiceNumber.startsWith('PUR') ? 'Fournisseur:' : 'Client:'}
                                                                </span>
                                                                <span className="font-black">{showHistoryModal.customerName}</span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-gray-100 py-4">
                                                                <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Référence Facture:</span>
                                                                <span className="font-black font-sans">{showHistoryModal.invoiceNumber}</span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-gray-100 py-4">
                                                                <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Mode de Paiement:</span>
                                                                <span className="font-black uppercase">{p.paymentMethod}</span>
                                                            </div>
                                                            {p.bankName && (
                                                                <div className="flex justify-between border-b border-gray-100 py-4">
                                                                    <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Banque:</span>
                                                                    <span className="font-black">{p.bankName}</span>
                                                                </div>
                                                            )}
                                                            {p.chequeNumber && (
                                                                <div className="flex justify-between border-b border-gray-100 py-4">
                                                                    <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">{p.paymentMethod === 'CHEQUE' ? 'N° Chèque:' : 'Réf:'}</span>
                                                                    <span className="font-black font-sans">{p.chequeNumber}</span>
                                                                </div>
                                                            )}

                                                            {p.isReturn && p.items && (
                                                                <div className="mt-8 border-t-2 border-gray-100 pt-6">
                                                                    <p className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-widest">Produits Retournés:</p>
                                                                    <table className="w-full text-left">
                                                                        <thead>
                                                                            <tr className="text-[10px] font-black text-gray-900 uppercase border-b border-gray-200">
                                                                                <th className="py-2">Désignation</th>
                                                                                <th className="py-2 text-center">Qté</th>
                                                                                <th className="py-2 text-right">P.U</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="text-sm">
                                                                            {p.items.map((item: any, i: number) => (
                                                                                <tr key={i} className="border-b border-gray-50">
                                                                                    <td className="py-3 font-bold">{item.product?.name}</td>
                                                                                    <td className="py-3 text-center font-sans">{item.quantity}</td>
                                                                                    <td className="py-3 text-right font-black font-sans">{item.unitPrice.toLocaleString()}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}

                                                            <div className={`${p.isReturn ? 'bg-orange-600' : (p.amount < 0 ? 'bg-purple-600' : 'bg-gray-900')} text-white p-8 rounded-3xl mt-10 text-center shadow-2xl transition-all`}>
                                                                <p className="text-xs font-bold opacity-60 mb-2 tracking-widest uppercase">
                                                                    {p.isReturn ? 'VALEUR DU RETOUR' : (p.amount < 0 ? 'SOMME REMBOURSÉE' : (showHistoryModal.invoiceNumber.startsWith('PUR') ? 'MONTANT VERSÉ' : 'MONTANT REÇU'))}
                                                                </p>
                                                                <p className="text-5xl font-black font-sans">{Math.abs(p.amount).toLocaleString()} DZD</p>
                                                                <p className="mt-4 text-[10px] font-bold italic opacity-50 uppercase tracking-widest">
                                                                    Arrêté à la somme de: {numberToFrenchWords(Math.abs(p.amount))} Dinars Algériens
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-20 mt-20 text-center">
                                                            <div className="border-t-2 border-gray-900 pt-4 font-black text-gray-900 uppercase text-xs tracking-widest">Cachet et Signature</div>
                                                            <div className="border-t-2 border-gray-900 pt-4 font-black text-gray-900 uppercase text-xs tracking-widest">Signature Client</div>
                                                        </div>
                                                    </div>
                                                </div>
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
                                <p className={`text-xl font-black font-sans text-left ${showHistoryModal.remaining < 0 ? 'text-purple-600' : 'text-red-600'}`}>
                                    {showHistoryModal.remaining.toLocaleString()} دج
                                </p>
                                {showHistoryModal.remaining < 0 && (
                                    <button
                                        onClick={() => handleRefundExcess(showHistoryModal)}
                                        className="mt-2 text-[10px] font-black bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-all shadow-md flex items-center gap-1 ml-auto"
                                    >
                                        <Banknote size={12} /> إرجاع الفائض نقداً
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RETURNS HISTORY MODAL */}
            {showReturnsModal && (
                <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">سجل المرتجعات</h2>
                                <p className="text-xs font-bold text-gray-500 mt-1 uppercase">Historique des Retours</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const printContent = document.getElementById("full-returns-print");
                                        if (printContent) {
                                            const original = document.body.innerHTML;
                                            document.body.innerHTML = printContent.innerHTML;
                                            printDocument();
                                            document.body.innerHTML = original;
                                            window.location.reload();
                                        }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-all shadow-lg text-xs font-bold"
                                >
                                    <Printer size={16} /> طباعة السجل
                                </button>
                                <button onClick={() => setShowReturnsModal(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2 bg-white rounded-xl border border-gray-100 shadow-sm"><X size={24} /></button>
                            </div>
                        </div>

                        {/* Hidden Full Returns Template (French) */}
                        <div id="full-returns-print" className="hidden">
                            <div className="p-10 font-sans text-left" dir="ltr">
                                <div className="flex justify-between items-center border-b-2 border-gray-900 pb-4 mb-6">
                                    <h1 className="text-2xl font-black uppercase">Historique des Retours</h1>
                                    <div className="text-right"><p className="font-bold text-blue-600 text-xl">SKR Stock</p></div>
                                </div>
                                <p className="text-gray-600 mb-8 font-bold">
                                    Référence Facture: {showReturnsModal.invoiceNumber} <br/>
                                    {showReturnsModal.invoiceNumber.startsWith('PUR') ? 'Fournisseur' : 'Client'}: {showReturnsModal.customerName}
                                </p>
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-3 text-left uppercase text-xs">Réf. Retour</th>
                                            <th className="border p-3 text-left uppercase text-xs">Date</th>
                                            <th className="border p-3 text-right uppercase text-xs">Valeur</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {showReturnsModal.returns?.map((r: any, i: number) => (
                                            <tr key={i}>
                                                <td className="border p-3 text-xs">{r.orderNumber}</td>
                                                <td className="border p-3 text-xs">{new Date(r.orderDate).toLocaleString('fr-FR')}</td>
                                                <td className="border p-3 text-right font-black">{r.total.toLocaleString()} DZD</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-900 text-white font-black">
                                            <td colSpan={2} className="border p-3 text-right uppercase">Total Retours:</td>
                                            <td className="border p-3 text-right font-sans">{showReturnsModal.returns?.reduce((sum: number, r: any) => sum + r.total, 0).toLocaleString()} DZD</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto p-8 bg-gray-50/20">
                            {!showReturnsModal.returns || showReturnsModal.returns.length === 0 ? (
                                <div className="py-20 text-center text-gray-300 flex flex-col items-center gap-4">
                                    <ShoppingBag size={48} />
                                    <p className="font-black">لا توجد مرتجعات مسجلة لهذه الفاتورة</p>
                                </div>
                            ) : (
                                <div className="relative space-y-6 pr-4 border-r-2 border-orange-100 mr-2">
                                    {showReturnsModal.returns.map((r: any) => (
                                        <div key={r.id} className="relative">
                                            <div className="absolute top-2 -right-[23px] w-4 h-4 rounded-full bg-orange-600 border-4 border-white shadow-sm ring-2 ring-orange-100"></div>
                                            <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col gap-3 hover:shadow-xl transition-all group">
                                                <div className="flex justify-between items-center text-right" dir="rtl">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg font-black font-sans text-gray-900">{r.total.toLocaleString()} دج</span>
                                                        <button
                                                            onClick={() => {
                                                                const printContent = document.getElementById(`return-receipt-${r.id}`);
                                                                if (printContent) {
                                                                    const original = document.body.innerHTML;
                                                                    document.body.innerHTML = printContent.innerHTML;
                                                                    printDocument();
                                                                    document.body.innerHTML = original;
                                                                    window.location.reload();
                                                                }
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all shadow-md"
                                                        >
                                                            <Printer size={12} />
                                                            <span className="text-[10px] font-black uppercase">Imprimer</span>
                                                        </button>
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-400 font-sans tracking-tighter">#{r.orderNumber}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 justify-end" dir="rtl">
                                                    <span>{new Date(r.orderDate).toLocaleString('ar-DZ')}</span>
                                                    <Clock size={12} />
                                                </div>
                                                <div className="bg-orange-50/50 rounded-xl p-3 border border-orange-100/50">
                                                    <p className="text-[10px] font-black text-orange-800 mb-2 border-b border-orange-100 pb-1">السلع المسترجعة / PRODUITS RETOURNÉS</p>
                                                    <div className="space-y-1">
                                                        {r.items?.map((item: any, i: number) => (
                                                            <div key={i} className="flex justify-between items-center text-[11px] font-bold text-gray-600">
                                                                <span className="font-sans">({item.quantity}) x {item.unitPrice.toLocaleString()} دج</span>
                                                                <span className="text-gray-900">{item.product?.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Hidden Individual Return Template (French) */}
                                                <div id={`return-receipt-${r.id}`} className="hidden">
                                                    <div className="p-10 font-sans text-left" dir="ltr">
                                                        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                                                            <div>
                                                                <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase">BON DE RETOUR</h1>
                                                                <p className="text-gray-500 font-bold">Réf: {r.orderNumber}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xl font-black text-blue-600">SKR Stock</p>
                                                                <p className="text-[10px] font-bold text-gray-400 italic">Matériaux de Construction</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-8">
                                                            <div className="flex justify-between border-b border-gray-100 py-4">
                                                                <span className="text-gray-500 font-bold uppercase text-xs">Date:</span>
                                                                <span className="font-black">{new Date(r.orderDate).toLocaleString('fr-FR')}</span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-gray-100 py-4">
                                                                <span className="text-gray-500 font-bold uppercase text-xs">Client/Fournisseur:</span>
                                                                <span className="font-black">{showReturnsModal.customerName}</span>
                                                            </div>
                                                            <div className="mt-6">
                                                                <p className="font-black text-gray-900 border-b border-gray-200 pb-2 mb-4 uppercase text-xs">Articles Retournés:</p>
                                                                <table className="w-full text-left">
                                                                    <thead>
                                                                        <tr className="text-[10px] font-black text-gray-400 uppercase">
                                                                            <th>Désignation</th>
                                                                            <th className="text-center">Qté</th>
                                                                            <th className="text-right">Total</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="text-sm">
                                                                        {r.items?.map((item: any, i: number) => (
                                                                            <tr key={i} className="border-b border-gray-50">
                                                                                <td className="py-2 font-bold">{item.product?.name}</td>
                                                                                <td className="py-2 text-center font-sans">{item.quantity}</td>
                                                                                <td className="py-2 text-right font-black font-sans">{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            <div className="bg-orange-600 text-white p-8 rounded-3xl mt-10 text-center shadow-2xl shadow-orange-200">
                                                                <p className="text-xs font-bold opacity-60 mb-2 uppercase tracking-widest">Valeur du Retour</p>
                                                                <p className="text-5xl font-black font-sans">{r.total.toLocaleString()} DZD</p>
                                                                <p className="mt-4 text-[10px] font-bold italic opacity-50 uppercase tracking-widest font-sans">
                                                                    Somme arrêtée à: {numberToFrenchWords(r.total)} Dinars Algériens
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-20 mt-20 text-center">
                                                            <div className="border-t-2 border-gray-900 pt-4 font-black text-gray-900 uppercase text-xs">Cachet et Signature</div>
                                                            <div className="border-t-2 border-gray-900 pt-4 font-black text-gray-900 uppercase text-xs">Signature</div>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* INVOICE VIEW MODAL (PRINT-READY) */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-[110] bg-gray-900/60 backdrop-blur-sm flex justify-center p-4 md:p-8 overflow-y-auto font-tajawal rtl" dir="rtl">
                    <div className="relative w-full max-w-4xl animate-in zoom-in-95 duration-300">

                        <div className="absolute top-4 left-4 flex gap-2 print:hidden no-print">
                            <button 
                                onClick={() => {
                                    const printContent = document.getElementById("invoice-print-area");
                                    if (printContent) {
                                        const original = document.body.innerHTML;
                                        document.body.innerHTML = printContent.innerHTML;
                                        printDocument();
                                        document.body.innerHTML = original;
                                        window.location.reload();
                                    }
                                }} 
                                className="bg-blue-600 text-white p-3 rounded-xl shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <Printer size={20} />
                                <span className="font-black text-xs uppercase">Imprimer</span>
                            </button>
                            <button onClick={() => setSelectedInvoice(null)} className="bg-white text-gray-900 p-3 rounded-xl shadow-xl hover:scale-105 transition-all"><X size={20} /></button>
                        </div>

                        <div id="invoice-print-area" className="bg-white shadow-2xl p-6 md:p-12 min-h-[1056px] text-gray-900 border border-gray-100">
                            <div className="text-center mb-10 border-b-2 border-gray-900 pb-6">
                                <h1 className="text-4xl font-black text-gray-900 tracking-wide uppercase">مخــزونـي</h1>
                                <p className="text-gray-600 text-lg font-medium mt-1">لتجارة مواد البناء والتوريدات العامة</p>
                                <div className="absolute top-0 right-0 hidden md:block opacity-10"><Store size={80} /></div>
                            </div>

                            <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
                                <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl flex-1 w-full order-2 md:order-1">
                                    <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tighter uppercase">
                                        {selectedInvoice.invoiceNumber.startsWith('PUR') ? 'Bon de Réception' : 'Facture de Vente'}
                                    </h2>
                                    <p className="text-sm font-bold text-gray-600 mb-1">{selectedInvoice.invoiceNumber.startsWith('PUR') ? 'N° Bon:' : 'N° Facture:'} <span className="text-gray-900 font-sans" dir="ltr">{selectedInvoice.invoiceNumber}</span></p>
                                    <p className="text-sm font-bold text-gray-600">Date: <span className="text-gray-900 font-sans">{formatDate(selectedInvoice.date)}</span></p>
                                    {selectedInvoice.dueDate && (
                                        <p className="text-sm font-bold text-red-600 mt-2">Échéance: <span className="font-sans">{formatDate(selectedInvoice.dueDate)}</span></p>
                                    )}
                                </div>
                                <div className="border-l-4 border-blue-600 pl-5 flex-1 w-full order-1 md:order-2 text-left" dir="ltr">
                                    <p className="text-xs font-black text-blue-600 mb-1 uppercase tracking-widest">
                                        {selectedInvoice.invoiceNumber.startsWith('PUR') ? 'FOURNISSEUR:' : 'CLIENT:'}
                                    </p>
                                    <p className="text-xl font-black text-gray-900 leading-tight">{selectedInvoice.customerName}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {selectedInvoice.projectName && <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Projet: {selectedInvoice.projectName}</span>}
                                        {selectedInvoice.customerPhone && <span className="text-xs font-bold bg-gray-50 text-gray-500 px-2 py-0.5 rounded font-sans" dir="ltr">{selectedInvoice.customerPhone}</span>}
                                    </div>
                                </div>
                            </div>

                            <table className="w-full text-left border-collapse mb-8" dir="ltr">
                                <thead className="bg-gray-900 text-white">
                                    <tr>
                                        <th className="px-4 py-3 font-bold w-12 text-center rounded-tl-lg">#</th>
                                        <th className="px-4 py-3 font-bold">Désignation</th>
                                        <th className="px-4 py-3 font-bold text-center w-24">Qté</th>
                                        <th className="px-4 py-3 font-bold text-center w-32">{selectedInvoice.invoiceNumber.startsWith('PUR') ? 'P. Achat' : 'P. Unitaire'}</th>
                                        <th className="px-4 py-3 font-bold text-right w-36 rounded-tr-lg">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-800">
                                    {selectedInvoice.order.items.map((item: any, idx: number) => {
                                        const isReturned = item.returnedQuantity > 0;
                                        return (
                                            <tr key={idx} className={`border-b border-gray-200 hover:bg-gray-50 ${isReturned ? 'bg-red-50/30' : ''}`}>
                                                <td className="px-4 py-4 text-center text-gray-400 font-sans">{idx + 1}</td>
                                                <td className="px-4 py-4 font-bold text-left">
                                                    <div>{item.product.name}</div>
                                                    {isReturned && (
                                                        <div className="text-[10px] text-red-500 font-black">Retour: {item.returnedQuantity} unités</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-center font-bold font-sans">
                                                    {isReturned ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-gray-400 line-through text-xs">{item.quantity}</span>
                                                            <span className="text-gray-900">{item.quantity - item.returnedQuantity}</span>
                                                        </div>
                                                    ) : (
                                                        item.quantity
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-center font-bold font-sans">{item.unitPrice.toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-black text-gray-900 font-sans">
                                                    {((item.quantity - item.returnedQuantity) * item.unitPrice).toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="h-40"><td colSpan={5}></td></tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} className="pt-6">
                                            <div className="bg-gray-50 border-l-4 border-gray-900 p-4 text-left">
                                                <p className="text-xs font-bold text-gray-500 mb-1">Arrêté la présente facture à la somme de:</p>
                                                <p className="font-black text-gray-900 uppercase italic text-xs">{numberToFrenchWords(selectedInvoice.total)} Dinars Algériens</p>
                                            </div>
                                        </td>
                                        <td colSpan={2} className="pt-6">
                                            <div className="bg-gray-900 text-white p-6 rounded-b-xl flex flex-col items-end shadow-xl">
                                                <div className="flex justify-between w-full opacity-60 text-xs mb-2">
                                                    <span>Total Original:</span>
                                                    <span className="font-sans">{(selectedInvoice.originalTotal || 0).toLocaleString()}</span>
                                                </div>
                                                {selectedInvoice.returnsValue > 0 && (
                                                    <div className="flex justify-between w-full text-red-400 text-xs mb-2 font-black bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                                        <span>Retours (-):</span>
                                                        <span className="font-sans">- {selectedInvoice.returnsValue.toLocaleString()} DZD</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between w-full opacity-90 text-sm mb-2 font-black pt-2 border-t border-white/10">
                                                    <span>Total Net:</span>
                                                    <span className="font-sans">{selectedInvoice.total.toLocaleString()} DZD</span>
                                                </div>
                                                <div className="flex justify-between w-full opacity-60 text-xs mb-4">
                                                    <span>Montant Payé:</span>
                                                    <span className="font-sans">{selectedInvoice.paid.toLocaleString()}</span>
                                                </div>
                                                <div className="w-full h-px bg-white/10 mb-4"></div>
                                                <span className="text-sm font-bold opacity-70">
                                                    {selectedInvoice.remaining < 0 ? 'Crédit Client (Rendu)' : 'Reste à Payer'}
                                                </span>
                                                <span className={`text-3xl font-black font-sans leading-none ${selectedInvoice.remaining < 0 ? 'text-purple-400' : 'text-red-400'}`}>
                                                    {Math.abs(selectedInvoice.remaining).toLocaleString()} DZD
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="grid grid-cols-2 gap-12 mt-20 px-10 text-center">
                                <div className="font-black text-gray-900 border-t-2 border-gray-900 pt-8 uppercase text-xs tracking-widest">Cachet et Signature</div>
                                <div className="font-black text-gray-900 border-t-2 border-gray-900 pt-8 uppercase text-xs tracking-widest">{selectedInvoice.invoiceNumber.startsWith('PUR') ? 'Réceptionnaire' : 'Client'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
