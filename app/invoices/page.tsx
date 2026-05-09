'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, FileText, Printer, Eye, Download, Filter,
    CheckCircle, Clock, AlertCircle, ShoppingBag, X,
    Store, CreditCard, History, ChevronLeft, Calendar,
    User, ArrowUpRight, ArrowDownLeft, MoreVertical, Banknote, RotateCcw,
    FileSpreadsheet, ChevronDown, Check, Building2
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

interface Invoice {
    id: number;
    invoiceNumber: string;
    invoiceDate: string;
    customerName?: string;
    supplierName?: string;
    customer?: any;
    supplier?: any;
    subtotal: number;
    tax: number;
    total: number;
    amountPaid: number;
    status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE' | 'CREDIT';
    type: 'SALE' | 'PURCHASE';
    dueDate?: string;
    order: any;
    payments?: Payment[];
    remaining: number;
    paid: number;
}

interface Payment {
    id: number;
    amount: number;
    paymentDate: string;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
    reference?: string;
    notes?: string;
    isReturn?: boolean;
    chequeNumber?: string;
    bankName?: string;
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<any>(null);

    // Filters
    const [invoiceType, setInvoiceType] = useState<'SALE' | 'PURCHASE'>('SALE');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE' | 'CREDIT'>('ALL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | 'GUEST' | 'FIDEL'>('ALL');
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(40);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        if (activeDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown]);

    // Modals
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState<Invoice | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState<Invoice | null>(null);
    const [showReturnsHistoryModal, setShowReturnsHistoryModal] = useState<any | null>(null);
    const [showReturnModal, setShowReturnModal] = useState<any | null>(null);

    // Forms
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
    const [chequeNumber, setChequeNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});

    useEffect(() => {
        fetchInvoices();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) setSettings(await res.json());
        } catch (e) {
            console.error('Error fetching settings:', e);
        }
    };

    const fetchInvoices = async () => {
        try {
            const response = await fetch('/api/invoices');
            if (response.ok) {
                const data = await response.json();
                setInvoices(data);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentHistory = async (invoice: Invoice) => {
        try {
            const response = await fetch(`/api/invoices/${invoice.id}/payments`);
            if (response.ok) {
                const data = await response.json();
                const updatedInvoice = { ...invoice, payments: data };
                setShowHistoryModal(updatedInvoice);
                setInvoices(prev => prev.map(inv => 
                    inv.id === invoice.id ? updatedInvoice : inv
                ));
            }
        } catch (error) {
            console.error('Error fetching payment history:', error);
        }
    };

    const fetchReturnsHistory = async (invoiceId: number) => {
        try {
            const response = await fetch(`/api/invoices/${invoiceId}/returns`);
            if (response.ok) {
                const data = await response.json();
                setShowReturnsHistoryModal(data);
            }
        } catch (error) {
            console.error('Error fetching returns history:', error);
        }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showPaymentModal || paymentAmount <= 0) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: showPaymentModal.id,
                    customerId: showPaymentModal.customerId || showPaymentModal.customer?.id,
                    supplierId: showPaymentModal.supplierId || showPaymentModal.supplier?.id,
                    amount: paymentAmount,
                    paymentMethod,
                    chequeNumber: (paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') ? chequeNumber : '',
                    bankName: (paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') ? bankName : '',
                    notes: paymentNotes
                }),
            });

            if (response.ok) {
                fetchInvoices();
                setShowPaymentModal(null);
                setPaymentAmount(0);
                setPaymentMethod('CASH');
                setChequeNumber('');
                setBankName('');
                setPaymentNotes('');
            }
        } catch (error) {
            console.error('Error recording payment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRefundExcess = async (inv: any) => {
        const remaining = Number(inv.remaining ?? (inv.total - (inv.paid || 0)));
        if (remaining >= 0) {
            alert('لا يوجد رصيد زائد لإرجاعه');
            return;
        }
        setShowRefundConfirmModal(inv);
    };

    const confirmRefund = async () => {
        const inv = showRefundConfirmModal;
        if (!inv) return;

        const remaining = Number(inv.remaining ?? (inv.total - (inv.paid || 0)));
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: inv.id,
                    customerId: inv.customerId || inv.customer?.id,
                    supplierId: inv.supplierId || inv.supplier?.id,
                    amount: remaining, 
                    paymentMethod: 'CASH',
                    notes: 'إرجاع الرصيد الزائد نقداً (تصفية حساب)'
                })
            });

            if (res.ok) {
                setShowRefundConfirmModal(null);
                setShowRefundSuccessModal(true);
                fetchInvoices();
                if (showHistoryModal && showHistoryModal.id === inv.id) {
                    fetchPaymentHistory(inv);
                }
            } else {
                const err = await res.json();
                alert(err.error || 'فشلت عملية الإرجاع');
            }
        } catch (e) {
            console.error('Refund error:', e);
            alert('خطأ في الاتصال بالخادم');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReturnQtyChange = (itemId: number, val: number, max: number) => {
        setReturnQtys(prev => ({ ...prev, [itemId]: Math.max(0, Math.min(val, max)) }));
    };

    const handleReturnAll = () => {
        if (!showReturnModal) return;
        const newQtys: Record<number, number> = {};
        showReturnModal.items.forEach((item: any) => {
            const maxReturnable = item.quantity - (item.returnedQuantity || 0);
            if (maxReturnable > 0) {
                newQtys[item.id] = maxReturnable;
            }
        });
        setReturnQtys(newQtys);
    };

    const [lastReturnResult, setLastReturnResult] = useState<any | null>(null);
    const [showReturnSuccessModal, setShowReturnSuccessModal] = useState(false);
    const [showRefundConfirmModal, setShowRefundConfirmModal] = useState<any | null>(null);
    const [showRefundSuccessModal, setShowRefundSuccessModal] = useState(false);

    const handleReturnSubmit = async () => {
        if (!showReturnModal) return;
        const selectedItems = showReturnModal.items.filter((i: any) => (returnQtys[i.id] || 0) > 0);
        if (selectedItems.length === 0) {
            alert('يجب اختيار كمية مرتجعة واحدة على الأقل');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/orders/${showReturnModal.id}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: selectedItems.map((i: any) => ({
                        orderItemId: i.id,
                        returnQty: returnQtys[i.id]
                    }))
                })
            });
            if (res.ok) {
                const result = await res.json();
                setLastReturnResult(result);
                setShowReturnModal(null);
                setShowReturnSuccessModal(true);
            } else {
                const err = await res.json();
                alert(`❌ خطأ: ${err.error}`);
            }
        } catch (e) {
            alert('حدث خطأ في الاتصال');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice => {
            const matchesType = invoiceType === 'SALE' 
                ? (invoice.type === 'INVOICE' || invoice.type === 'PROVISIONAL')
                : invoice.type === 'PURCHASE_INVOICE';
            const matchesSearch = !searchTerm || 
                invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (invoice.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (invoice.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (invoice.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (invoice.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = (() => {
                if (statusFilter === 'ALL') return true;
                const r = Number(invoice.remaining ?? (invoice.total - (invoice.paid || 0)));
                const orig = invoice.total || 0;
                const overdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && r > 0;

                if (statusFilter === 'PAID')    return r === 0;
                if (statusFilter === 'CREDIT')  return r < 0;
                if (statusFilter === 'PARTIAL') return r > 0 && r < orig;
                if (statusFilter === 'UNPAID')  return r >= orig;
                if (statusFilter === 'OVERDUE') return !!overdue;

                return false;
            })();
            
            let matchesDate = true;
            if (dateRange.start && dateRange.end) {
                const invoiceDate = new Date(invoice.invoiceDate);
                const start = new Date(dateRange.start);
                const end = new Date(dateRange.end);
                matchesDate = invoiceDate >= start && invoiceDate <= end;
            }

            const matchesCustomerType = invoiceType !== 'SALE' || customerTypeFilter === 'ALL' || 
                (customerTypeFilter === 'GUEST' ? (!invoice.customerId && !invoice.customer?.id) : !!invoice.customer?.id);

            return matchesType && matchesSearch && matchesStatus && matchesDate && matchesCustomerType;
        }).sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
    }, [invoices, invoiceType, searchTerm, statusFilter, dateRange, customerTypeFilter]);

    const currentInvoices = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredInvoices, currentPage, itemsPerPage]);

    const handleExportExcel = () => {
        const data = filteredInvoices.map(inv => ({
            'رقم الفاتورة': inv.invoiceNumber,
            'التاريخ': formatDate(inv.invoiceDate),
            'الجهة': inv.type === 'SALE' ? (inv.customer?.name || inv.customerName) : (inv.supplier?.name || inv.supplierName),
            'المبلغ الإجمالي': inv.total,
            'المبلغ المدفوع': inv.paid,
            'المبلغ المتبقي': inv.remaining,
            'الحالة': inv.remaining === 0 ? 'خالصة' : 
                     inv.remaining < 0 ? 'رصيد زائد' : 
                     inv.remaining < inv.total ? 'جزئية' : 'غير مدفوعة'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Invoices");
        XLSX.writeFile(wb, `فواتير_${invoiceType === 'SALE' ? 'المبيعات' : 'المشتريات'}_${new Date().toLocaleDateString()}.xlsx`);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const tableData = filteredInvoices.map(inv => [
            inv.remaining === 0 ? 'خالصة' : inv.remaining < 0 ? 'رصيد زائد' : 'غير خالصة',
            inv.remaining.toLocaleString(),
            inv.total.toLocaleString(),
            invoiceType === 'SALE' ? (inv.customer?.name || inv.customerName) : (inv.supplier?.name || inv.supplierName),
            formatDate(inv.invoiceDate),
            inv.invoiceNumber
        ]);

        autoTable(doc, {
            head: [['الحالة', 'المتبقي', 'الإجمالي', 'الجهة', 'التاريخ', 'رقم الفاتورة']],
            body: tableData,
            styles: { font: 'Amiri', halign: 'right' },
            headStyles: { fillStyle: 'DF', fillColor: [139, 92, 246] }
        });

        doc.save(`فواتير_${invoiceType === 'SALE' ? 'المبيعات' : 'المشتريات'}_${new Date().toLocaleDateString()}.pdf`);
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;

    return (
        <div className="font-tajawal min-h-screen bg-white text-gray-900 flex flex-col gap-4 print:p-0 print:bg-white" dir="rtl">
            {/* List Header */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 print:hidden p-4 md:p-6 pb-0">
                <PageHeader
                    title="الفواتير والسندات"
                    subtitle="إدارة فواتير البيع، الشراء، وسندات التسليم"
                    Icon={FileText}
                />
                <div className="flex gap-2 w-full lg:w-auto justify-end shrink-0">
                    <div className="relative group">
                        <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-black text-xs shadow-sm flex items-center gap-2 hover:bg-gray-50">
                            <Download size={14} className="text-blue-600"/> تصدير
                        </button>
                        <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button onClick={handleExportExcel} className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-xs font-bold text-gray-700 flex items-center gap-2 border-b border-gray-50 transition-colors">
                                <FileSpreadsheet size={14} className="text-emerald-600"/> Excel (.xlsx)
                            </button>
                            <button onClick={handleExportPDF} className="w-full text-right px-4 py-3 hover:bg-rose-50 text-xs font-bold text-gray-700 flex items-center gap-2 transition-colors">
                                <FileText size={14} className="text-rose-600"/> PDF (.pdf)
                            </button>
                        </div>
                    </div>
                    <button 
                        onClick={() => printDocument()}
                        className="bg-[#8b5cf6] text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-[#7c3aed] transition-all shadow-lg active:scale-95"
                    >
                        <Printer size={16} /> طباعة القائمة
                    </button>
                </div>
            </div>

            {/* Tabs Header */}
            <div className="flex items-center gap-6 no-print mb-2 pb-1 px-4 md:px-6 pt-0 mt-[-8px]">
                <button
                    onClick={() => setInvoiceType('SALE')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 ${invoiceType === 'SALE' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    فواتير المبيعات
                </button>
                <button
                    onClick={() => setInvoiceType('PURCHASE')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 ${invoiceType === 'PURCHASE' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    فواتير المشتريات
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm flex flex-col gap-4 print:hidden mx-4 md:mx-6" ref={dropdownRef}>
                <div className="flex flex-col lg:flex-row gap-3 items-center">
                    <div className="relative flex-1 min-w-[300px] group">
                        <input 
                            type="text" 
                            placeholder={invoiceType === 'SALE' ? "بحث برقم فاتورة، اسم العميل..." : "بحث برقم فاتورة، اسم المورد..."}
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full h-[52px] bg-white border border-gray-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10 rounded-2xl pr-14 pl-4 text-sm font-bold transition-all outline-none shadow-sm"
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-[#8b5cf6] rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none">
                            <Search size={20} strokeWidth={3} />
                        </div>
                    </div>

                    <div className="relative group min-w-[160px]">
                        <button
                            onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                            className="w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                        >
                            <div className="bg-[#8b5cf6]/10 p-1.5 rounded-lg text-[#8b5cf6]">
                                <Filter size={14} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">حالة الفاتورة</p>
                                <p className="text-[10px] font-black text-gray-900 mt-1">
                                    {statusFilter === 'ALL' ? 'الكل' : 
                                     statusFilter === 'PAID' ? 'خالص بالكامل' : 
                                     statusFilter === 'PARTIAL' ? 'مدفوع جزئي' : 
                                     statusFilter === 'UNPAID' ? 'غير مدفوع' : 
                                     statusFilter === 'CREDIT' ? 'رصيد زائد' :
                                     statusFilter === 'OVERDUE' ? '🚨 متجاوزة' : 'الكل'}
                                </p>
                            </div>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${activeDropdown === 'status' ? 'rotate-180' : ''}`} />
                        </button>
                        {activeDropdown === 'status' && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button onClick={() => { setStatusFilter('ALL'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-violet-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">الكل</button>
                                <button onClick={() => { setStatusFilter('UNPAID'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-red-50 text-[10px] font-black text-red-600 border-b border-gray-50 transition-colors">غير مدفوع</button>
                                <button onClick={() => { setStatusFilter('PARTIAL'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-amber-50 text-[10px] font-black text-amber-600 border-b border-gray-50 transition-colors">مدفوع جزئي</button>
                                <button onClick={() => { setStatusFilter('PAID'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-[10px] font-black text-emerald-600 border-b border-gray-50 transition-colors">خالص بالكامل</button>
                                <button onClick={() => { setStatusFilter('CREDIT'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-purple-50 text-[10px] font-black text-purple-600 border-b border-gray-50 transition-colors">رصيد زائد</button>
                                <button onClick={() => { setStatusFilter('OVERDUE'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-red-600 hover:text-white text-[10px] font-black text-red-600 transition-colors">🚨 متجاوزة</button>
                            </div>
                        )}
                    </div>

                    {invoiceType === 'SALE' && (
                        <div className="relative group min-w-[160px]">
                            <button
                                onClick={() => setActiveDropdown(activeDropdown === 'customer' ? null : 'customer')}
                                className="w-full h-[52px] flex items-center gap-3 bg-[#fbb815] border border-[#f59e0b] rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                            >
                                <div className="bg-white/20 p-1.5 rounded-lg text-white">
                                    <User size={14} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-white/80 uppercase tracking-tighter leading-none">نوع العميل</p>
                                    <p className="text-[10px] font-black text-white mt-1">
                                        {customerTypeFilter === 'ALL' ? 'الكل (الزبائن)' : customerTypeFilter === 'FIDEL' ? 'زبائن مسجلون' : 'عابرون'}
                                    </p>
                                </div>
                                <ChevronDown size={14} className={`text-white/60 transition-transform ${activeDropdown === 'customer' ? 'rotate-180' : ''}`} />
                            </button>
                            {activeDropdown === 'customer' && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button onClick={() => { setCustomerTypeFilter('ALL'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-amber-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">الكل (الزبائن)</button>
                                    <button onClick={() => { setCustomerTypeFilter('FIDEL'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-amber-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">زبائن مسجلون</button>
                                    <button onClick={() => { setCustomerTypeFilter('GUEST'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-amber-50 text-[10px] font-black text-gray-700 transition-colors">عابرون</button>
                                </div>
                            )}
                        </div>
                    )}

                    <DateRangePicker 
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onChange={(start, end) => { setDateRange({ start, end }); setCurrentPage(1); }}
                    />
                </div>
            </div>

            <div className="px-4 md:px-6">
                <InvoicesTable 
                    invoices={currentInvoices}
                    loading={loading}
                    invoiceType={invoiceType}
                    setSelectedInvoice={setSelectedInvoice}
                    setShowPaymentModal={setShowPaymentModal}
                    setPaymentAmount={setPaymentAmount}
                    handleRefundExcess={handleRefundExcess}
                    setShowHistoryModal={setShowHistoryModal}
                    fetchPaymentHistory={fetchPaymentHistory}
                    setShowReturnsModal={setShowReturnsHistoryModal}
                    fetchReturnsHistory={fetchReturnsHistory}
                    setShowReturnProcessModal={(inv) => {
                        const ord = inv.order;
                        if (ord) {
                            const init: any = {};
                            ord.items.forEach((it: any) => { init[it.id] = 0; });
                            setReturnQtys(init);
                            setShowReturnModal(ord);
                        }
                    }}
                />

                {/* Pagination */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white px-8 py-6 rounded-[2rem] border border-gray-100 shadow-sm print:hidden mt-6 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100">
                            <FileText size={18} className="text-[#8b5cf6]" />
                        </div>
                        <p className="text-xs font-black text-gray-500">
                            عرض <span className="text-gray-900 font-sans">{(currentPage - 1) * itemsPerPage + 1}</span> إلى <span className="text-gray-900 font-sans">{Math.min(currentPage * itemsPerPage, filteredInvoices.length)}</span> من أصل <span className="text-[#8b5cf6] font-sans">{filteredInvoices.length}</span> فاتورة
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100">
                        <button 
                            onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === 1}
                            className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 rounded-xl disabled:opacity-30 transition-all border border-gray-100 shadow-sm disabled:cursor-not-allowed group"
                        >
                            <ChevronDown className="rotate-90 group-active:scale-90 transition-transform" size={18} />
                        </button>
                        
                        <div className="flex items-center gap-1 px-4">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">الصفحة</span>
                            <span className="text-sm font-black text-[#8b5cf6] font-sans px-2">{currentPage}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">من</span>
                            <span className="text-sm font-black text-gray-900 font-sans px-2">{Math.ceil(filteredInvoices.length / itemsPerPage) || 1}</span>
                        </div>

                        <button 
                            onClick={() => { setCurrentPage(prev => prev + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage * itemsPerPage >= filteredInvoices.length}
                            className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 rounded-xl disabled:opacity-30 transition-all border border-gray-100 shadow-sm disabled:cursor-not-allowed group"
                        >
                            <ChevronDown className="-rotate-90 group-active:scale-90 transition-transform" size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Invoice Detail Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="bg-[#8b5cf6] p-3 rounded-2xl text-white shadow-lg shadow-violet-200"><FileText size={24} /></div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">تفاصيل الفاتورة</h2>
                                    <p className="text-gray-500 text-xs font-bold tracking-tight">رقم: {selectedInvoice.invoiceNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { const el = document.getElementById('inv-print-area'); if(el){const o=document.body.innerHTML;document.body.innerHTML=el.innerHTML;window.print();document.body.innerHTML=o;window.location.reload();}}} className="flex items-center gap-2 px-6 py-3 bg-[#8b5cf6] text-white rounded-2xl font-black text-sm hover:bg-[#7c3aed] transition-all shadow-lg active:scale-95"><Printer size={18} /> طباعة الفاتورة</button>
                                <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 transition-all"><X size={24} /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
                            <div id="inv-print-area" className="bg-white shadow-xl mx-auto rounded-xl p-8">
                                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
                                    <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl flex-1">
                                        <h2 className="text-xl font-black text-gray-900 mb-2 uppercase">Facture de {invoiceType === 'SALE' ? 'Vente' : 'Achat'}</h2>
                                        <p className="text-sm font-bold text-gray-600">N° <span className="font-sans" dir="ltr">{selectedInvoice.invoiceNumber}</span></p>
                                        <p className="text-sm font-bold text-gray-600">Date: <span className="font-sans">{formatDate(selectedInvoice.invoiceDate)}</span></p>
                                    </div>
                                    <div className="border-r-4 border-[#8b5cf6] pr-5 flex-1 text-right">
                                        <p className="text-xs font-black text-[#8b5cf6] mb-1 uppercase tracking-widest">{invoiceType === 'SALE' ? 'العميل:' : 'المورد:'}</p>
                                        <p className="text-xl font-black text-gray-900">{invoiceType === 'SALE' ? (selectedInvoice.customer?.name || selectedInvoice.customerName || 'عابر') : (selectedInvoice.supplier?.name || selectedInvoice.customerName || 'مورد')}</p>
                                        {selectedInvoice.order?.project?.name && <span className="text-xs font-bold bg-violet-50 text-violet-700 px-2 py-0.5 rounded mt-1 inline-block">مشروع: {selectedInvoice.order.project.name}</span>}
                                    </div>
                                </div>
                                <table className="w-full text-left border-collapse mb-6" dir="ltr">
                                    <thead className="bg-gray-900 text-white">
                                        <tr>
                                            <th className="px-4 py-3 font-bold w-10 text-center">#</th>
                                            <th className="px-4 py-3 font-bold">Désignation</th>
                                            <th className="px-4 py-3 font-bold text-center w-20">Qté</th>
                                            <th className="px-4 py-3 font-bold text-center w-28">P.U.</th>
                                            <th className="px-4 py-3 font-bold text-right w-32">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedInvoice.order?.items || []).map((item: any, idx: number) => {
                                            const ret = item.returnedQuantity || 0;
                                            const net = item.quantity - ret;
                                            return (
                                                <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 ${ret > 0 ? 'bg-red-50/20' : ''}`}>
                                                    <td className="px-4 py-3 text-center text-gray-400 font-sans text-sm">{idx + 1}</td>
                                                    <td className="px-4 py-3 font-bold text-sm">
                                                        {item.product?.name}
                                                        {ret > 0 && <div className="text-[10px] text-red-500 font-black">Retour: {ret}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold font-sans text-sm">
                                                        {ret > 0 ? <><span className="line-through text-gray-400 text-xs mr-1">{item.quantity}</span>{net}</> : item.quantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold font-sans text-sm">{(item.unitPrice||0).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right font-black font-sans text-sm">{(net*(item.unitPrice||0)).toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3} className="pt-4 align-top">
                                                <div className="bg-gray-50 border-l-4 border-gray-900 p-4 text-left">
                                                    <p className="text-xs font-bold text-gray-500 mb-1">Arrêté la présente facture à la somme de:</p>
                                                    <p className="font-black text-gray-900 italic text-xs uppercase">{numberToFrenchWords(selectedInvoice.total||0)} Dinars Algériens</p>
                                                </div>
                                            </td>
                                            <td colSpan={2} className="pt-4">
                                                <div className="bg-gray-900 text-white p-5 rounded-xl flex flex-col items-end">
                                                    <div className="flex justify-between w-full opacity-60 text-xs mb-2"><span>Total:</span><span className="font-sans">{(selectedInvoice.total||0).toLocaleString()} DZD</span></div>
                                                    <div className="flex justify-between w-full opacity-60 text-xs mb-3"><span>Payé:</span><span className="font-sans">{(selectedInvoice.paid||0).toLocaleString()}</span></div>
                                                    <div className="w-full h-px bg-white/10 mb-3"></div>
                                                    <span className="text-xs font-bold opacity-70">{(selectedInvoice.remaining||0) < 0 ? 'Crédit (Rendu)' : 'Reste à Payer'}</span>
                                                    <span className={`text-2xl font-black font-sans ${(selectedInvoice.remaining||0) < 0 ? 'text-purple-400' : 'text-red-400'}`}>{Math.abs(selectedInvoice.remaining||0).toLocaleString()} DZD</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-200">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">تسجيل دفعة</h2>
                                    <p className="text-gray-500 text-xs font-bold tracking-tight">الفاتورة: {showPaymentModal.invoiceNumber}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPaymentModal(null)} className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 transition-all"><X size={20} /></button>
                        </div>
                        <form onSubmit={handlePayment} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 pr-2">المبلغ المدفوع (دج)</label>
                                <input 
                                    type="number" 
                                    value={paymentAmount}
                                    onClick={e => (e.target as HTMLInputElement).select()}
                                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                    className="w-full h-14 bg-gray-50 border border-gray-200 rounded-2xl px-6 text-lg font-black text-emerald-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-left"
                                    required
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 pr-2">طريقة الدفع</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['CASH', 'CHEQUE', 'BANK_TRANSFER'].map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setPaymentMethod(method as any)}
                                            className={`p-4 rounded-2xl border-2 transition-all font-black text-[10px] ${paymentMethod === method ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 text-gray-400'}`}
                                        >
                                            {method === 'CASH' ? 'نقداً' : method === 'CHEQUE' ? 'شيك' : 'تحويل'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {(paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') && (
                                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                                    <div className="relative">
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                            <FileText size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder={paymentMethod === 'CHEQUE' ? "رقم الشيك البنكي" : "رقم الحوالة / المرجع"} 
                                            value={chequeNumber} 
                                            onChange={e => setChequeNumber(e.target.value)} 
                                            className="w-full h-12 bg-white border border-gray-200 rounded-xl pr-12 pl-4 text-sm font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none shadow-sm" 
                                        />
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 group-focus-within:text-emerald-600 transition-colors pointer-events-none">
                                            <Building2 size={18} />
                                        </div>
                                        <select 
                                            value={bankName} 
                                            onChange={e => setBankName(e.target.value)} 
                                            className="w-full h-12 bg-white border border-gray-200 rounded-xl pr-12 pl-10 text-sm font-black appearance-none outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all cursor-pointer shadow-sm hover:border-gray-300"
                                        >
                                            <option value="">اختر البنك أو المؤسسة المالية...</option>
                                            <option value="Algérie Poste (بريد الجزائر)">Algérie Poste (بريد الجزائر)</option>
                                            <option value="BNA (البنك الوطني الجزائري)">BNA (البنك الوطني الجزائري)</option>
                                            <option value="CPA (القرض الشعبي الجزائري)">CPA (القرض الشعبي الجزائري)</option>
                                            <option value="BADR (الفلاحة والتنمية الريفية)">BADR (الفلاحة والتنمية الريفية)</option>
                                            <option value="BDL (بنك التنمية المحلية)">BDL (بنك التنمية المحلية)</option>
                                            <option value="CNEP (الصندوق الوطني للتوفير)">CNEP (الصندوق للتوفير والاحتياط)</option>
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
                                        </select>
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <button 
                                type="submit" 
                                disabled={
                                    isSubmitting || 
                                    paymentAmount <= 0 || 
                                    ((paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') && (!chequeNumber || !bankName))
                                } 
                                className="w-full h-14 bg-emerald-500 text-white rounded-2xl font-black hover:bg-emerald-600 shadow-lg disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <RotateCcw className="animate-spin" size={20} /> : 'تأكيد العملية'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="bg-gray-900 p-3 rounded-2xl text-white shadow-lg"><History size={24} /></div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">سجل المدفوعات</h2>
                                    <p className="text-gray-500 text-xs font-bold tracking-tight">الفاتورة: {showHistoryModal.invoiceNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { const el = document.getElementById('full-history-print'); if(el){const o=document.body.innerHTML;document.body.innerHTML=el.innerHTML;window.print();document.body.innerHTML=o;window.location.reload();}}} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-black text-xs hover:bg-gray-800 transition-all"><Printer size={14} /> طباعة السجل</button>
                                <button onClick={() => setShowHistoryModal(null)} className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 transition-all"><X size={20} /></button>
                            </div>
                        </div>
                        <div className="p-8 max-h-[60vh] overflow-y-auto">
                            {!showHistoryModal.payments || showHistoryModal.payments.length === 0 ? (
                                <div className="py-20 text-center text-gray-300 flex flex-col items-center gap-4"><CreditCard size={48} /><p className="font-black">لا توجد دفعات مسجلة</p></div>
                            ) : (
                                <div className="relative space-y-8 pr-4 border-r-2 border-gray-100 mr-2">
                                    {showHistoryModal.payments.map((p: any) => (
                                        <div key={p.id} className="relative">
                                            <div className={`absolute top-2 -right-[23px] w-4 h-4 rounded-full ${p.isReturn ? 'bg-orange-500' : (p.amount < 0 ? 'bg-purple-600' : 'bg-blue-600')} border-4 border-white shadow-sm ring-2`}></div>
                                            <div className={`${p.isReturn ? 'bg-orange-50/50 border-orange-100' : 'bg-gray-50 border-gray-100'} p-5 rounded-2xl border flex flex-col gap-2 hover:bg-white hover:shadow-lg transition-all`}>
                                                <div className="flex justify-between items-center" dir="rtl">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-lg font-black font-sans ${p.isReturn ? 'text-orange-600' : (p.amount < 0 ? 'text-purple-600' : 'text-gray-900')}`}>
                                                            {(p.isReturn || p.amount < 0) ? '-' : '+'}{Math.abs(p.amount).toLocaleString()} دج
                                                        </span>
                                                        <button onClick={() => { const el = document.getElementById(`receipt-${p.id}`); if(el){const o=document.body.innerHTML;document.body.innerHTML=el.innerHTML;window.print();document.body.innerHTML=o;window.location.reload();}}} className={`flex items-center gap-1.5 px-3 py-1.5 ${p.isReturn ? 'bg-orange-600' : (p.amount < 0 ? 'bg-purple-600' : 'bg-blue-600')} text-white rounded-lg text-[10px] font-black`}><Printer size={12} /> طباعة الوصل</button>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${p.isReturn ? 'text-orange-600 bg-orange-50' : (p.amount < 0 ? 'text-purple-600 bg-purple-50' : 'text-blue-600 bg-blue-50')}`}>
                                                        {p.isReturn ? 'DÉDUCTION RETOUR' : (p.amount < 0 ? 'Remboursement' : p.paymentMethod)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 justify-end" dir="rtl">
                                                    <span>{new Date(p.paymentDate).toLocaleString('ar-DZ')}</span>
                                                    <Clock size={12} />
                                                </div>
                                                <div className={`mt-1 p-2 rounded-lg border ${p.isReturn ? 'bg-orange-100/30 border-orange-200/50' : 'bg-white border-gray-100'} flex flex-col gap-1`} dir="rtl">
                                                    <span className={`text-[8px] font-black uppercase tracking-tighter ${p.isReturn ? 'text-orange-600' : 'text-gray-400'}`}>الوصف:</span>
                                                    <p className={`text-[11px] font-black ${p.isReturn ? 'text-orange-900' : 'text-gray-700'} leading-none mb-1`}>{p.notes || (p.amount < 0 ? 'إرجاع رصيد زائد للعميل' : 'تسديد دفعة مالية')}</p>
                                                    
                                                    {(p.paymentMethod === 'CHEQUE' || p.paymentMethod === 'BANK_TRANSFER') && (
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 pt-1 border-t border-gray-50">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[9px] text-gray-400 font-bold">الرقم:</span>
                                                                <span className="text-[10px] text-blue-600 font-black font-sans">{p.chequeNumber}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[9px] text-gray-400 font-bold">البنك:</span>
                                                                <span className="text-[10px] text-gray-700 font-black">{p.bankName}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {p.isReturn && p.items && (
                                                    <div className="mt-2 p-3 bg-orange-50 border border-orange-100 rounded-xl" dir="rtl">
                                                        <p className="text-[9px] font-black text-orange-800 mb-2 border-b border-orange-200 pb-1 uppercase tracking-tighter text-right">السلع المسترجعة / PRODUITS RETOURNÉS</p>
                                                        <div className="space-y-1">
                                                            {p.items.map((item: any, i: number) => (
                                                                <div key={i} className="flex justify-between items-center text-[10px] font-bold text-gray-600">
                                                                    <span className="font-sans">({item.quantity}) x {(item.unitPrice || 0).toLocaleString()} دج</span>
                                                                    <span className="text-gray-900">{item.product?.name}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Hidden Receipt */}
                                                <div id={`receipt-${p.id}`} className="hidden">
                                                    <div className="p-10 font-sans text-left" dir="ltr">
                                                        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                                                            <div><h1 className="text-3xl font-black text-gray-900 mb-2 uppercase">{p.amount < 0 ? 'REÇU DE REMBOURSEMENT' : 'REÇU DE PAIEMENT'}</h1><p className="text-gray-500 font-bold">Réf: {p.id}</p></div>
                                                            <div className="text-right"><p className="text-xl font-black text-blue-600">{settings?.storeName || 'مخزون'}</p></div>
                                                        </div>
                                                        <div className="space-y-6">
                                                            <div className="flex justify-between border-b border-gray-100 py-4"><span className="text-gray-500 font-bold uppercase text-xs">Date:</span><span className="font-black font-sans">{new Date(p.paymentDate).toLocaleString('fr-FR')}</span></div>
                                                            <div className="flex justify-between border-b border-gray-100 py-4"><span className="text-gray-500 font-bold uppercase text-xs">Facture:</span><span className="font-black">{showHistoryModal.invoiceNumber}</span></div>
                                                            <div className="flex justify-between border-b border-gray-100 py-4"><span className="text-gray-500 font-bold uppercase text-xs">Mode:</span><span className="font-black">{p.paymentMethod}</span></div>
                                                            {(p.paymentMethod === 'CHEQUE' || p.paymentMethod === 'BANK_TRANSFER') && (
                                                                <>
                                                                    <div className="flex justify-between border-b border-gray-100 py-4"><span className="text-gray-500 font-bold uppercase text-xs">{p.paymentMethod === 'CHEQUE' ? 'N° Chèque:' : 'N° Virement:'}</span><span className="font-black font-sans">{p.chequeNumber}</span></div>
                                                                    <div className="flex justify-between border-b border-gray-100 py-4"><span className="text-gray-500 font-bold uppercase text-xs">Banque:</span><span className="font-black">{p.bankName}</span></div>
                                                                </>
                                                            )}
                                                            <div className={`${p.amount < 0 ? 'bg-purple-600' : 'bg-gray-900'} text-white p-8 rounded-3xl mt-10 text-center shadow-2xl`}><p className="text-xs font-bold opacity-60 mb-2 tracking-widest uppercase">MONTANT</p><p className="text-5xl font-black font-sans">{Math.abs(p.amount).toLocaleString()} DZD</p><p className="mt-4 text-[10px] font-bold italic opacity-50 uppercase tracking-widest">Arrêté à la somme de: {numberToFrenchWords(Math.abs(p.amount))} Dinars Algériens</p></div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-20 mt-16 text-center"><div className="border-t-2 border-gray-900 pt-4 font-black uppercase text-xs">Cachet et Signature</div><div className="border-t-2 border-gray-900 pt-4 font-black uppercase text-xs">Signature Client</div></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-8 border-t border-gray-50 flex justify-between items-center bg-gray-50/30">
                            <div><p className="text-[10px] font-black text-gray-400 uppercase">إجمالي المحصل</p><p className="text-xl font-black text-green-600 font-sans">{showHistoryModal.paid.toLocaleString()} دج</p></div>
                            <div className="text-left">
                                <p className="text-[10px] font-black text-gray-400 uppercase">المتبقي</p>
                                <p className={`text-xl font-black font-sans ${(showHistoryModal.remaining||0) < 0 ? 'text-purple-600' : 'text-red-600'}`}>{Math.abs(showHistoryModal.remaining||0).toLocaleString()} دج</p>
                                {showHistoryModal.remaining < 0 && <button onClick={() => handleRefundExcess(showHistoryModal)} className="mt-2 text-[10px] font-black bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 shadow-md flex items-center gap-1 ml-auto"><Banknote size={12} /> إرجاع الفائض</button>}
                            </div>
                        </div>
                        {/* Hidden Full History */}
                        <div id="full-history-print" className="hidden">
                            <div className="p-10 font-sans text-left" dir="ltr">
                                <div className="flex justify-between items-center border-b-2 border-gray-900 pb-4 mb-6"><h1 className="text-2xl font-black uppercase">HISTORIQUE DES PAIEMENTS</h1><p className="text-xl font-black text-blue-600 uppercase">{settings?.storeName || 'مخزون'}</p></div>
                                <div className="mb-10 flex justify-between items-start"><div><p className="text-xs font-bold text-gray-400 uppercase">Client:</p><p className="text-xl font-black">{showHistoryModal.customer?.name || showHistoryModal.customerName || 'عابر'}</p><p className="text-sm font-bold text-gray-600 font-sans">Facture: {showHistoryModal.invoiceNumber}</p></div><div className="text-right"><p className="text-xs font-bold text-gray-400 uppercase">État actuel:</p><p className={`text-lg font-black font-sans ${showHistoryModal.remaining < 0 ? 'text-purple-600' : 'text-red-600'}`}>Reste: {Math.abs(showHistoryModal.remaining).toLocaleString()} DZD</p></div></div>
                                <table className="w-full text-left border-collapse"><thead className="bg-gray-100"><tr><th className="p-3 text-xs font-black uppercase">Date</th><th className="p-3 text-xs font-black uppercase">Mode / Type</th><th className="p-3 text-xs font-black uppercase text-right">Montant</th></tr></thead><tbody>{showHistoryModal.payments?.map((p: any) => (<tr key={p.id} className="border-b border-gray-100"><td className="p-3 text-sm font-bold font-sans">{new Date(p.paymentDate).toLocaleDateString('fr-FR')}</td><td className="p-3 text-sm font-bold uppercase">{p.isReturn ? 'RETOUR' : p.paymentMethod}</td><td className="p-3 text-sm font-black text-right font-sans">{(p.isReturn || p.amount < 0) ? '-' : '+'}{Math.abs(p.amount).toLocaleString()} DZD</td></tr>))}</tbody><tfoot><tr className="bg-gray-900 text-white"><td colSpan={2} className="p-4 text-right font-black uppercase">Total Payé:</td><td className="p-4 text-right font-black font-sans">{showHistoryModal.paid.toLocaleString()} DZD</td></tr></tfoot></table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Returns History Modal */}
            {showReturnsHistoryModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg"><RotateCcw size={24} /></div>
                                <div><h2 className="text-xl font-black text-gray-900">سجل المرتجعات</h2><p className="text-gray-500 text-xs font-bold tracking-tight">عرض تفاصيل عمليات الإرجاع</p></div>
                            </div>
                            <button onClick={() => setShowReturnsHistoryModal(null)} className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 transition-all"><X size={20} /></button>
                        </div>
                        <div className="p-8 max-h-[60vh] overflow-y-auto">
                            {!showReturnsHistoryModal || showReturnsHistoryModal.length === 0 ? (
                                <div className="py-20 text-center text-gray-300 flex flex-col items-center gap-4"><RotateCcw size={48} /><p className="font-black">لا توجد مرتجعات مسجلة</p></div>
                            ) : (
                                <div className="space-y-6">
                                    {showReturnsHistoryModal.map((ret: any) => (
                                        <div key={ret.id} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex flex-col gap-4">
                                            <div className="flex justify-between items-center"><span className="font-black text-gray-900 font-sans text-lg">{ret.orderNumber}</span><span className="text-[10px] font-black text-gray-400 font-sans">{formatDate(ret.orderDate)}</span></div>
                                            <div className="space-y-2">{ret.items?.map((item: any, i: number) => (<div key={i} className="flex justify-between items-center text-xs"><span className="text-gray-600 font-bold">{item.product?.name}</span><span className="font-black text-rose-600">{item.quantity} {item.product?.unit}</span></div>))}</div>
                                            <div className="pt-4 border-t border-gray-200 flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase">إجمالي المرتجع</span><span className="font-black text-gray-900 font-sans">{(ret.total || 0).toLocaleString()} دج</span></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Return Process Modal */}
            {showReturnModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="bg-rose-600 p-3 rounded-2xl text-white shadow-lg"><RotateCcw size={24} /></div>
                                <div><h2 className="text-xl font-black text-gray-900">استرجاع طلبية</h2><p className="text-gray-500 text-xs font-bold tracking-tight">رقم: {showReturnModal.orderNumber}</p></div>
                            </div>
                            <button onClick={() => setShowReturnModal(null)} className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 transition-all"><X size={20} /></button>
                        </div>
                        <div className="p-8 overflow-y-auto max-h-[70vh]">
                            <div className="mb-6 bg-gray-50 p-5 rounded-2xl border border-gray-100 grid grid-cols-2 gap-4">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">إجمالي الطلبية</p><p className="font-black text-gray-900 font-sans">{(showReturnModal.total || 0).toLocaleString()} دج</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">العميل</p><p className="font-black text-gray-900">{showReturnModal.customer?.name || showReturnModal.customerName || 'عابر'}</p></div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-gray-700">اختر الكميات المرتجعة</h3>
                                <div className="space-y-3">
                                    {showReturnModal.items.map((item: any) => {
                                        const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                                        if (maxReturnable <= 0) return null;
                                        return (
                                            <div key={item.id} className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between hover:bg-rose-50/30 transition-all">
                                                <div className="flex flex-col"><span className="font-black text-gray-900">{item.product?.name}</span><span className="text-[10px] font-bold text-gray-400 uppercase">الأصلية: {item.quantity} | المتبقي: {maxReturnable}</span></div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-left"><p className="text-[10px] font-black text-rose-500 font-sans">{((returnQtys[item.id] || 0) * item.unitPrice).toLocaleString()} دج</p></div>
                                                    <input type="number" value={returnQtys[item.id] || 0} onClick={e => (e.target as HTMLInputElement).select()} onChange={e => handleReturnQtyChange(item.id, parseInt(e.target.value) || 0, maxReturnable)} className="w-20 h-10 bg-gray-50 border border-gray-200 rounded-xl text-center font-black font-sans focus:border-rose-500 outline-none transition-all" min={0} max={maxReturnable} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase">إجمالي المرتجع</p>
                                <p className="text-2xl font-black text-rose-600 font-sans">
                                    {showReturnModal.items.reduce((sum: number, i: any) => sum + (returnQtys[i.id] || 0) * i.unitPrice, 0).toLocaleString()} دج
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleReturnAll}
                                    className="px-6 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all shadow-sm"
                                >
                                    استرجاع الكل
                                </button>
                                <button 
                                    onClick={handleReturnSubmit} 
                                    disabled={isSubmitting || showReturnModal.items.reduce((sum: number, i: any) => sum + (returnQtys[i.id] || 0), 0) === 0} 
                                    className="bg-rose-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl hover:bg-rose-700 disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {isSubmitting ? 'جاري المعالجة...' : 'تأكيد الاسترجاع'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Return Success Modal */}
            {showReturnSuccessModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col items-center p-10 animate-in zoom-in-95 duration-300 text-center">
                        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <CheckCircle size={60} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">تم الاسترجاع بنجاح</h2>
                        <p className="text-gray-500 text-sm font-bold mb-8">تم تسجيل المرتجع وتحديث المخزون بنجاح</p>
                        
                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={() => {
                                    const el = document.getElementById('return-receipt-print');
                                    if (el) {
                                        const original = document.body.innerHTML;
                                        document.body.innerHTML = el.innerHTML;
                                        window.print();
                                        document.body.innerHTML = original;
                                        window.location.reload();
                                    }
                                }}
                                className="w-full bg-[#8b5cf6] text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-violet-200 hover:bg-[#7c3aed] transition-all flex items-center justify-center gap-2"
                            >
                                <Printer size={18} /> طباعة وصل الاسترجاع
                            </button>
                            <button 
                                onClick={() => {
                                    setShowReturnSuccessModal(false);
                                    window.location.reload();
                                }}
                                className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                            >
                                العودة لقائمة الفواتير
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Refund Confirmation Modal */}
            {showRefundConfirmModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                                <Banknote size={40} strokeWidth={2.5} />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 mb-2">تأكيد إرجاع الفائض</h2>
                            <p className="text-gray-500 text-sm font-bold leading-relaxed mb-8">
                                هل أنت متأكد من إرجاع مبلغ <span className="text-purple-600 font-black font-sans">{Math.abs(showRefundConfirmModal.remaining).toLocaleString()} دج</span> نقداً؟
                                <br />
                                <span className="text-gray-400 text-xs font-medium">سيتم تصفير رصيد الفاتورة نهائياً.</span>
                            </p>
                            
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button 
                                    onClick={() => setShowRefundConfirmModal(null)}
                                    className="h-14 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                                >
                                    إلغاء
                                </button>
                                <button 
                                    onClick={confirmRefund}
                                    disabled={isSubmitting}
                                    className="h-14 bg-purple-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <RotateCcw size={18} className="animate-spin" /> : 'تأكيد الإرجاع'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Return Receipt Template */}
            {lastReturnResult && (
                <div id="return-receipt-print" className="hidden">
                    <div className="p-10 font-sans text-left" dir="ltr">
                        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase">BON DE RETOUR</h1>
                                <p className="text-gray-500 font-bold">Réf: {lastReturnResult.id}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-black text-blue-600">{settings?.storeName || 'مخزون'}</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="flex justify-between border-b border-gray-100 py-4">
                                <span className="text-gray-500 font-bold uppercase text-xs">Date:</span>
                                <span className="font-black font-sans">{new Date().toLocaleString('fr-FR')}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 py-4">
                                <span className="text-gray-500 font-bold uppercase text-xs">Client:</span>
                                <span className="font-black">{showReturnModal?.customer?.name || showReturnModal?.customerName || 'Client'}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 py-4">
                                <span className="text-gray-500 font-bold uppercase text-xs">Commande d'origine:</span>
                                <span className="font-black font-sans">{showReturnModal?.orderNumber}</span>
                            </div>
                        </div>

                        <table className="w-full mt-10 border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b-2 border-gray-900">
                                    <th className="p-3 text-left text-xs font-black uppercase">Produit</th>
                                    <th className="p-3 text-center text-xs font-black uppercase">Qté</th>
                                    <th className="p-3 text-right text-xs font-black uppercase">P.U.</th>
                                    <th className="p-3 text-right text-xs font-black uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lastReturnResult.items?.map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-gray-100">
                                        <td className="p-3 text-sm font-bold">{item.product?.name}</td>
                                        <td className="p-3 text-sm text-center font-black font-sans">{item.quantity}</td>
                                        <td className="p-3 text-sm text-right font-bold font-sans">{(item.unitPrice || 0).toLocaleString()}</td>
                                        <td className="p-3 text-sm text-right font-black font-sans">{(item.total || (item.quantity * item.unitPrice)).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-900 text-white font-black">
                                    <td colSpan={3} className="p-4 text-right uppercase text-xs">Montant Total Retourné:</td>
                                    <td className="p-4 text-right font-sans">{(lastReturnResult.total || 0).toLocaleString()} DZD</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div className="grid grid-cols-2 gap-20 mt-20 text-center">
                            <div className="border-t-2 border-gray-900 pt-4 font-black uppercase text-xs">Signature Magasin</div>
                            <div className="border-t-2 border-gray-900 pt-4 font-black uppercase text-xs">Signature Client</div>
                        </div>
                    </div>
                </div>
            )}
            {/* Refund Success Modal */}
            {showRefundSuccessModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col items-center p-10 animate-in zoom-in-95 duration-300 text-center">
                        <div className="w-24 h-24 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <CheckCircle size={60} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-2">تمت العملية بنجاح</h2>
                        <p className="text-gray-500 text-sm font-bold mb-8">تم إرجاع المبلغ وتصفية حساب الفاتورة بنجاح</p>
                        
                        <button 
                            onClick={() => {
                                setShowRefundSuccessModal(false);
                                window.location.reload();
                            }}
                            className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all"
                        >
                            حسناً، فهمت
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
