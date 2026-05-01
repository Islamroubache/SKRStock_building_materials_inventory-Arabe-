'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Building2, ChevronRight, Phone, Mail, MapPin, Package, ShoppingCart,
    ArrowDownLeft, ArrowUpRight, CreditCard, X, CheckCircle, AlertTriangle,
    ChevronDown, ChevronUp, RotateCcw, Calendar, DollarSign, Printer, Activity,
    Edit, Building, History, ShoppingBag, Clock, Eye, Search, Download, FileSpreadsheet,
    FileText, Briefcase, Star, FileDown
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { formatDate } from '@/lib/utils';
import { ALGERIA_LOCATIONS } from '@/lib/constants/algeria-locations';
import { InvoicesTable, StatusBadge } from '@/components/InvoicesTable';

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

interface SupplierPayment {
    id: number;
    amount: number;
    paymentDate: string;
    notes: string | null;
}

interface Supplier {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    commune: string | null;
    wilaya: string | null;
    rc: string | null;
    nif: string | null;
    ai: string | null;
    nis: string | null;
    balanceDue: number;
    products: { id: number; name: string; code: string | null; quantity: number; unit: string; purchasePrice: number }[];
    orders: Order[];
    payments: SupplierPayment[];
}

function numberToFrenchWords(n: number): string {
    if (n === 0) return 'Zéro';
    const units = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf'];
    const teens = ['Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-sept', 'Dix-huit', 'Dix-neuf'];
    const tens = ['', '', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante', 'Soixante-dix', 'Quatre-vingts', 'Quatre-vingt-dix'];

    function convert(num: number): string {
        if (num < 10) return units[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) {
            const t = Math.floor(num / 10);
            const r = num % 10;
            if (r === 0) return tens[t];
            if (t === 7) return `Soixante-${convert(r + 10).toLowerCase()}`;
            if (t === 9) return `Quatre-vingt-${convert(r + 10).toLowerCase()}`;
            return `${tens[t]}${r === 1 ? '-et-' : '-'}${units[r].toLowerCase()}`;
        }
        if (num < 1000) {
            const c = Math.floor(num / 100);
            const r = num % 100;
            const s = c > 1 ? `${units[c]} cents` : 'Cent';
            return r === 0 ? s : `${s} ${convert(r).toLowerCase()}`;
        }
        if (num < 1000000) {
            const m = Math.floor(num / 1000);
            const r = num % 1000;
            const s = m > 1 ? `${convert(m)} mille` : 'Mille';
            return r === 0 ? s : `${s} ${convert(r).toLowerCase()}`;
        }
        const mill = Math.floor(num / 1000000);
        const r = num % 1000000;
        const s = mill > 1 ? `${convert(mill)} millions` : 'Un million';
        return r === 0 ? s : `${s} ${convert(r).toLowerCase()}`;
    }

    return convert(Math.floor(n));
}

export default function SupplierDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'orders' | 'payments' | 'analytics' | 'products'>('orders');

    // Return product modal
    const [returnModal, setReturnModal] = useState<{ item: OrderItem; maxQty: number } | null>(null);
    const [returnQty, setReturnQty] = useState(1);
    const [isReturning, setIsReturning] = useState(false);

    // Pay credit modal
    const [payModal, setPayModal] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [isPaying, setIsPaying] = useState(false);

    // InvoicesTable requirements
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState<any | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState<any | null>(null);
    const [showReturnsModal, setShowReturnsModal] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CHEQUE' | 'BANK_TRANSFER'>('CASH');
    const [chequeNumber, setChequeNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');

    // SOA Filters
    const [soaSearchQuery, setSoaSearchQuery] = useState('');
    const [soaMotifFilter, setSoaMotifFilter] = useState('ALL');
    const [soaMethodFilter, setSoaMethodFilter] = useState('ALL');
    const [soaProjectFilter, setSoaProjectFilter] = useState('ALL');
    const [soaDateFrom, setSoaDateFrom] = useState('');
    const [soaDateTo, setSoaDateTo] = useState('');
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const [isProductExportDropdownOpen, setIsProductExportDropdownOpen] = useState(false);
    const [selectedProductForBatches, setSelectedProductForBatches] = useState<any | null>(null);
    const [productSearchQuery, setProductSearchQuery] = useState('');

    const setPaymentAmount = (amount: number) => setPayAmount(amount.toString());
    const handleRefundExcess = async (inv: any) => {
        const excess = Math.abs(inv.remaining);
        if (excess <= 0) return;

        const confirmRefund = window.confirm(`هل أنت متأكد من تسجيل استرجاع الفائض نقداً بقيمة ${excess.toLocaleString()} دج؟\nسيتم إنقاص هذا المبلغ من مدفوعات الفاتورة وتعديل رصيد المورد.`);
        if (!confirmRefund) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: inv.id,
                    supplierId: parseInt(id as string),
                    amount: -excess, // Negative amount for refund
                    paymentMethod: 'CASH',
                    notes: 'استرجاع الفائض نقداً (تسوية رصيد زائد)'
                })
            });

            if (res.ok) {
                await fetchSupplier();
                alert('✅ تم تسجيل استرجاع الفائض بنجاح');
            } else {
                const err = await res.json();
                alert(err.error || 'فشل تسجيل العملية');
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
        } catch (e) { console.error(e); }
    };
    const fetchReturnsHistory = async (orderNumber: string) => {
        try {
            const res = await fetch(`/api/orders/${orderNumber}/returns`);
            if (res.ok) {
                const data = await res.json();
                setShowReturnsModal((prev: any) => prev ? { ...prev, returns: data } : null);
            }
        } catch (e) { console.error(e); }
    };

    const handleRecordPayment = async () => {
        if (!showPaymentModal || parseFloat(payAmount) <= 0) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: showPaymentModal.id,
                    supplierId: parseInt(id as string),
                    amount: parseFloat(payAmount),
                    paymentMethod,
                    chequeNumber: (paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') ? chequeNumber : null,
                    bankName: (paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') ? bankName : null,
                    notes: paymentNotes
                })
            });

            if (res.ok) {
                await fetchSupplier();
                setShowPaymentModal(null);
                setPayAmount('');
                setPaymentNotes('');
                setChequeNumber('');
                setBankName('');
                if (showHistoryModal && showHistoryModal.id === showPaymentModal.id) {
                    fetchPaymentHistory(showPaymentModal.id);
                }
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
    
    const exportSOACSV = () => {
        if (!supplier) return;
        
        // 1. Prepare All Transactions (Same logic as UI)
        const allTxs: any[] = [];
        const usedPaymentIds = new Set<number>();

        (supplier.orders || []).forEach((o: any) => {
            if (o.type === 'PURCHASE') {
                const returnsValue = (o.items || []).reduce((sum: number, item: any) => 
                    sum + ((item.returnedQuantity || 0) * (item.unitPrice || 0)), 0
                );
                const netTotal = o.total || 0;
                const originalTotal = netTotal + returnsValue;

                const initialPayment = (o.invoice?.supplierPayments || []).find((p: any) => {
                    const orderTime = new Date(o.orderDate).getTime();
                    const payTime = new Date(p.paymentDate).getTime();
                    return Math.abs(orderTime - payTime) < 120000;
                });

                if (initialPayment) usedPaymentIds.add(initialPayment.id);
                const versement = initialPayment ? initialPayment.amount : 0;
                
                let motif = '';
                if (Math.abs(versement - originalTotal) < 0.01) motif = 'دفع كامل';
                else if (versement > 0) motif = 'دفع جزئي';
                else motif = 'شراء آجل';

                allTxs.push({
                    date: new Date(o.orderDate).toLocaleDateString('ar-DZ'),
                    number: o.orderNumber,
                    achat: originalTotal,
                    method: initialPayment?.paymentMethod || '---',
                    motif: motif,
                    ref: '---',
                    versement: versement,
                    type: 'PURCHASE',
                    project: o.project?.name || 'عام'
                });
            } else if (o.type === 'RETURN_PURCHASE') {
                allTxs.push({
                    date: new Date(o.orderDate).toLocaleDateString('ar-DZ'),
                    number: 'Retours',
                    achat: -(o.total || 0),
                    method: '---',
                    motif: 'إرجاع سلع',
                    ref: o.notes || o.orderNumber,
                    versement: 0,
                    type: 'RETURN',
                    project: o.project?.name || 'عام'
                });
            }
        });

        (supplier.payments || []).forEach((p: any) => {
            if (usedPaymentIds.has(p.id)) return;
            const isRefund = p.amount < 0;
            allTxs.push({
                date: new Date(p.paymentDate).toLocaleDateString('ar-DZ'),
                number: isRefund ? 'Remboursement' : 'Droits',
                achat: 0,
                method: isRefund ? '---' : p.paymentMethod,
                motif: isRefund ? 'استرداد أموال لنا' : 'دفع مستحقات للمورد',
                ref: p.invoice?.invoiceNumber?.replace('INV/', '') || '---',
                versement: p.amount,
                type: isRefund ? 'REFUND' : 'PAYMENT',
                project: p.invoice?.order?.project?.name || 'عام'
            });
        });

        allTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = 0;
        const csvContent = [
            ['التاريخ', 'رقم العملية', 'المشروع', 'مبلغ الشراء', 'المدفوعات', 'الرصيد', 'طريقة الدفع', 'البيان'].join(','),
            ...allTxs.map(tx => {
                runningBalance += (tx.achat - tx.versement);
                return [
                    tx.date,
                    tx.number,
                    tx.project,
                    tx.achat,
                    tx.versement,
                    runningBalance,
                    tx.method,
                    tx.motif
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `SOA_Supplier_${supplier.name}_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    // Edit Supplier Sheet
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [formData, setFormData] = useState({ 
        name: '', phone: '', email: '', address: '', 
        commune: '', wilaya: '',
        rc: '', nif: '', ai: '', nis: '', activity: "Grossiste en Matériel Électrique"
    });
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const setFieldTouched = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const validations = {
        name: (() => {
            const words = formData.name.trim().split(/\s+/).filter(w => w.length > 0);
            return words.length >= 2 && words.slice(0, 2).every(w => w.length >= 3);
        })(),
        activity: (() => {
            const predefinedActivities = [
                "Fabricant de Câbles & Fils Électriques", "Fabricant de Matériel Électrique", "Fabricant d'Éclairage & LED",
                "Fabricant d'Appareillage Électrique", "Grossiste en Matériel Électrique", "Importateur de Matériel Électrique",
                "Commerce en Gros d'Électricité", "Distributeur Agréé", "Fabricant de Coffrets & Tableaux",
                "Fabricant de Gaines & Tubes", "Fournisseur d'Équipements Industriels",
            ];
            const isCustom = formData.activity === 'Autre' || (formData.activity && !predefinedActivities.includes(formData.activity));
            if (!isCustom) return true;
            const words = formData.activity.trim().split(/\s+/).filter(w => w.length > 0);
            return words.length >= 2;
        })(),
        phone: formData.phone === '' || /^0[567]\d{8}$/.test(formData.phone),
        email: formData.email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
        rc: formData.rc === '' || formData.rc.length === 10,
        nif: formData.nif === '' || formData.nif.length === 15,
        ai: formData.ai === '' || formData.ai.length === 11,
        nis: formData.nis === '' || formData.nis.length === 15,
        address: formData.address.length >= 5,
        commune: formData.commune.length > 0,
        wilaya: formData.wilaya.length > 0,
    };

    const fetchSupplier = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/suppliers/${id}`);
            if (res.ok) {
                const data = await res.json();
                setSupplier(data);
                setFormData({
                    name: data.name,
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                    commune: data.commune || '',
                    wilaya: data.wilaya || '',
                    rc: data.rc || '',
                    nif: data.nif || '',
                    ai: data.ai || '',
                    nis: data.nis || '',
                    activity: data.activity || "Grossiste en Matériel Électrique"
                });
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (id) fetchSupplier(); }, [id]);

    const handleSaveEdit = async () => {
        try {
            const res = await fetch(`/api/suppliers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsEditSheetOpen(false);
                fetchSupplier();
            } else {
                const err = await res.json();
                alert(`خطأ: ${err.error}`);
            }
        } catch (e) { alert('حدث خطأ'); }
    };

    const exportProductsCSV = () => {
        if (!supplier) return;
        const headers = ["المنتج", "الكود", "أول شراء", "آخر شراء", "إجمالي المشتريات", "المخزون الحالي"];
        const rows = supplier.products.map(p => [
            p.name,
            p.code || '-',
            p.firstPurchase ? new Date(p.firstPurchase).toLocaleDateString('ar-DZ') : '---',
            p.lastPurchase ? new Date(p.lastPurchase).toLocaleDateString('ar-DZ') : '---',
            `${p.totalPurchasedQty} ${p.unit}`,
            `${p.quantity} ${p.unit}`
        ]);
        const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `منتجات_${supplier.name}_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsProductExportDropdownOpen(false);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        const form = e.currentTarget;
        const focusableElements = Array.from(form.querySelectorAll('input:not([type="hidden"]), select, textarea, button[type="submit"]'));
        const index = focusableElements.indexOf(e.target as any);
        if (e.key === 'Enter') {
            if (index > -1 && index < focusableElements.length - 1) {
                e.preventDefault();
                (focusableElements[index + 1] as HTMLElement).focus();
            }
        }
    };

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

    // Prepare chart data (Orders per month for the last 6 months)
    const getChartData = () => {
        if (!supplier.orders) return [];
        const months: Record<string, number> = {};
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthName = d.toLocaleDateString('ar-DZ', { month: 'short', year: 'numeric' });
            months[monthName] = 0;
        }

        supplier.orders.forEach(o => {
            const d = new Date(o.orderDate);
            const monthName = d.toLocaleDateString('ar-DZ', { month: 'short', year: 'numeric' });
            if (months[monthName] !== undefined) {
                months[monthName] += o.total;
            }
        });

        return Object.keys(months).map(k => ({ name: k, 'إجمالي المشتريات': months[k] }));
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 flex flex-col gap-8 print:bg-white print:p-0" dir="rtl">
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
                    .no-print { display: none !important; }
                    .print-break { page-break-before: always; }
                    .print-shadow-none { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
                }
            `}</style>

            <div className="print-area h-full w-full">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest no-print mb-8">
                    <Link href="/suppliers" className="hover:text-indigo-600 transition-colors">الموردون</Link>
                    <ChevronRight size={14} className="rotate-180" />
                    <span className="text-gray-900">{supplier.name}</span>
                </div>

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-200 print-shadow-none print:border-none">
                            {supplier.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900">{supplier.name}</h1>
                            <p className="text-gray-400 font-bold text-sm mt-1">كشف حساب وتفاصيل المورد</p>
                        </div>
                    </div>

                    <div className="flex gap-3 no-print">
                        <button
                            onClick={() => setIsEditSheetOpen(true)}
                            className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all no-print"
                        >
                            <Edit size={16} /> تعديل البيانات
                        </button>
                    </div>
                </div>

                {/* Info + Stats Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* Left: Supplier Info */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">معلومات المورد</h3>
                            <div className="space-y-3">
                                {supplier.phone && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                                        <Phone size={16} className="text-gray-400" />
                                        <span className="font-bold font-sans text-gray-900" dir="ltr">{supplier.phone}</span>
                                    </div>
                                )}
                                {supplier.email && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                                        <Mail size={16} className="text-gray-400" />
                                        <span className="font-bold text-gray-900 font-sans" dir="ltr">{supplier.email}</span>
                                    </div>
                                )}
                                {supplier.address && (
                                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl relative group overflow-hidden">
                                        <div className="absolute inset-y-0 right-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <MapPin size={16} className="text-gray-400 mt-1 shrink-0" />
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">الموقع / العنوان</span>
                                            <span className="font-bold text-gray-900 leading-tight">
                                                {supplier.address}
                                                {(supplier.commune || supplier.wilaya) && <span className="text-gray-400 mx-1">/</span>}
                                                <span className="text-indigo-600">{supplier.commune}</span>
                                                {supplier.wilaya && <span className="text-gray-400 mx-1">-</span>}
                                                <span className="text-indigo-600">
                                                    {ALGERIA_LOCATIONS.find(w => w.arabicName === supplier.wilaya)?.name || supplier.wilaya}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {(supplier.rc || supplier.nif || supplier.ai || supplier.nis) && (
                                    <div className="pt-2 mt-2 border-t border-gray-100 flex flex-col gap-3">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الهوية الجبائية والقانونية</span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {supplier.rc && (
                                                <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 mb-0.5">RC</p>
                                                    <p className="text-xs font-bold font-sans text-gray-900">{supplier.rc}</p>
                                                </div>
                                            )}
                                            {supplier.nif && (
                                                <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 mb-0.5">NIF</p>
                                                    <p className="text-xs font-bold font-sans text-gray-900">{supplier.nif}</p>
                                                </div>
                                            )}
                                            {supplier.ai && (
                                                <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 mb-0.5">AI</p>
                                                    <p className="text-xs font-bold font-sans text-gray-900">{supplier.ai}</p>
                                                </div>
                                            )}
                                            {supplier.nis && (
                                                <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 mb-0.5">NIS</p>
                                                    <p className="text-xs font-bold font-sans text-gray-900">{supplier.nis}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {!supplier.phone && !supplier.email && !supplier.address && (
                                    <p className="text-gray-400 text-sm font-bold text-center py-4">لا توجد معلومات تواصل</p>
                                )}
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
                                {supplier.balanceDue !== 0 && (
                                    <button
                                        onClick={() => { setPayModal(true); setPayAmount(Math.abs(supplier.balanceDue).toString()); }}
                                        className={`mt-2 text-xs font-black px-3 py-2 rounded-2xl transition-all w-fit shadow-sm ${supplier.balanceDue > 0 ? 'bg-white text-red-600 hover:bg-red-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                    >
                                        {supplier.balanceDue > 0 ? 'دفع المستحقات' : 'استرجاع المستحقات'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Full Width Tabs Section */}
                <div className="flex flex-col gap-6">
                    {/* TABS */}
                    <div className="flex bg-gray-100 p-1 rounded-2xl w-fit no-print">
                            <button onClick={() => setActiveTab('orders')} className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all ${activeTab === 'orders' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>سجل الطلبيات</button>
                            <button onClick={() => setActiveTab('payments')} className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all ${activeTab === 'payments' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>كشف الحساب</button>
                            <button onClick={() => setActiveTab('analytics')} className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all ${activeTab === 'analytics' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>التحليلات</button>
                            <button onClick={() => setActiveTab('products')} className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all ${activeTab === 'products' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>المنتجات الموردة</button>
                        </div>

                        {/* CONTENT SECTION */}
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden mb-8">
                            {/* PRINT ONLY TABLES (Will only show when printing) */}
                            <div className="hidden print-block w-full text-sm mt-8 no-print print:block">
                                <h3 className="font-black text-gray-900 mb-2 border-b pb-2">سجل آخر الطلبيات:</h3>
                                <table className="w-full text-right mb-8">
                                    <thead><tr className="border-b"><th className="py-2">رقم الطلب</th><th className="py-2">التاريخ</th><th className="py-2">الرصيد الدائن</th></tr></thead>
                                    <tbody>
                                        {supplier.orders.slice(0, 10).map(o => <tr key={o.id} className="border-b"><td className="py-2">{o.orderNumber}</td><td className="py-2">{formatDate(o.orderDate)}</td><td className="py-2">{o.total.toLocaleString()} دج</td></tr>)}
                                    </tbody>
                                </table>

                                <h3 className="font-black text-gray-900 mb-2 border-b pb-2">سجل آخر المدفوعات:</h3>
                                <table className="w-full text-right">
                                    <thead><tr className="border-b"><th className="py-2">التاريخ</th><th className="py-2">المبلغ المُسدد</th><th className="py-2">ملاحظات</th></tr></thead>
                                    <tbody>
                                        {supplier.payments?.map(p => <tr key={p.id} className="border-b"><td className="py-2">{formatDate(p.paymentDate)}</td><td className="py-2">{p.amount.toLocaleString()} دج</td><td className="py-2">{p.notes || '-'}</td></tr>)}
                                    </tbody>
                                </table>
                            </div>

                            {activeTab === 'analytics' && (
                                <div className="p-6 no-print">
                                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-6">
                                        <Activity size={18} className="text-blue-600" /> تحليل حجم المشتريات (آخر 6 أشهر)
                                    </h3>
                                    <div className="h-72 w-full" dir="ltr">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={getChartData()}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.5} vertical={false} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} dx={-10} tickFormatter={value => `${value / 1000}k`} />
                                                <RechartsTooltip cursor={{ stroke: '#E5E7EB', strokeWidth: 2 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} labelStyle={{ fontWeight: 'black', marginBottom: '8px' }} />
                                                <Line type="monotone" dataKey="إجمالي المشتريات" stroke="#4F46E5" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'payments' && (
                                <div className="flex flex-col pb-6 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[600px] bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm overflow-x-auto">
                                    <div className="flex justify-between items-center mb-6 no-print">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-gray-900 text-white p-3 rounded-2xl shadow-lg"><Printer size={24} /></div>
                                            <div className="text-right">
                                                <h3 className="text-xl font-black text-gray-900">كشف الحساب التفصيلي للمورد</h3>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">سجل كامل للحركات المالية والطلبيات</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                                                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-100 hover:scale-105 transition-all"
                                                >
                                                    <Download size={16} /> تصدير الكشف <ChevronDown size={14} className={`transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                
                                                {isExportDropdownOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setIsExportDropdownOpen(false)} />
                                                        <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                            <button 
                                                                onClick={() => {
                                                                    exportSOACSV();
                                                                    setIsExportDropdownOpen(false);
                                                                }}
                                                                className="w-full px-5 py-3 text-right text-xs font-black text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                                                            >
                                                                <FileSpreadsheet size={16} className="text-emerald-600" /> تصدير Excel (.csv)
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    setIsExportDropdownOpen(false);
                                                                    window.print();
                                                                }}
                                                                className="w-full px-5 py-3 text-right text-xs font-black text-gray-700 hover:bg-red-50 hover:text-red-700 border-t border-gray-50 flex items-center gap-3 transition-colors"
                                                            >
                                                                <FileText size={16} className="text-red-600" /> تصدير PDF (طباعة)
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <button onClick={() => window.print()} className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg hover:scale-105 transition-all">
                                                <Printer size={16} /> طباعة الكشف
                                            </button>
                                        </div>
                                    </div>

                                    {/* Filters Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 no-print bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase mr-2">بحث (رقم العملية / المرجع)</label>
                                            <div className="relative">
                                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                <input 
                                                    type="text" 
                                                    placeholder="مثلاً: 2026/04/..."
                                                    value={soaSearchQuery || ''}
                                                    onChange={(e) => setSoaSearchQuery(e.target.value)}
                                                    className="w-full bg-white border border-gray-200 rounded-2xl py-2.5 pr-10 pl-4 text-xs font-bold outline-none focus:border-gray-900 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase mr-2">نوع العملية (البيان)</label>
                                            <select 
                                                value={soaMotifFilter || 'ALL'}
                                                onChange={(e) => setSoaMotifFilter(e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-2xl py-2.5 px-4 text-xs font-bold outline-none focus:border-gray-900 cursor-pointer"
                                            >
                                                <option value="ALL">كل الأنواع</option>
                                                <option value="PURCHASE">مشتريات</option>
                                                <option value="RETURN">مرتجعات</option>
                                                <option value="PAYMENT">دفع مستحقات</option>
                                                <option value="REFUND">استرداد أموال</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase mr-2">طريقة الدفع</label>
                                            <select 
                                                value={soaMethodFilter || 'ALL'}
                                                onChange={(e) => setSoaMethodFilter(e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-2xl py-2.5 px-4 text-xs font-bold outline-none focus:border-gray-900 cursor-pointer"
                                            >
                                                <option value="ALL">كل الطرق</option>
                                                <option value="CASH">نقداً (CASH)</option>
                                                <option value="CHEQUE">شيك (CHEQUE)</option>
                                                <option value="BANK_TRANSFER">تحويل بنكي</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase mr-2">المشروع</label>
                                            <select 
                                                value={soaProjectFilter || 'ALL'}
                                                onChange={(e) => setSoaProjectFilter(e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-2xl py-2.5 px-4 text-xs font-bold outline-none focus:border-gray-900 cursor-pointer"
                                            >
                                                <option value="ALL">كل المشاريع</option>
                                                <option value="GENERAL">عام / بدون مشروع</option>
                                                {Array.from(new Set((supplier.orders || []).filter(o => o.project).map(o => JSON.stringify({id: o.projectId, name: o.project.name})))).map((pStr: any) => {
                                                    const p = JSON.parse(pStr);
                                                    return <option key={p.id} value={p.id.toString()}>{p.name}</option>
                                                })}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase mr-2">من تاريخ</label>
                                            <input 
                                                type="date" 
                                                value={soaDateFrom || ''}
                                                onChange={(e) => setSoaDateFrom(e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-2xl py-2 px-4 text-xs font-bold outline-none focus:border-gray-900"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase mr-2">إلى تاريخ</label>
                                            <input 
                                                type="date" 
                                                value={soaDateTo || ''}
                                                onChange={(e) => setSoaDateTo(e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-2xl py-2 px-4 text-xs font-bold outline-none focus:border-gray-900"
                                            />
                                        </div>
                                    </div>

                                    {(() => {
                                        const allTxs: any[] = [];
                                        const usedPaymentIds = new Set<number>();

                                        // 1. Process Orders (Purchases & Returns)
                                        (supplier.orders || []).forEach((o: any) => {
                                            if (o.type === 'PURCHASE') {
                                                const returnsValue = (o.items || []).reduce((sum: number, item: any) => 
                                                    sum + ((item.returnedQuantity || 0) * (item.unitPrice || 0)), 0
                                                );
                                                const netTotal = o.total || 0;
                                                const originalTotal = netTotal + returnsValue;

                                                const initialPayment = (o.invoice?.supplierPayments || []).find((p: any) => {
                                                    const orderTime = new Date(o.orderDate).getTime();
                                                    const payTime = new Date(p.paymentDate).getTime();
                                                    return Math.abs(orderTime - payTime) < 120000;
                                                });

                                                if (initialPayment) usedPaymentIds.add(initialPayment.id);
                                                const versement = initialPayment ? initialPayment.amount : 0;
                                                
                                                let motif = '';
                                                if (Math.abs(versement - originalTotal) < 0.01) motif = 'دفع كامل';
                                                else if (versement > 0) motif = 'دفع جزئي';
                                                else motif = 'شراء آجل';

                                                allTxs.push({
                                                    date: new Date(o.orderDate),
                                                    number: o.orderNumber,
                                                    achat: originalTotal,
                                                    method: initialPayment?.paymentMethod || '---',
                                                    motif: motif,
                                                    ref: '---',
                                                    versement: versement,
                                                    type: 'PURCHASE',
                                                    project: o.project?.name || 'عام',
                                                    projectId: o.projectId
                                                });
                                            } else if (o.type === 'RETURN_PURCHASE') {
                                                allTxs.push({
                                                    date: new Date(o.orderDate),
                                                    number: 'Retours',
                                                    achat: -(o.total || 0),
                                                    method: '---',
                                                    motif: 'إرجاع سلع',
                                                    ref: o.notes || o.orderNumber,
                                                    versement: 0,
                                                    type: 'RETURN',
                                                    project: o.project?.name || 'عام',
                                                    projectId: o.projectId
                                                });
                                            }
                                        });

                                        // 2. Process Payments (Tasdid & Refunds)
                                        (supplier.payments || []).forEach((p: any) => {
                                            if (usedPaymentIds.has(p.id)) return;
                                            const isRefund = p.amount < 0;
                                            allTxs.push({
                                                date: new Date(p.paymentDate),
                                                number: isRefund ? 'Remboursement' : 'Droits',
                                                achat: 0,
                                                method: isRefund ? '---' : p.paymentMethod,
                                                motif: isRefund ? 'استرداد أموال لنا' : 'دفع مستحقات للمورد',
                                                ref: p.invoice?.invoiceNumber?.replace('INV/', '') || '---',
                                                versement: p.amount,
                                                type: isRefund ? 'REFUND' : 'PAYMENT',
                                                project: p.invoice?.order?.project?.name || 'عام',
                                                projectId: p.invoice?.order?.projectId || null
                                            });
                                        });

                                        // 3. Sort Chronologically
                                        allTxs.sort((a, b) => a.date.getTime() - b.date.getTime());

                                        // 4. Calculate Full History Balance
                                        let runningBalance = 0;
                                        const historyWithBalance = allTxs.map(tx => {
                                            runningBalance += (tx.achat - tx.versement);
                                            return { ...tx, balance: runningBalance };
                                        });

                                        // 5. Apply Filters
                                        let filteredTxs = historyWithBalance.filter(tx => {
                                            if (soaDateFrom && tx.date < new Date(soaDateFrom)) return false;
                                            if (soaDateTo) {
                                                const toDate = new Date(soaDateTo);
                                                toDate.setHours(23, 59, 59, 999);
                                                if (tx.date > toDate) return false;
                                            }
                                            if (soaMotifFilter && soaMotifFilter !== 'ALL' && tx.type !== soaMotifFilter) return false;
                                            if (soaMethodFilter && soaMethodFilter !== 'ALL' && tx.method !== soaMethodFilter) return false;
                                            if (soaProjectFilter && soaProjectFilter !== 'ALL') {
                                                const hasProject = tx.projectId !== null && tx.projectId !== undefined;
                                                if (soaProjectFilter === 'GENERAL') { if (hasProject) return false; }
                                                else { if (!hasProject || tx.projectId?.toString() !== soaProjectFilter) return false; }
                                            }
                                            if (soaSearchQuery) {
                                                const q = soaSearchQuery.toLowerCase();
                                                if (!tx.number?.toLowerCase().includes(q) && !tx.ref?.toLowerCase().includes(q)) return false;
                                            }
                                            return true;
                                        });

                                        // 6. Calculate Initial Balance
                                        let initialBalance = 0;
                                        if (filteredTxs.length > 0) {
                                            const firstVisibleIndex = historyWithBalance.findIndex(tx => tx === filteredTxs[0]);
                                            if (firstVisibleIndex > 0) initialBalance = historyWithBalance[firstVisibleIndex - 1].balance;
                                        } else if (historyWithBalance.length > 0 && soaDateFrom) {
                                            const lastBeforeDate = historyWithBalance.filter(tx => tx.date < new Date(soaDateFrom)).pop();
                                            initialBalance = lastBeforeDate ? lastBeforeDate.balance : 0;
                                        }

                                        const displayedTxs = [...filteredTxs].reverse();

                                        return (
                                            <div className="flex flex-col">
                                                <div className="bg-gray-900 text-white p-6 rounded-t-[2rem] flex justify-between items-center shadow-lg no-print">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-white/10 p-2 rounded-2xl"><Activity size={18} /></div>
                                                        <span className="text-xs font-black uppercase tracking-widest opacity-70">الرصيد الابتدائي (Solde Initial)</span>
                                                    </div>
                                                    <span className={`text-2xl font-black font-sans ${initialBalance > 0.01 ? 'text-red-400' : (initialBalance < -0.01 ? 'text-emerald-400' : 'text-white')}`}>
                                                        {initialBalance.toLocaleString()} دج
                                                    </span>
                                                </div>

                                                <table className="w-full text-right border-collapse min-w-[1000px] print-area">
                                                    <thead>
                                                        <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                                            <th className="p-4 text-center">N°</th>
                                                            <th className="p-4">تاريخ العملية</th>
                                                            <th className="p-4">رقم العملية</th>
                                                            <th className="p-4 text-red-600">مشتريات (دج)</th>
                                                            <th className="p-4">طريقة الدفع</th>
                                                            <th className="p-4">البيان (Motif)</th>
                                                            <th className="p-4 text-center">المرجع / الطلبية</th>
                                                            <th className="p-4 text-emerald-600">المدفوعات (دج)</th>
                                                            <th className="p-4 bg-gray-100/50 text-gray-900">الرصيد المستحق (دج)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {displayedTxs.map((tx, idx) => (
                                                            <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors font-bold text-sm">
                                                                <td className="p-4 text-center text-gray-400 font-sans">{filteredTxs.length - idx}</td>
                                                                <td className="p-4 font-sans">{tx.date.toLocaleDateString('ar-DZ')}</td>
                                                                <td className="p-4 font-sans text-xs">{tx.number}</td>
                                                                <td className="p-4 font-sans text-red-600">
                                                                    {tx.achat !== 0 ? (
                                                                        <span className={tx.achat < 0 ? 'text-emerald-600' : ''}>
                                                                            {tx.achat.toLocaleString()}
                                                                        </span>
                                                                    ) : '---'}
                                                                </td>
                                                                <td className="p-4 text-xs">
                                                                    {tx.method !== '---' ? <span className="bg-gray-100 px-2 py-1 rounded-xl">{tx.method}</span> : '---'}
                                                                </td>
                                                                <td className="p-4">
                                                                    <span className={`text-[10px] px-2 py-1 rounded-xl ${
                                                                        tx.type === 'PURCHASE' ? 'bg-red-50 text-red-700' :
                                                                        tx.type === 'RETURN' ? 'bg-orange-50 text-orange-700' :
                                                                        tx.type === 'REFUND' ? 'bg-purple-50 text-purple-700' :
                                                                        'bg-emerald-50 text-emerald-700'
                                                                    }`}>
                                                                        {tx.motif}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 text-center font-sans text-[11px] text-gray-500">{tx.ref}</td>
                                                                <td className="p-4 font-sans text-emerald-600">
                                                                    {tx.versement !== 0 ? (
                                                                        <span className={tx.versement < 0 ? 'text-purple-600' : ''}>
                                                                            {tx.versement.toLocaleString()}
                                                                        </span>
                                                                    ) : '---'}
                                                                </td>
                                                                <td className={`p-4 font-sans bg-gray-50/30 ${tx.balance > 0.01 ? 'text-red-600' : (tx.balance < -0.01 ? 'text-emerald-600' : 'text-gray-400')}`}>
                                                                    {Math.abs(tx.balance) < 0.01 ? '0' : tx.balance.toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {activeTab === 'orders' && (() => {
                                const purchaseOrders = (supplier?.orders || []).filter((o: any) => o.type === 'PURCHASE');
                                const totalPurchases = purchaseOrders.reduce((s, o) => s + (o.total || 0), 0);
                                const totalPaid = purchaseOrders.reduce((s, o) => s + (o.invoice?.paid || 0), 0);
                                const totalRemaining = totalPurchases - totalPaid;

                                return (
                                    <div className="flex flex-col gap-0 animate-in fade-in slide-in-from-bottom-4 duration-500 no-print">
                                        {/* Summary bar */}
                                        <div className="bg-gray-50/50 border-b border-gray-100 p-6 grid grid-cols-3 gap-4">
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي الطلبيات</p>
                                                <p className="text-2xl font-black text-gray-900 font-sans">{purchaseOrders.length}</p>
                                            </div>
                                            <div className="text-center border-x border-gray-100">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي المشتريات</p>
                                                <p className="text-2xl font-black text-gray-900 font-sans">{totalPurchases.toLocaleString()} دج</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">المستحقات المتبقية</p>
                                                <p className={`text-2xl font-black font-sans ${totalRemaining > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}>{totalRemaining.toLocaleString()} دج</p>
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            <div className="mb-6 flex items-center gap-3">
                                                <div className="bg-blue-50 p-2 rounded-2xl text-blue-600"><ShoppingCart size={18} /></div>
                                                <div>
                                                    <h3 className="font-black text-gray-900">طلبيات عامة / بدون مشروع</h3>
                                                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">طلبيات لم تُربط بأي مشروع</p>
                                                </div>
                                            </div>

                                            <InvoicesTable
                                                invoices={purchaseOrders.map((o: any) => {
                                                    const returnsValue = (o.items || []).reduce((sum: number, item: any) => sum + ((item.returnedQuantity || 0) * item.unitPrice), 0);
                                                    const netTotal = o.total || 0;
                                                    const paid = o.invoice?.paid || 0;
                                                    const remaining = o.invoice?.remaining ?? (netTotal - paid);
                                                    return {
                                                        ...o.invoice,
                                                        id: o.invoice?.id,
                                                        invoiceNumber: o.invoice?.invoiceNumber || o.orderNumber,
                                                        customerName: supplier.name,
                                                        projectName: o.project?.name || 'عام',
                                                        total: netTotal,
                                                        originalTotal: netTotal + returnsValue,
                                                        returnsValue,
                                                        remaining,
                                                        paid,
                                                        order: o,
                                                        date: o.orderDate
                                                    };
                                                })}
                                                loading={loading}
                                                hideParty={true}
                                                invoiceType="PURCHASE"
                                                setSelectedInvoice={setSelectedInvoice}
                                                setShowPaymentModal={setShowPaymentModal}
                                                setPaymentAmount={setPaymentAmount}
                                                handleRefundExcess={handleRefundExcess}
                                                setShowHistoryModal={setShowHistoryModal}
                                                fetchPaymentHistory={fetchPaymentHistory}
                                                setShowReturnsModal={setShowReturnsModal}
                                                fetchReturnsHistory={fetchReturnsHistory}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}

                            {activeTab === 'products' && (
                                <div className="no-print">
                                    <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-purple-600 text-white p-3 rounded-2xl shadow-lg"><Package size={24} /></div>
                                            <div className="text-right">
                                                <h2 className="text-xl font-black text-gray-900">قائمة المنتجات الموردة</h2>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">إجمالي المنتجات المسجلة: {supplier.products.length}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    placeholder="بحث عن منتج..."
                                                    value={productSearchQuery}
                                                    onChange={(e) => setProductSearchQuery(e.target.value)}
                                                    className="bg-white border border-gray-200 text-gray-700 pr-12 pl-5 py-2.5 rounded-2xl text-xs font-black shadow-sm focus:ring-4 focus:ring-purple-100 outline-none w-64 transition-all hover:border-purple-300"
                                                />
                                            </div>
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setIsProductExportDropdownOpen(!isProductExportDropdownOpen)}
                                                    className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-sm hover:border-gray-900 transition-all"
                                                >
                                                    <FileDown size={18} /> تصدير البيانات <ChevronDown size={14} />
                                                </button>
                                                {isProductExportDropdownOpen && (
                                                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[100] animate-in fade-in zoom-in-95 origin-top-left">
                                                        <button onClick={exportProductsCSV} className="w-full text-right px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                            <FileSpreadsheet size={16} className="text-green-600" /> Excel (CSV)
                                                        </button>
                                                        <button onClick={() => window.print()} className="w-full text-right px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                            <FileText size={16} className="text-red-500" /> PDF (Print)
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => window.print()}
                                                className="bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
                                            >
                                                <Printer size={18} /> طباعة القائمة
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-0 overflow-x-auto">
                                        <table className="w-full text-right border-collapse" id="products-table-print">
                                            <thead>
                                                <tr className="bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                                    <th className="p-6">المنتج</th>
                                                    <th className="p-6">أول شراء</th>
                                                    <th className="p-6">آخر شراء</th>
                                                    <th className="p-6 text-center">إجمالي المشتريات</th>
                                                    <th className="p-6 text-center">المخزون الحالي</th>
                                                    <th className="p-6 text-center no-print">أدوات التحكم</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {(() => {
                                                    const filtered = supplier.products.filter(p => 
                                                        p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || 
                                                        (p.code || '').toLowerCase().includes(productSearchQuery.toLowerCase())
                                                    );
                                                    
                                                    if (filtered.length === 0) {
                                                        return (
                                                            <tr>
                                                                <td colSpan={6} className="p-20 text-center text-gray-300">
                                                                    <Package size={64} className="mx-auto mb-4 opacity-20" />
                                                                    <p className="text-xl font-black">{productSearchQuery ? 'لا توجد نتائج لبحثك' : 'لا توجد منتجات مسجلة لهذا المورد'}</p>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    return filtered.map(p => (
                                                        <tr key={p.id} className="hover:bg-purple-50/30 transition-all group">
                                                            <td className="p-6">
                                                                <div className="flex flex-col">
                                                                    <span className="font-black text-gray-900 group-hover:text-purple-700 transition-colors">{p.name}</span>
                                                                    <span className="text-[10px] font-black text-gray-400 font-sans">{p.code || 'بدون كود'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-6">
                                                                <span className="text-xs font-bold text-gray-600 font-sans">
                                                                    {p.firstPurchase ? new Date(p.firstPurchase).toLocaleDateString('ar-DZ') : '---'}
                                                                </span>
                                                            </td>
                                                            <td className="p-6">
                                                                <span className="text-xs font-bold text-gray-600 font-sans">
                                                                    {p.lastPurchase ? new Date(p.lastPurchase).toLocaleDateString('ar-DZ') : '---'}
                                                                </span>
                                                            </td>
                                                            <td className="p-6 text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-sm font-black text-indigo-600">{p.totalPurchasedQty.toLocaleString()} {p.unit}</span>
                                                                    <span className="text-[10px] font-black text-gray-400 font-sans">{(p.totalPurchasedAmount || 0).toLocaleString()} دج</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-6 text-center">
                                                                <span className={`inline-block px-3 py-1 rounded-2xl text-[11px] font-black ${p.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                                    {p.quantity.toLocaleString()} {p.unit}
                                                                </span>
                                                            </td>
                                                            <td className="p-6 text-center no-print">
                                                                <button 
                                                                    onClick={() => setSelectedProductForBatches(p)}
                                                                    className="bg-gray-900 text-white px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 mx-auto hover:bg-purple-700 transition-all shadow-md"
                                                                >
                                                                    <History size={14} /> سجل مشتريات
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
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
                                        <button onClick={() => setReturnQty(returnModal.maxQty)} className="text-[10px] font-black bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl hover:bg-amber-200">تحديد الكل ({returnModal.maxQty})</button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-2xl text-sm font-bold flex justify-between">
                                    <span className="text-gray-500">قيمة الإرجاع:</span>
                                    <span className="text-green-600 font-black">{(returnQty * returnModal.item.unitPrice).toLocaleString()} دج</span>
                                </div>

                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-xs font-bold text-blue-800">
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
                                        <button onClick={() => setPayAmount((supplier.balanceDue / 2).toString())} className="text-[10px] font-black bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl hover:bg-gray-200">نصف المبلغ</button>
                                        <button onClick={() => setPayAmount(supplier.balanceDue.toString())} className="text-[10px] font-black bg-green-100 text-green-700 px-3 py-1.5 rounded-xl hover:bg-green-200">دفع الكل</button>
                                    </div>
                                </div>

                                {parseFloat(payAmount) > 0 && (
                                    <div className="bg-gray-50 p-4 rounded-2xl text-sm font-bold flex justify-between">
                                        <span className="text-gray-500">الرصيد بعد الدفع:</span>
                                        <span className={`font-black ${(supplier.balanceDue - parseFloat(payAmount)) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {(supplier.balanceDue - parseFloat(payAmount)).toLocaleString()} دج
                                        </span>
                                    </div>
                                )}

                                {parseFloat(payAmount) > supplier.balanceDue && (
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-center gap-2 text-xs font-bold text-red-700">
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

                {/* EDIT SUPPLIER SHEET */}
                {isEditSheetOpen && (
                    <div className="fixed inset-0 z-[200] flex justify-end no-print">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsEditSheetOpen(false)} />
                        <div className="bg-white w-full max-w-md h-full z-10 p-6 flex flex-col shadow-2xl border-l border-gray-200 animate-in slide-in-from-right">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Building className="text-indigo-600" /> تعديل بيانات المورد
                            </h2>

                            <div className="space-y-4 flex-1 overflow-y-auto" onKeyDown={handleEditKeyDown}>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-gray-700">اسم المورد <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" value={formData.name} 
                                        onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} 
                                        onBlur={() => setFieldTouched('name')}
                                        className={`w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 transition-all font-black text-sm uppercase
                                            ${touched.name && !validations.name ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-gray-300 focus:ring-indigo-500'}`} 
                                        placeholder="اسم الشركة أو المورد..." required 
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1 block">النشاط التجاري <span className="text-red-500">*</span></label>
                                    {(() => {
                                        const predefinedActivities = [
                                            "Fabricant de Câbles & Fils Électriques", "Fabricant de Matériel Électrique", "Fabricant d'Éclairage & LED",
                                            "Fabricant d'Appareillage Électrique", "Grossiste en Matériel Électrique", "Importateur de Matériel Électrique",
                                            "Commerce en Gros d'Électricité", "Distributeur Agréé", "Fabricant de Coffrets & Tableaux",
                                            "Fabricant de Gaines & Tubes", "Fournisseur d'Équipements Industriels",
                                        ];
                                        const currentActivity = formData.activity || '';
                                        const isCustom = currentActivity === 'Autre' || (currentActivity && !predefinedActivities.includes(currentActivity));
                                        const selectValue = isCustom ? 'Autre' : currentActivity;
                                        return (
                                            <>
                                                <select
                                                    value={selectValue}
                                                    onChange={e => setFormData({ ...formData, activity: e.target.value })}
                                                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 font-bold text-sm"
                                                >
                                                    {predefinedActivities.map(a => <option key={a} value={a}>{a}</option>)}
                                                    <option value="Autre">Autre (saisie manuelle)</option>
                                                </select>
                                                {isCustom && (
                                                    <input
                                                        type="text"
                                                        value={currentActivity === 'Autre' ? '' : currentActivity}
                                                        onChange={e => setFormData({ ...formData, activity: e.target.value || 'Autre' })}
                                                        onBlur={() => setFieldTouched('activity')}
                                                        placeholder="أدخل النشاط التجاري يدوياً..."
                                                        className={`w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 transition-all mt-2
                                                            ${touched.activity && !validations.activity ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-amber-400 focus:ring-amber-500/50 text-gray-900'}`}
                                                    />
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-gray-700">رقم الهاتف (اختياري)</label>
                                    <input
                                        type="text" maxLength={10} value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-sans font-bold"
                                        dir="ltr"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1 block">البريد الإلكتروني</label>
                                    <input
                                        type="email" dir="ltr"
                                        value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-sans font-bold"
                                    />
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-gray-700 block">العنوان <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value.toUpperCase() })} 
                                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm uppercase" 
                                            placeholder="Cité, Street, Ave..." required 
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-gray-700 block">الولاية <span className="text-red-500">*</span></label>
                                            <select 
                                                value={formData.wilaya} 
                                                onChange={e => setFormData({ ...formData, wilaya: e.target.value })}
                                                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm bg-white"
                                            >
                                                {ALGERIA_LOCATIONS.map(w => <option key={w.id} value={w.arabicName}>{w.id} - {w.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-gray-700 block">البلدية <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" value={formData.commune} onChange={e => setFormData({ ...formData, commune: e.target.value.toUpperCase() })} 
                                                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm bg-white uppercase" 
                                                placeholder="البلدية..." required 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 space-y-3">
                                    <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest">الهوية الجبائية والقانونية</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500">سجل تجاري (RC)</label>
                                            <input type="text" maxLength={10} value={formData.rc} onChange={e => setFormData({ ...formData, rc: e.target.value.toUpperCase() })} className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold font-sans" dir="ltr" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500">رقم التعريف الجبائي (NIF)</label>
                                            <input type="text" maxLength={15} value={formData.nif} onChange={e => setFormData({ ...formData, nif: e.target.value })} className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold font-sans" dir="ltr" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500">رقم المادة (AI)</label>
                                            <input type="text" maxLength={11} value={formData.ai} onChange={e => setFormData({ ...formData, ai: e.target.value })} className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold font-sans" dir="ltr" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500">رقم التعريف الإحصائي (NIS)</label>
                                            <input type="text" maxLength={15} value={formData.nis} onChange={e => setFormData({ ...formData, nis: e.target.value })} className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold font-sans" dir="ltr" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-gray-200 mt-4">
                                <button onClick={() => setIsEditSheetOpen(false)} className="flex-[0.5] border border-gray-300 bg-white text-gray-700 py-2.5 rounded-xl font-bold text-sm">إلغاء</button>
                                <button onClick={handleSaveEdit} disabled={!validations.name} className="flex-1 bg-indigo-600 text-white disabled:opacity-50 py-2.5 rounded-xl font-bold text-sm shadow-sm">حفظ التغييرات</button>
                            </div>
                        </div>
                    </div>
                )}
                {/* INVOICE VIEW MODAL */}
                {selectedInvoice && (
                    <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4 no-print">
                        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100"><Building size={24} /></div>
                                    <div className="text-right">
                                        <h2 className="text-xl font-black text-gray-900">معاينة فاتورة الشراء</h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedInvoice.invoiceNumber}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            const printContent = document.getElementById('invoice-print-area');
                                            if (printContent) {
                                                const original = document.body.innerHTML;
                                                document.body.innerHTML = printContent.innerHTML;
                                                window.print();
                                                document.body.innerHTML = original;
                                                window.location.reload();
                                            }
                                        }}
                                        className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-blue-100 hover:scale-105 transition-all"
                                    >
                                        <Printer size={18} /> طباعة الفاتورة
                                    </button>
                                    <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2 bg-white rounded-2xl border border-gray-100 shadow-sm"><X size={24} /></button>
                                </div>
                            </div>
                            <div className="p-8 overflow-y-auto flex-1">
                                <div id="invoice-print-area" className="bg-white p-4">
                                    <div className="text-center mb-10 border-b-2 border-gray-900 pb-6 hidden print:block">
                                        <h1 className="text-4xl font-black text-gray-900 tracking-wide uppercase">SKR Stock</h1>
                                        <p className="text-gray-600 text-lg font-medium mt-1">Fournisseur de Matériel Électrique</p>
                                    </div>

                                    <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
                                        <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl flex-1 w-full order-2 md:order-1">
                                            <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tighter uppercase">Facture d'Achat</h2>
                                            <p className="text-sm font-bold text-gray-600 mb-1">N° Facture: <span className="text-gray-900 font-sans" dir="ltr">{selectedInvoice.invoiceNumber}</span></p>
                                            <p className="text-sm font-bold text-gray-600">Date: <span className="text-gray-900 font-sans">{formatDate(selectedInvoice.date)}</span></p>
                                        </div>
                                        <div className="border-l-4 border-blue-600 pl-5 flex-1 w-full order-1 md:order-2 text-left" dir="ltr">
                                            <p className="text-xs font-black text-blue-600 mb-1 uppercase tracking-widest">FOURNISSEUR:</p>
                                            <p className="text-xl font-black text-gray-900 leading-tight">{supplier.name}</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {supplier.phone && <span className="text-xs font-bold bg-gray-50 text-gray-500 px-2 py-0.5 rounded font-sans" dir="ltr">{supplier.phone}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <table className="w-full text-left border-collapse mb-8" dir="ltr">
                                        <thead className="bg-gray-900 text-white">
                                            <tr>
                                                <th className="px-4 py-3 font-bold w-12 text-center rounded-tl-lg">#</th>
                                                <th className="px-4 py-3 font-bold">Désignation</th>
                                                <th className="px-4 py-3 font-bold text-center w-24">Qté</th>
                                                <th className="px-4 py-3 font-bold text-center w-32">P. Unitaire</th>
                                                <th className="px-4 py-3 font-bold text-right w-36 rounded-tr-lg">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-800">
                                            {(selectedInvoice.order?.items || []).map((item: any, idx: number) => (
                                                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                                    <td className="px-4 py-4 text-center text-gray-400 font-sans">{idx + 1}</td>
                                                    <td className="px-4 py-4 font-bold text-left">{item.product?.name}</td>
                                                    <td className="px-4 py-4 text-center font-bold font-sans">{item.quantity}</td>
                                                    <td className="px-4 py-4 text-center font-bold font-sans">{item.unitPrice.toLocaleString()}</td>
                                                    <td className="px-4 py-4 text-right font-black text-gray-900 font-sans">{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                                </tr>
                                            ))}
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
                                                        <div className="flex justify-between w-full opacity-90 text-sm mb-2 font-black">
                                                            <span>Total Net:</span>
                                                            <span className="font-sans">{selectedInvoice.total.toLocaleString()} DZD</span>
                                                        </div>
                                                        <div className="flex justify-between w-full opacity-60 text-xs mb-4">
                                                            <span>Montant Payé:</span>
                                                            <span className="font-sans">{selectedInvoice.paid.toLocaleString()}</span>
                                                        </div>
                                                        <div className="w-full h-px bg-white/10 mb-4"></div>
                                                        <span className="text-sm font-bold opacity-70">Reste à Payer au Fournisseur</span>
                                                        <span className="text-3xl font-black font-sans leading-none text-red-400">
                                                            {selectedInvoice.remaining.toLocaleString()} DZD
                                                        </span>
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

                {/* HISTORY MODAL */}
                {showHistoryModal && (
                    <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4 no-print">
                        <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-gray-900 text-white p-3 rounded-2xl shadow-lg"><History size={24} /></div>
                                    <div className="text-right">
                                        <h2 className="text-xl font-black text-gray-900">سجل مدفوعات فاتورة الشراء</h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{showHistoryModal.invoiceNumber}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const printContent = document.getElementById('full-history-print');
                                            if (printContent) {
                                                const original = document.body.innerHTML;
                                                document.body.innerHTML = printContent.innerHTML;
                                                window.print();
                                                document.body.innerHTML = original;
                                                window.location.reload();
                                            }
                                        }}
                                        className="bg-gray-900 text-white px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg"
                                    >
                                        <Printer size={16} /> طباعة السجل
                                    </button>
                                    <button onClick={() => setShowHistoryModal(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2"><X size={24} /></button>
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
                                        {showHistoryModal.payments.map((p: any) => (
                                            <div key={p.id} className="relative">
                                                <div className="absolute top-2 -right-[23px] w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm ring-2 ring-blue-100"></div>
                                                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col gap-2 hover:bg-white hover:shadow-lg transition-all group">
                                                    <div className="flex justify-between items-center text-right" dir="rtl">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-lg font-black font-sans text-gray-900">
                                                                {Math.abs(p.amount).toLocaleString()} دج
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    const printContent = document.getElementById(`receipt-${p.id}`);
                                                                    if (printContent) {
                                                                        const original = document.body.innerHTML;
                                                                        document.body.innerHTML = printContent.innerHTML;
                                                                        window.print();
                                                                        document.body.innerHTML = original;
                                                                        window.location.reload();
                                                                    }
                                                                }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl hover:opacity-90 transition-all shadow-md no-print"
                                                            >
                                                                <Printer size={12} />
                                                                <span className="text-[10px] font-black">طباعة الوصل</span>
                                                            </button>
                                                        </div>
                                                        <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase text-blue-600 bg-blue-50">
                                                            {p.paymentMethod}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 justify-end" dir="rtl">
                                                        <span>{new Date(p.paymentDate).toLocaleString('ar-DZ')}</span>
                                                        <Clock size={12} />
                                                    </div>

                                                    {/* Hidden Receipt Template */}
                                                    <div id={`receipt-${p.id}`} className="hidden">
                                                        <div className="p-10 font-sans text-left" dir="ltr">
                                                            <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                                                                <div>
                                                                    <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase">REÇU DE PAIEMENT (ACHAT)</h1>
                                                                    <p className="text-gray-500 font-bold">Réf: {p.id}</p>
                                                                </div>
                                                                <div className="text-right"><p className="text-xl font-black text-blue-600">SKR Stock</p></div>
                                                            </div>
                                                            <div className="space-y-6">
                                                                <div className="flex justify-between border-b border-gray-100 py-4"><span className="text-gray-500 font-bold uppercase text-xs">Date:</span><span className="font-black font-sans">{new Date(p.paymentDate).toLocaleString('fr-FR')}</span></div>
                                                                <div className="flex justify-between border-b border-gray-100 py-4"><span className="text-gray-500 font-bold uppercase text-xs">Fournisseur:</span><span className="font-black">{supplier.name}</span></div>
                                                                <div className="flex justify-between border-b border-gray-100 py-4"><span className="text-gray-500 font-bold uppercase text-xs">Référence Achat:</span><span className="font-black">{showHistoryModal.invoiceNumber}</span></div>
                                                                <div className="flex justify-between border-b border-gray-100 py-4"><span className="text-gray-500 font-bold uppercase text-xs">Mode:</span><span className="font-black">{p.paymentMethod}</span></div>
                                                                <div className="bg-gray-900 text-white p-8 rounded-3xl mt-10 text-center shadow-2xl">
                                                                    <p className="text-xs font-bold opacity-60 mb-2 tracking-widest uppercase">MONTANT PAYÉ</p>
                                                                    <p className="text-5xl font-black font-sans">{Math.abs(p.amount).toLocaleString()} DZD</p>
                                                                    <p className="mt-4 text-[10px] font-bold italic opacity-50 uppercase tracking-widest">Arrêté à la somme de: {numberToFrenchWords(Math.abs(p.amount))} Dinars Algériens</p>
                                                                </div>
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
                                    <p className="text-[10px] font-black text-gray-400 uppercase">إجمالي المسدد للمورد</p>
                                    <p className="text-xl font-black text-green-600 font-sans">{showHistoryModal.paid.toLocaleString()} دج</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase text-left">المتبقي للمورد</p>
                                    <p className="text-xl font-black font-sans text-left text-red-600">
                                        {showHistoryModal.remaining.toLocaleString()} دج
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* RETURNS MODAL */}
                {showReturnsModal && (
                    <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4 no-print">
                        <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-orange-600 text-white p-3 rounded-2xl shadow-lg"><ShoppingBag size={24} /></div>
                                    <div className="text-right">
                                        <h2 className="text-xl font-black text-gray-900">سجل مرتجعات الشراء</h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{showReturnsModal.invoiceNumber}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowReturnsModal(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2"><X size={24} /></button>
                            </div>
                            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
                                {!showReturnsModal.returns || showReturnsModal.returns.length === 0 ? (
                                    <div className="py-20 text-center text-gray-300 flex flex-col items-center gap-4">
                                        <RotateCcw size={48} className="animate-spin-slow text-orange-200" />
                                        <p className="font-black">لا توجد مرتجعات مسجلة لهذه الفاتورة</p>
                                    </div>
                                ) : (
                                    showReturnsModal.returns.map((r: any) => (
                                        <div key={r.id} className="bg-orange-50/30 p-5 rounded-2xl border border-orange-100/50 flex flex-col gap-3 group hover:bg-white hover:shadow-xl transition-all">
                                            <div className="flex justify-between items-start">
                                                <div className="text-right"><p className="text-lg font-black text-orange-600 font-sans">{r.totalAmount?.toLocaleString()} دج</p></div>
                                                <div className="text-left flex flex-col items-end">
                                                    <span className="text-[10px] font-black text-gray-400 font-sans tracking-tighter">#{r.orderNumber}</span>
                                                    <span className="text-[10px] font-bold text-gray-500">{new Date(r.orderDate).toLocaleString('ar-DZ')}</span>
                                                </div>
                                            </div>
                                            <div className="bg-orange-100/30 p-3 rounded-2xl border border-orange-100">
                                                <div className="space-y-1">
                                                    {r.items?.map((item: any, i: number) => (
                                                        <div key={i} className="flex justify-between items-center text-[10px] font-bold text-gray-600">
                                                            <span className="font-sans">({item.quantity}) x {item.unitPrice.toLocaleString()} دج</span>
                                                            <span className="text-gray-900">{item.product?.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}


                {/* PAYMENT REGISTRATION MODAL */}
                {showPaymentModal && (
                    <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4">
                        <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">تسجيل دفعة مالية للمورد</h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{showPaymentModal.invoiceNumber}</p>
                                </div>
                                <button onClick={() => setShowPaymentModal(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2"><X size={24} /></button>
                            </div>

                            <div className="p-8 flex flex-col gap-6">
                                <div className="p-6 bg-blue-50 border-blue-100 rounded-3xl border flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-blue-800 uppercase mb-1">المبلغ المتبقي للمورد</p>
                                        <p className="text-2xl font-black text-blue-900 font-sans">{showPaymentModal.remaining.toLocaleString()} دج</p>
                                    </div>
                                    <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><CreditCard size={24} /></div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">المبلغ المدفوع للمورد (دج)</label>
                                        <input
                                            type="number"
                                            value={payAmount || ''}
                                            onChange={e => setPayAmount(Math.min(showPaymentModal.remaining, parseFloat(e.target.value) || 0).toString())}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-black font-sans text-lg focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="0"
                                        />
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
                                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 mr-1">اسم البنك</label>
                                                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:bg-white" placeholder="اسم البنك..." />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 mr-1">رقم المرجع / الشيك</label>
                                                <input type="text" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:bg-white" placeholder="رقم الشيك..." />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">ملاحظات إضافية</label>
                                        <textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:bg-white" rows={2} placeholder="أضف ملاحظة هنا..."></textarea>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRecordPayment}
                                    disabled={isSubmitting || !payAmount || parseFloat(payAmount) <= 0}
                                    className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4 flex justify-center items-center gap-3"
                                >
                                    {isSubmitting ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle size={24} />}
                                    تأكيد الدفع للمورد
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                 {/* PRODUCT BATCHES MODAL */}
                {selectedProductForBatches && (
                    <div className="fixed inset-0 z-[300] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4 no-print">
                        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100"><History size={24} /></div>
                                    <div className="text-right">
                                        <h2 className="text-xl font-black text-gray-900">سجل مشتريات المنتج</h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedProductForBatches.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            const printContent = document.getElementById('batches-print-area');
                                            if (printContent) {
                                                const original = document.body.innerHTML;
                                                document.body.innerHTML = printContent.innerHTML;
                                                window.print();
                                                document.body.innerHTML = original;
                                                window.location.reload();
                                            }
                                        }}
                                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-100 hover:scale-105 transition-all"
                                    >
                                        <Printer size={18} /> طباعة السجل
                                    </button>
                                    <button onClick={() => setSelectedProductForBatches(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2 bg-white rounded-2xl border border-gray-100 shadow-sm"><X size={24} /></button>
                                </div>
                            </div>
                            
                            <div className="p-8 overflow-y-auto flex-1" id="batches-print-area">
                                <div className="hidden print:block mb-8 border-b-2 border-gray-900 pb-4 text-center">
                                    <h1 className="text-2xl font-black uppercase">سجل دفعات الشراء</h1>
                                    <p className="text-sm font-bold mt-1">المنتج: {selectedProductForBatches.name}</p>
                                    <p className="text-sm font-bold">المورد: {supplier.name}</p>
                                    <p className="text-[10px] text-gray-400 mt-2">تاريخ الكشف: {new Date().toLocaleString('ar-DZ')}</p>
                                </div>

                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                                            <th className="p-4">التاريخ</th>
                                            <th className="p-4 text-center">رقم الطلبية</th>
                                            <th className="p-4 text-center">الكمية</th>
                                            <th className="p-4 text-center">سعر الوحدة</th>
                                            <th className="p-4 text-center">الإجمالي</th>
                                            <th className="p-4 text-center no-print">إجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedProductForBatches.purchaseHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-12 text-center text-gray-300 font-bold">لا توجد سجلات شراء مفصلة</td>
                                            </tr>
                                        ) : (
                                            selectedProductForBatches.purchaseHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((h: any, i: number) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="p-4 font-sans font-bold text-xs">{new Date(h.date).toLocaleDateString('ar-DZ')}</td>
                                                    <td className="p-4 text-center font-sans font-bold text-xs text-gray-500">{h.orderNumber}</td>
                                                    <td className="p-4 text-center font-black text-gray-900">{h.quantity.toLocaleString()} {selectedProductForBatches.unit}</td>
                                                    <td className="p-4 text-center font-sans font-bold text-xs text-blue-600">{h.unitPrice.toLocaleString()} دج</td>
                                                    <td className="p-4 text-center font-sans font-black text-sm text-gray-900">{h.total.toLocaleString()} دج</td>
                                                    <td className="p-4 text-center no-print">
                                                        {h.quantity > (h.returnedQuantity || 0) && (
                                                            <button 
                                                                onClick={() => {
                                                                    const maxReturnable = Math.min(h.quantity - (h.returnedQuantity || 0), selectedProductForBatches.quantity);
                                                                    setReturnModal({ item: h, maxQty: maxReturnable });
                                                                    setReturnQty(1);
                                                                }}
                                                                disabled={selectedProductForBatches.quantity <= 0}
                                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1 mx-auto ${selectedProductForBatches.quantity > 0 ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                                            >
                                                                <RotateCcw size={12} /> إرجاع
                                                            </button>
                                                        )}
                                                        {h.returnedQuantity > 0 && (
                                                            <div className="text-[9px] font-bold text-amber-600 mt-1">تم إرجاع {h.returnedQuantity}</div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    {selectedProductForBatches.purchaseHistory.length > 0 && (
                                        <tfoot>
                                            <tr className="bg-indigo-50/30 font-black">
                                                <td colSpan={2} className="p-4 text-right text-indigo-700">المجموع الكلي</td>
                                                <td className="p-4 text-center text-indigo-700">{selectedProductForBatches.totalPurchasedQty.toLocaleString()} {selectedProductForBatches.unit}</td>
                                                <td className="p-4"></td>
                                                <td className="p-4 text-center text-indigo-700">{(selectedProductForBatches.totalPurchasedAmount || 0).toLocaleString()} دج</td>
                                                <td className="p-4"></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
