'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Building2, ChevronRight, Phone, Mail, MapPin, Package, ShoppingCart,
    ArrowDownLeft, ArrowUpRight, CreditCard, X, CheckCircle, AlertTriangle,
    ChevronDown, ChevronUp, RotateCcw, Calendar, DollarSign, Printer, Activity,
    Edit, Building, History, ShoppingBag, Clock, Eye, Search, Download, FileSpreadsheet,
    FileText, Briefcase, Star, FileDown, Check, Info, MoreVertical, ExternalLink, Banknote, Power, Archive
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { formatDate } from '@/lib/utils';
import { ALGERIA_LOCATIONS } from '@/lib/constants/algeria-locations';
import { printDocument } from '@/lib/print-helper';
import { InvoicesTable, StatusBadge } from '@/components/InvoicesTable';
import DateRangePicker from '@/components/DateRangePicker';
import ReturnModal from '@/components/ReturnModal';
import * as xlsx from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    type: string;
    project?: { name: string };
    invoice?: { supplierPayments: any[] };
}

interface SupplierPayment {
    id: number;
    amount: number;
    paymentDate: string;
    notes: string | null;
    paymentMethod: string;
}

interface Supplier {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    commune: string | null;
    wilaya: string | null;
    postalCode: string | null;
    rc: string | null;
    nif: string | null;
    ai: string | null;
    nis: string | null;
    activity: string | null;
    createdAt: string;
    balanceDue: number;
    products: { id: number; name: string; code: string | null; quantity: number; unit: string; purchasePrice: number; totalPurchasedQty: number; firstPurchase: string; lastPurchase: string }[];
    orders: Order[];
    payments: SupplierPayment[];
}

export default function SupplierDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ORDERS' | 'SOA' | 'ANALYTICS' | 'PRODUCTS'>('ORDERS');
    const [isSupplierDetailsOpen, setIsSupplierDetailsOpen] = useState(false);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);

    // Filters & Pagination for Orders Tab
    const [generalOrderSearch, setGeneralOrderSearch] = useState('');
    const [generalOrderStatusFilter, setGeneralOrderStatusFilter] = useState('ALL');
    const [generalOrderDateFrom, setGeneralOrderDateFrom] = useState('');
    const [generalOrderDateTo, setGeneralOrderDateTo] = useState('');
    const [generalOrderCurrentPage, setGeneralOrderCurrentPage] = useState(1);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // SOA States
    const [soaSearchQuery, setSoaSearchQuery] = useState('');
    const [soaMotifFilter, setSoaMotifFilter] = useState('ALL');
    const [soaMethodFilter, setSoaMethodFilter] = useState('ALL');
    const [soaDateFrom, setSoaDateFrom] = useState('');
    const [soaDateTo, setSoaDateTo] = useState('');

    // Edit Supplier Sheet
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [formData, setFormData] = useState({ 
        name: '', phone: '', email: '', address: '', 
        commune: "M'sila", 
        wilaya: "M'Sila",
        postCode: '28000',
        rc: '', nif: '', ai: '', nis: '', activity: ""
    });
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Modals
    const [showPaymentModal, setShowPaymentModal] = useState<any | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState<any | null>(null);
    const [showReturnsModal, setShowReturnsModal] = useState<any | null>(null);
    const [showReturnProcessModal, setShowReturnProcessModal] = useState<any | null>(null);
    const [showRefundConfirmModal, setShowRefundConfirmModal] = useState<any | null>(null);
    const [refundSuccess, setRefundSuccess] = useState(false);
    const [lastRefundId, setLastRefundId] = useState<number | null>(null);
    const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    
    // Return States
    const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
    const [isReturning, setIsReturning] = useState(false);
    
    // Payment Form
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CHEQUE' | 'BANK_TRANSFER'>('CASH');
    const [chequeNumber, setChequeNumber] = useState('');
    const [paymentBank, setPaymentBank] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');

    const fetchSupplier = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/suppliers/${id}`);
            if (res.ok) {
                const data = await res.json();
                setSupplier(data);
                // Pre-fill edit form
                setFormData({
                    name: data.name,
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                    commune: data.commune || "M'sila",
                    wilaya: data.wilaya || "M'Sila",
                    postCode: data.postalCode || '28000',
                    rc: data.rc || '',
                    nif: data.nif || '',
                    ai: data.ai || '',
                    nis: data.nis || '',
                    activity: data.activity || ""
                });
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { 
        if (id) {
            fetchSupplier(); 
            fetchSettings();
        }
    }, [id]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) setSettings(await res.json());
        } catch (e) {
            console.error('Error fetching settings:', e);
        }
    };

    const setFieldTouched = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const fetchPaymentHistory = async (inv: any) => {
        try {
            const response = await fetch(`/api/invoices/${inv.id}/payments`);
            if (response.ok) {
                const data = await response.json();
                setShowHistoryModal({ ...inv, payments: data });
            }
        } catch (error) {
            console.error('Error fetching payment history:', error);
        }
    };

    const fetchReturnsHistory = async (invoiceId: number) => {
        try {
            const response = await fetch(`/api/orders/${invoiceId}/returns`);
            if (response.ok) {
                const data = await response.json();
                setShowReturnsModal(data);
            }
        } catch (error) {
            console.error('Error fetching returns history:', error);
        }
    };


    const handleUpdateOrder = async () => {
        fetchSupplier();
    };

    const validations = {
        name: (() => {
            const words = formData.name.trim().split(/\s+/).filter(w => w.length > 0);
            return words.length >= 2 && words.slice(0, 2).every(w => w.length >= 3);
        })(),
        phone: formData.phone === '' || /^0[567]\d{8}$/.test(formData.phone),
        email: formData.email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
        address: formData.address.length >= 5 || formData.address === '',
        commune: formData.commune.length > 0,
        wilaya: formData.wilaya.length > 0,
    };

    // --- Strict Algerian Business Number Validations ---
    const validateNIF = (nif: string) => {
        if (!nif) return null;
        const clean = nif.replace(/\s/g, '');
        if (!/^\d+$/.test(clean)) return { valid: false, error: "يجب أن يحتوي على أرقام فقط بدون مسافات" };
        if (clean.length !== 15 && clean.length !== 20) return { valid: false, error: "يجب أن يكون 15 أو 20 رقماً بالضبط" };
        const cat = parseInt(clean[0]);
        if (cat > 8) return { valid: false, error: "رقم الفئة (أول رقم) يجب أن يكون بين 0 و 8" };
        const wilCode = parseInt(clean.substring(4, 6));
        if (wilCode < 1 || wilCode > 58) return { valid: false, error: `كود الولاية (${clean.substring(4, 6)}) غير صحيح (01-58)` };
        return { valid: true, breakdown: "صحيح" };
    };

    const validateNIS = (nis: string) => {
        if (!nis) return null;
        const clean = nis.replace(/\s/g, '');
        if (!/^\d+$/.test(clean)) return { valid: false, error: "يجب أن يحتوي على أرقام فقط بدون مسافات" };
        if (clean.length !== 15 && clean.length !== 18) return { valid: false, error: "يجب أن يكون 15 أو 18 رقماً بالضبط" };
        if (clean.substring(1, 4) === "000") return { valid: false, error: "سنة التأسيس (الخانة 2-4) لا يمكن أن تكون 000" };
        return { valid: true, breakdown: "صحيح" };
    };

    const validateRC = (rc: string) => {
        if (!rc) return null;
        const match1 = rc.match(/^(\d{2})\/(\d{2})-(\d{7})(?:\s([AB]))?$/i);
        if (match1) {
            const wilCode = parseInt(match1[1]);
            if (wilCode < 1 || wilCode > 58) return { valid: false, error: `كود الولاية (${match1[1]}) غير صحيح (01-58)` };
            return { valid: true, breakdown: "صحيح" };
        }
        const match2 = rc.match(/^(\d{2})\s?([AB])\s?(\d{7})(?:-(\d{2}))?$/i);
        if (match2) {
            const wilaya = match2[4];
            if (wilaya) {
                const wilCode = parseInt(wilaya);
                if (wilCode < 1 || wilCode > 58) return { valid: false, error: `كود الولاية (${wilaya}) غير صحيح (01-58)` };
            }
            return { valid: true, breakdown: "صحيح" };
        }
        if (/^\d{10}$/.test(rc)) return { valid: true, breakdown: "صحيح" };
        return { valid: false, error: "الصيغة غير صحيحة. أمثلة: 16/24-0012345 B أو 10 أرقام" };
    };

    const validateAI = (ai: string) => {
        if (!ai) return null;
        const cleanAI = ai.replace(/\s/g, '');
        if (!/^\d{11}$/.test(cleanAI)) return { valid: false, error: "رقم المادة يجب أن يتكون من 11 رقماً بالضبط" };
        const wilCode = parseInt(cleanAI.substring(0, 2));
        if (wilCode < 1 || wilCode > 58) return { valid: false, error: `كود الولاية (${cleanAI.substring(0, 2)}) غير صحيح (01-58)` };
        return { valid: true, breakdown: "صحيح" };
    };

    const nifInfo = validateNIF(formData.nif);
    const nisInfo = validateNIS(formData.nis);
    const rcInfo = validateRC(formData.rc);
    const aiInfo = validateAI(formData.ai);

    const isFormValid = 
        validations.name && 
        validations.phone && 
        (nifInfo === null || nifInfo.valid) &&
        (nisInfo === null || nisInfo.valid) &&
        (rcInfo === null || rcInfo.valid) &&
        (aiInfo === null || aiInfo.valid);

    const handleSaveSupplier = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/suppliers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    postalCode: formData.postCode // Map postCode to postalCode in DB
                })
            });
            if (res.ok) {
                setIsEditSheetOpen(false);
                fetchSupplier();
                setShowSuccessPopup(true);
            } else {
                const err = await res.json();
                alert(`خطأ: ${err.error}`);
            }
        } catch (e) { alert('حدث خطأ'); }
        finally { setIsSubmitting(false); }
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showPaymentModal || paymentAmount <= 0) return;

        setIsSubmitting(true);
        try {
            const isGlobal = showPaymentModal.isGlobal;
            const url = isGlobal ? `/api/suppliers/${id}/pay` : '/api/payments';
            
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...(isGlobal ? {} : { invoiceId: showPaymentModal.id }),
                    supplierId: parseInt(id as string),
                    amount: paymentAmount,
                    paymentMethod,
                    chequeNumber: (paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') ? chequeNumber : null,
                    bankName: (paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') ? paymentBank : null,
                    notes: paymentNotes
                })
            });

            if (res.ok) {
                await fetchSupplier();
                setShowPaymentModal(null);
                setPaymentAmount(0);
                setPaymentNotes('');
                setChequeNumber('');
                setPaymentBank('');
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

    const handleRefundExcess = (inv: any) => {
        setRefundSuccess(false);
        setLastRefundId(null);
        setShowRefundConfirmModal(inv);
    };

    const executeRefund = async () => {
        if (!showRefundConfirmModal) return;
        const inv = showRefundConfirmModal;
        const excess = Math.abs(inv.remaining);
        
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: inv.id,
                    supplierId: parseInt(id as string),
                    amount: -excess,
                    paymentMethod: 'CASH',
                    notes: 'استرجاع الفائض نقداً (تسوية رصيد زائد)'
                })
            });

            if (res.ok) {
                const data = await res.json();
                setLastRefundId(data.payment?.id || null);
                await fetchSupplier();
                setRefundSuccess(true);
                // Don't close immediately, wait for user to see success
            } else {
                const err = await res.json();
                alert(err.error || 'فشل تسجيل الاسترجاع');
            }
        } catch (e) {
            alert('خطأ في الاتصال بالخادم');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading && !supplier) return (
        <div className="flex-1 flex flex-col justify-center items-center h-screen bg-gray-50 gap-4" dir="rtl">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-gray-400">جاري تحميل بيانات المورد...</p>
        </div>
    );

    if (!supplier) return <div className="p-8 text-center text-red-500 font-black" dir="rtl">لم يتم العثور على المورد</div>;

    const totalOrders = supplier.orders.filter(o => o.type === 'PURCHASE').length;
    const totalPurchased = supplier.orders.filter(o => o.type === 'PURCHASE').reduce((s, o) => s + o.total, 0);

    return (
        <div className="font-tajawal min-h-screen bg-white text-gray-900 p-4 md:p-8 flex flex-col gap-8 print:bg-white print:p-0" dir="rtl">
            {/* Header / Breadcrumb */}
            <div className="flex flex-col gap-6 no-print">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                    <Link href="/suppliers" className="hover:text-indigo-600 transition-colors">الموردون</Link>
                    <ChevronRight size={14} className="rotate-180" />
                    <span className="text-gray-900">{supplier.name}</span>
                </div>

                {/* ===== FULL WIDTH SUPPLIER CARD (Expanding) ===== */}
                <div className="bg-white rounded-[2.5rem] border-2 border-emerald-500 shadow-xl shadow-gray-100 overflow-hidden">
                    <div 
                        onClick={() => setIsSupplierDetailsOpen(!isSupplierDetailsOpen)}
                        className="px-8 py-10 flex flex-col items-center text-center gap-4 bg-emerald-50/40 cursor-pointer hover:bg-emerald-50 transition-all group relative"
                    >
                        <div className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-emerald-600 transition-all">
                            {isSupplierDetailsOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                        
                        <div className="w-full flex items-center justify-between gap-6 max-w-4xl no-print">
                            <div className="flex-1" />
                            <div className="flex flex-col items-center gap-2 flex-1">
                                <h2 className="text-4xl font-black text-gray-900 tracking-tight">{supplier.name}</h2>
                                <span className="px-5 py-2 bg-white shadow-sm text-gray-600 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-100">
                                    {supplier.activity || 'نشاط تجاري'}
                                </span>
                            </div>
                            <div className="flex-1 flex justify-end">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsEditSheetOpen(true); }}
                                    className="bg-white border border-emerald-200 text-emerald-700 px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-sm hover:bg-emerald-50 hover:border-emerald-300 transition-all no-print"
                                >
                                    <Edit size={16} /> تعديل البيانات
                                </button>
                            </div>
                        </div>

                        {/* Quick Stats Highlights */}
                        <div className="flex items-center justify-center gap-16 py-6 w-full max-w-3xl">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 opacity-70">تاريخ الانضمام</p>
                                <p className="text-lg font-black text-gray-800 font-sans">{formatDate(supplier.createdAt)}</p>
                            </div>
                            <div className="w-px h-12 bg-emerald-200" />
                            <div className="text-center">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 opacity-70">إجمالي المشتريات</p>
                                <p className="text-lg font-black text-blue-600 font-sans">{totalPurchased.toLocaleString()} دج</p>
                            </div>
                            <div className="w-px h-12 bg-emerald-200" />
                            <div className="text-center">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 opacity-70">الرصيد الحالي</p>
                                <p className={`text-lg font-black font-sans ${supplier.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {Math.abs(supplier.balanceDue).toLocaleString()} دج
                                </p>
                            </div>
                        </div>
                    </div>

                    {isSupplierDetailsOpen && (
                        <div className="px-8 pb-10 flex flex-col gap-10 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="border-t border-gray-100" />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                {/* Section 1: Contact */}
                                <div className="flex flex-col gap-4">
                                    <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> اتصال وتواصل
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-4 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-emerald-600"><Phone size={18} /></div>
                                            <span className="font-black font-sans text-gray-900 text-base" dir="ltr">{supplier.phone || '---'}</span>
                                        </div>
                                        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-gray-400 mt-0.5"><MapPin size={18} /></div>
                                            <div className="flex flex-col gap-1">
                                                <p className="font-black text-gray-900 text-sm">{supplier.address || '---'}</p>
                                                <p className="text-gray-500 font-bold text-xs">{supplier.commune} - {supplier.wilaya}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">الرمز البريدي:</span>
                                                    <span className="font-black font-sans text-emerald-600 text-xs tracking-widest">{supplier.postalCode || '---'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-gray-400"><Mail size={18} /></div>
                                            <span className="font-black font-sans text-gray-900 text-sm truncate" dir="ltr">{supplier.email || '---'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Legal Documents */}
                                <div className="flex flex-col gap-4">
                                    <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-violet-500" /> الوثائق القانونية
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Registre Commerce', value: supplier.rc, code: 'RC' },
                                            { label: 'Identifiant Fiscal', value: supplier.nif, code: 'NIF' },
                                            { label: 'Article Imposition', value: supplier.ai, code: 'AI' },
                                            { label: 'Num Statistique', value: supplier.nis, code: 'NIS' },
                                        ].map(({ label, value, code }) => (
                                            <div key={code} className="flex flex-col gap-1.5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-violet-200 transition-all group">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{code}</span>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-100 group-hover:bg-violet-500 transition-colors" />
                                                </div>
                                                <span className="font-black font-sans text-gray-900 text-xs break-all mt-1">{value || '---'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Section 3: Statistics */}
                                <div className="flex flex-col gap-4">
                                    <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" /> إحصائيات الأداء
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="p-6 bg-violet-50/50 rounded-2xl border border-violet-100 shadow-sm group hover:bg-violet-50 transition-all duration-300">
                                            <p className="text-[10px] font-black text-violet-400 uppercase mb-2 tracking-widest">إجمالي الطلبيات</p>
                                            <div className="flex items-end gap-2">
                                                <p className="text-4xl font-black font-sans leading-none text-violet-600">{totalOrders}</p>
                                                <span className="text-xs font-bold text-violet-400 mb-1">عملية شراء</span>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 shadow-sm group hover:bg-emerald-50 transition-all duration-300">
                                            <p className="text-[10px] font-black text-emerald-400 uppercase mb-2 tracking-widest">المنتجات النشطة</p>
                                            <div className="flex items-end gap-2">
                                                <p className="text-4xl font-black font-sans leading-none text-emerald-600">{supplier.products.length}</p>
                                                <span className="text-xs font-bold text-emerald-400 mb-1">صنف مورد</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Tabs Section */}
            <div className="flex flex-col gap-6 no-print">
                <div className="flex items-center gap-6 border-b border-gray-100">
                    <button onClick={() => setActiveTab('ORDERS')} className={`px-4 py-4 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${activeTab === 'ORDERS' ? 'text-violet-600 border-violet-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                        <ShoppingCart size={18} /> سجل الطلبات
                        <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px]">{supplier.orders.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('SOA')} className={`px-4 py-4 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${activeTab === 'SOA' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                        <History size={18} /> كشف الحساب (SOA)
                    </button>
                    <button onClick={() => setActiveTab('PRODUCTS')} className={`px-4 py-4 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${activeTab === 'PRODUCTS' ? 'text-emerald-600 border-emerald-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                        <Package size={18} /> قائمة المنتجات الموردة
                    </button>
                    <button onClick={() => setActiveTab('ANALYTICS')} className={`px-4 py-4 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${activeTab === 'ANALYTICS' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                        <Activity size={18} /> تحليلات الأداء
                    </button>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
                    {activeTab === 'ORDERS' && (() => {
                        const allOrders = (supplier?.orders || []).filter((o: any) => o.type === 'PURCHASE' || o.type === 'RETURN_PURCHASE');
                        const purchaseOrders = allOrders.filter((o: any) => o.type === 'PURCHASE');
                        
                        const mappedInvoices = purchaseOrders.map((o: any) => {
                            const returnsValue = (o.items || []).reduce((sum: number, item: any) => sum + ((item.returnedQuantity || 0) * item.unitPrice), 0);
                            const netTotal = o.total || 0;
                            const paid = (o.invoice?.supplierPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
                            const remaining = netTotal - paid;
                            return {
                                ...o,
                                id: o.invoice?.id, // Correct: Use Invoice ID for the table actions
                                orderId: o.id,     // Keep Order ID for reference
                                invoiceNumber: o.orderNumber,
                                supplier: { name: supplier.name },
                                total: netTotal,
                                originalTotal: netTotal + returnsValue,
                                returnsValue,
                                remaining,
                                paid,
                                status: remaining <= 0 ? (remaining < 0 ? 'CREDIT' : 'PAID') : (paid > 0 ? 'PARTIAL' : 'UNPAID'),
                                order: o, // Essential for InvoicesTable to check return status
                                date: o.orderDate,
                            };
                        });

                        const filteredInvoices = mappedInvoices.filter((inv: any) => {
                            const matchesSearch = !generalOrderSearch || 
                                (inv.invoiceNumber || '').toLowerCase().includes(generalOrderSearch.toLowerCase());
                                
                            let matchesStatus = true;
                            if (generalOrderStatusFilter !== 'ALL') {
                                if (generalOrderStatusFilter === 'PAID') matchesStatus = inv.remaining <= 0;
                                else if (generalOrderStatusFilter === 'PARTIAL') matchesStatus = inv.remaining > 0 && inv.paid > 0;
                                else if (generalOrderStatusFilter === 'UNPAID') matchesStatus = inv.paid === 0;
                                else if (generalOrderStatusFilter === 'CREDIT') matchesStatus = inv.remaining < 0;
                            }

                            let matchesDate = true;
                            if (generalOrderDateFrom && generalOrderDateTo) {
                                const d = new Date(inv.date);
                                matchesDate = d >= new Date(generalOrderDateFrom) && d <= new Date(generalOrderDateTo);
                            }
                            
                            return matchesSearch && matchesStatus && matchesDate;
                        });

                        const totalValue = filteredInvoices.reduce((s: number, inv: any) => s + (inv.total || 0), 0);
                        const totalPaid = filteredInvoices.reduce((s: number, inv: any) => s + (inv.paid || 0), 0);
                        const totalRemaining = totalValue - totalPaid;

                        const itemsPerPage = 10;
                        const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
                        const startIndex = (generalOrderCurrentPage - 1) * itemsPerPage;
                        const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

                        return (
                            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white p-8 rounded-[2.5rem] border-2 border-violet-600 shadow-xl">
                                {/* Tab Header */}
                                <div className="flex justify-between items-center mb-2 no-print">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-violet-600 text-white p-3 rounded-2xl shadow-lg shadow-purple-100"><ShoppingCart size={24} /></div>
                                        <div className="text-right">
                                            <h3 className="text-xl font-black text-violet-600">سجل طلبات التوريد</h3>
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">إدارة جميع عمليات الشراء والمرتجعات لهذا المورد</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Export Dropdown */}
                                        <div className="relative group">
                                            <button className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-2xl font-black text-xs shadow-sm flex items-center gap-2 hover:bg-gray-50 transition-all">
                                                <Download size={16} className="text-violet-600"/> تصدير
                                            </button>
                                            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                                                <button
                                                    onClick={() => {
                                                        const ws = xlsx.utils.json_to_sheet(filteredInvoices.map((inv: any) => ({
                                                            'رقم الطلبية': inv.invoiceNumber,
                                                            'التاريخ': formatDate(inv.date),
                                                            'المبلغ الإجمالي': inv.total,
                                                            'المدفوع': inv.paid,
                                                            'المتبقي': inv.remaining,
                                                            'الحالة': inv.status,
                                                        })));
                                                        const wb = xlsx.utils.book_new();
                                                        xlsx.utils.book_append_sheet(wb, ws, 'طلبات المورد');
                                                        xlsx.writeFile(wb, `طلبات-${supplier?.name || ''}.xlsx`);
                                                    }}
                                                    className="w-full text-right px-5 py-4 hover:bg-emerald-50 text-xs font-bold text-gray-700 flex items-center gap-3 border-b border-gray-50 transition-colors"
                                                >
                                                    <FileSpreadsheet size={16} className="text-emerald-600"/> Excel (.xlsx)
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const doc = new jsPDF({ orientation: 'landscape' });
                                                        autoTable(doc, {
                                                            head: [['رقم الطلبية', 'التاريخ', 'المبلغ الإجمالي', 'المدفوع', 'المتبقي', 'الحالة']],
                                                            body: filteredInvoices.map((inv: any) => [
                                                                inv.invoiceNumber,
                                                                formatDate(inv.date),
                                                                `${inv.total} دج`,
                                                                `${inv.paid} دج`,
                                                                `${inv.remaining} دج`,
                                                                inv.status,
                                                            ]),
                                                            styles: { font: 'helvetica', fontSize: 9 },
                                                            headStyles: { fillColor: [37, 99, 235] },
                                                        });
                                                        doc.save(`طلبات-${supplier?.name || ''}.pdf`);
                                                    }}
                                                    className="w-full text-right px-5 py-4 hover:bg-rose-50 text-xs font-bold text-gray-700 flex items-center gap-3 transition-colors"
                                                >
                                                    <FileText size={16} className="text-rose-600"/> PDF (.pdf)
                                                </button>
                                            </div>
                                        </div>

                                        <button onClick={() => window.print()} className="bg-violet-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-violet-700 hover:scale-105 transition-all active:scale-95 shadow-lg shadow-purple-100">
                                            <Printer size={16} /> طباعة القائمة
                                        </button>
                                    </div>
                                </div>

                                {/* Unified Filter Bar */}
                                <div className="px-6 py-5 no-print bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4">
                                    <div className="flex flex-col lg:flex-row gap-3 items-center">
                                        {/* Search */}
                                        <div className="relative flex-1 group">
                                            <input 
                                                type="text" 
                                                placeholder="بحث برقم الطلبية..."
                                                value={generalOrderSearch} 
                                                onChange={(e) => setGeneralOrderSearch(e.target.value)} 
                                                className="w-full h-[52px] bg-white border border-gray-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10 rounded-2xl pr-14 pl-4 text-sm font-bold transition-all outline-none shadow-sm"
                                            />
                                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-violet-600 rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none">
                                                <Search size={20} strokeWidth={3} />
                                            </div>
                                        </div>

                                        {/* Status Dropdown */}
                                        <div className="relative group min-w-[180px]">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'status' ? null : 'status'); }}
                                                className="w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                                            >
                                                <div className="bg-violet-50 p-1.5 rounded-lg text-violet-600"><Activity size={14} /></div>
                                                <div className="flex-1">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">حالة الدفع</p>
                                                    <p className="text-[10px] font-black text-gray-900 mt-1">
                                                        {generalOrderStatusFilter === 'ALL' ? 'كل الحالات' : 
                                                         generalOrderStatusFilter === 'PAID' ? 'خالص بالكامل' : 
                                                         generalOrderStatusFilter === 'PARTIAL' ? 'مدفوع جزئياً' : 
                                                         generalOrderStatusFilter === 'UNPAID' ? 'غير مدفوع' : 'رصيد زائد'}
                                                    </p>
                                                </div>
                                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${activeDropdown === 'status' ? 'rotate-180' : ''}`} />
                                            </button>
                                            {activeDropdown === 'status' && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                                    <button onClick={() => { setGeneralOrderStatusFilter('ALL'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-3 text-[10px] font-black border-b border-gray-50 transition-colors ${generalOrderStatusFilter === 'ALL' ? 'bg-violet-50 text-violet-600' : 'hover:bg-gray-50 text-gray-700'}`}>الكل</button>
                                                    <button onClick={() => { setGeneralOrderStatusFilter('UNPAID'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 text-[10px] font-black border-b border-gray-50 transition-colors hover:bg-rose-50 text-rose-600">غير مدفوع</button>
                                                    <button onClick={() => { setGeneralOrderStatusFilter('PARTIAL'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 text-[10px] font-black border-b border-gray-50 transition-colors hover:bg-amber-50 text-amber-600">مدفوع جزئياً</button>
                                                    <button onClick={() => { setGeneralOrderStatusFilter('PAID'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 text-[10px] font-black border-b border-gray-50 transition-colors hover:bg-emerald-50 text-emerald-600">خالص بالكامل</button>
                                                    <button onClick={() => { setGeneralOrderStatusFilter('CREDIT'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 text-[10px] font-black transition-colors hover:bg-purple-50 text-purple-600">رصيد زائد</button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Date Range Picker */}
                                        <div className="min-w-[180px]">
                                            <DateRangePicker 
                                                startDate={generalOrderDateFrom}
                                                endDate={generalOrderDateTo}
                                                onChange={(start, end) => { 
                                                    setGeneralOrderDateFrom(start); 
                                                    setGeneralOrderDateTo(end); 
                                                    setGeneralOrderCurrentPage(1); 
                                                }}
                                                theme="yellow"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="w-full overflow-hidden rounded-[1.5rem] border border-gray-100 shadow-sm">
                                    <InvoicesTable 
                                        invoices={paginatedInvoices}
                                        invoiceType="PURCHASE"
                                        loading={loading}
                                        setSelectedInvoice={setSelectedInvoiceForView}
                                        setShowPaymentModal={setShowPaymentModal}
                                        setPaymentAmount={setPaymentAmount}
                                        setShowHistoryModal={setShowHistoryModal}
                                        fetchPaymentHistory={fetchPaymentHistory}
                                        setShowReturnsModal={setShowReturnsModal}
                                        fetchReturnsHistory={fetchReturnsHistory}
                                        setShowReturnProcessModal={setShowReturnProcessModal}
                                        isSupplierView={true}
                                        handleRefundExcess={handleRefundExcess}
                                        headerClassName="bg-violet-600 border-b border-violet-500 text-white"
                                        footer={
                                            filteredInvoices.length > 0 && (
                                                <div className="p-4 border-t border-gray-100 flex items-center justify-between no-print bg-white">
                                                    <span className="text-xs font-bold text-gray-400">
                                                        إظهار {startIndex + 1} إلى {Math.min(startIndex + itemsPerPage, filteredInvoices.length)} من أصل {filteredInvoices.length} طلبية
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setGeneralOrderCurrentPage(p => Math.max(1, p - 1))} disabled={generalOrderCurrentPage === 1} className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-all">السابق</button>
                                                        <span className="px-4 py-2 bg-violet-50 text-violet-600 text-xs font-black rounded-xl border border-violet-100">{generalOrderCurrentPage} / {totalPages}</span>
                                                        <button onClick={() => setGeneralOrderCurrentPage(p => Math.min(totalPages, p + 1))} disabled={generalOrderCurrentPage === totalPages} className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-all">التالي</button>
                                                    </div>
                                                </div>
                                            )
                                        }
                                    />
                                </div>

                                {/* Summary Bar */}
                                <div className="bg-violet-50/50 border border-violet-100 rounded-[2rem] p-6 grid grid-cols-3 gap-6">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي العمليات</p>
                                        <p className="text-2xl font-black font-sans text-violet-600">{purchaseOrders.length}</p>
                                    </div>
                                    <div className="text-center border-x border-violet-100 px-6">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">قيمة المشتريات</p>
                                        <p className="text-2xl font-black font-sans text-gray-900">{totalValue.toLocaleString()} دج</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">المستحقات المتبقية</p>
                                        <p className={`text-2xl font-black font-sans ${totalRemaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{Math.abs(totalRemaining).toLocaleString()} دج</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {activeTab === 'SOA' && (() => {
                        const allTxs: any[] = [];
                        const usedPaymentIds = new Set<number>();

                        // 1. Process Orders (Purchases & Returns)
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
                                if (Math.abs(versement - originalTotal) < 0.01) motif = 'دفع كامل (نقداً)';
                                else if (versement > 0) motif = 'دفع جزئي';
                                else motif = 'آجل / ديون';

                                allTxs.push({
                                    date: new Date(o.orderDate),
                                    number: o.orderNumber,
                                    achat: originalTotal,
                                    method: initialPayment?.paymentMethod || '---',
                                    motif: motif,
                                    ref: '---',
                                    orderRef: o.orderNumber,
                                    versement: versement,
                                    type: 'PURCHASE'
                                });
                            } else if (o.type === 'RETURN_PURCHASE') {
                                allTxs.push({
                                    date: new Date(o.orderDate),
                                    number: 'Retours',
                                    achat: -(o.total || 0),
                                    method: '---',
                                    motif: 'إرجاع سلع',
                                    ref: o.orderNumber,
                                    orderRef: o.orderNumber,
                                    versement: 0,
                                    type: 'RETURN'
                                });
                            }
                        });

                        // 2. Process Independent Payments
                        (supplier.payments || []).forEach((p: any) => {
                            if (usedPaymentIds.has(p.id)) return;
                            const isRefund = p.amount < 0;
                            allTxs.push({
                                date: new Date(p.paymentDate),
                                number: isRefund ? 'Remboursement' : 'Droits',
                                achat: 0,
                                method: isRefund ? '---' : p.paymentMethod,
                                motif: isRefund ? 'استرداد أموال' : 'تسديد ديون',
                                ref: p.notes || '---',
                                orderRef: p.notes?.match(/ORD-\d+/)?.[0] || '---',
                                versement: p.amount,
                                type: isRefund ? 'REFUND' : 'PAYMENT'
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
                            // Search Query
                            if (soaSearchQuery) {
                                const q = soaSearchQuery.toLowerCase();
                                const matchNum = tx.number?.toLowerCase().includes(q);
                                const matchRef = tx.ref?.toLowerCase().includes(q);
                                if (!matchNum && !matchRef) return false;
                            }

                            // Motif Filter
                            if (soaMotifFilter !== 'ALL') {
                                if (soaMotifFilter === 'PURCHASE' && tx.type !== 'PURCHASE') return false;
                                if (soaMotifFilter === 'RETURN' && tx.type !== 'RETURN') return false;
                                if (soaMotifFilter === 'PAYMENT' && tx.type !== 'PAYMENT') return false;
                                if (soaMotifFilter === 'REFUND' && tx.type !== 'REFUND') return false;
                            }

                            // Method Filter
                            if (soaMethodFilter !== 'ALL') {
                                if (tx.method !== soaMethodFilter) return false;
                            }

                            // Date Filter
                            if (soaDateFrom && tx.date < new Date(soaDateFrom)) return false;
                            if (soaDateTo) {
                                const toDate = new Date(soaDateTo);
                                toDate.setHours(23, 59, 59, 999);
                                if (tx.date > toDate) return false;
                            }

                            return true;
                        });

                        // 6. Calculate Initial Balance (Balance just before the first visible transaction)
                        let initialBalance = 0;
                        if (filteredTxs.length > 0) {
                            const firstVisibleIndex = historyWithBalance.findIndex(tx => tx === filteredTxs[0]);
                            if (firstVisibleIndex > 0) {
                                initialBalance = historyWithBalance[firstVisibleIndex - 1].balance;
                            }
                        } else if (historyWithBalance.length > 0) {
                            if (soaDateFrom) {
                                const lastBeforeDate = historyWithBalance.filter(tx => tx.date < new Date(soaDateFrom)).pop();
                                initialBalance = lastBeforeDate ? lastBeforeDate.balance : 0;
                            }
                        }

                        // 7. Reverse for Newest-First Display
                        const displayedTxs = [...filteredTxs].reverse();
                        const soaItemsPerPage = 10;
                        const totalSoaPages = Math.max(1, Math.ceil(displayedTxs.length / soaItemsPerPage));
                        const paginatedTxs = displayedTxs.slice((generalOrderCurrentPage - 1) * soaItemsPerPage, generalOrderCurrentPage * soaItemsPerPage);

                        return (
                            <div className="flex flex-col pb-6 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[600px] bg-white rounded-[2.5rem] border-2 border-blue-600 p-8 shadow-xl">
                                <div className="flex justify-between items-center mb-6 no-print">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100"><FileText size={24} /></div>
                                        <div className="text-right">
                                            <h3 className="text-xl font-black text-blue-600">كشف الحساب التفصيلي</h3>
                                            <p className="text-[10px] font-black text-[#fbb815] uppercase tracking-widest mt-1">سجل كامل للحركات المالية والمشتريات</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="relative group">
                                            <button className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-2xl font-black text-xs shadow-sm flex items-center gap-2 hover:bg-gray-50 transition-all">
                                                <Download size={16} className="text-violet-600"/> تصدير
                                            </button>
                                            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                                                <button onClick={() => {
                                                    const ws = xlsx.utils.json_to_sheet(filteredTxs.map(tx => ({
                                                        'التاريخ': formatDate(tx.date),
                                                        'المرجع / الطلبية': tx.orderRef,
                                                        'رقم العملية': tx.number,
                                                        'البيان': tx.motif,
                                                        'مبلغ الشراء': tx.achat,
                                                        'المبلغ المدفوع': tx.versement,
                                                        'الرصيد': tx.balance
                                                    })));
                                                    const wb = xlsx.utils.book_new();
                                                    xlsx.utils.book_append_sheet(wb, ws, 'كشف الحساب');
                                                    xlsx.writeFile(wb, `كشف-حساب-${supplier?.name}.xlsx`);
                                                }} className="w-full text-right px-5 py-4 hover:bg-emerald-50 text-xs font-bold text-gray-700 flex items-center gap-3 border-b border-gray-50 transition-colors">
                                                    <FileSpreadsheet size={16} className="text-emerald-600"/> Excel (.xlsx)
                                                </button>
                                                <button onClick={() => {
                                                    const doc = new jsPDF({ orientation: 'landscape' });
                                                    autoTable(doc, {
                                                        head: [['التاريخ', 'المرجع / الطلبية', 'رقم العملية', 'البيان', 'مبلغ الشراء', 'المدفوع', 'الرصيد']],
                                                        body: filteredTxs.map(tx => [formatDate(tx.date), tx.orderRef, tx.number, tx.motif, `${tx.achat} دج`, `${tx.versement} دج`, `${tx.balance} دج`]),
                                                        styles: { font: 'helvetica', fontSize: 9 },
                                                        headStyles: { fillColor: [37, 99, 235] },
                                                    });
                                                    doc.save(`كشف-حساب-${supplier?.name}.pdf`);
                                                }} className="w-full text-right px-5 py-4 hover:bg-rose-50 text-xs font-bold text-gray-700 flex items-center gap-3 transition-colors">
                                                    <FileText size={16} className="text-rose-600"/> PDF (.pdf)
                                                </button>
                                            </div>
                                        </div>
                                        <button onClick={() => printDocument()} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 hover:scale-105 transition-all active:scale-95">
                                            <Printer size={16} /> طباعة الكشف
                                        </button>
                                    </div>
                                </div>

                                {/* Unified Filter Bar */}
                                <div className="bg-white border border-gray-200 rounded-[1.5rem] p-5 shadow-sm flex flex-col gap-5 no-print mb-4 overflow-visible">
                                    <div className="flex flex-wrap items-end gap-4">
                                        {/* Search Filter */}
                                        <div className="relative group flex-[4] min-w-[400px]">
                                            <input 
                                                type="text" 
                                                placeholder="بحث برقم العملية أو البيان..."
                                                value={soaSearchQuery} 
                                                onChange={(e) => setSoaSearchQuery(e.target.value)} 
                                                className="w-full h-[52px] bg-white border border-gray-200 rounded-2xl pr-14 pl-4 text-sm font-black outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all shadow-sm" 
                                            />
                                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none group-focus-within:scale-110 transition-transform">
                                                <Search size={20} strokeWidth={3} />
                                            </div>
                                        </div>

                                        {/* Motif Filter */}
                                        <div className="relative group flex-1 min-w-[200px]">
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'soa-motif' ? null : 'soa-motif'); }} 
                                                className="w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                                            >
                                                <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600"><Activity size={14} /></div>
                                                <div className="flex-1">
                                                    <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tighter leading-none">نوع العملية</p>
                                                    <p className="text-[10px] font-medium text-gray-900 mt-1">
                                                        {soaMotifFilter === 'ALL' ? 'كل الأنواع' : soaMotifFilter === 'PURCHASE' ? 'مشتريات' : soaMotifFilter === 'RETURN' ? 'مرتجعات' : 'تسديد ديون'}
                                                    </p>
                                                </div>
                                                <ChevronDown size={14} className={`text-gray-300 transition-transform ${activeDropdown === 'soa-motif' ? 'rotate-180' : ''}`} />
                                            </button>
                                            {activeDropdown === 'soa-motif' && (
                                                <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] py-2 animate-in zoom-in-95 duration-200">
                                                    {[
                                                        { id: 'ALL', label: 'كل الأنواع' },
                                                        { id: 'PURCHASE', label: 'مشتريات' },
                                                        { id: 'RETURN', label: 'مرتجعات' },
                                                        { id: 'PAYMENT', label: 'تسديد ديون' },
                                                        { id: 'REFUND', label: 'استرداد أموال' }
                                                    ].map(m => (
                                                        <button key={m.id} type="button" onClick={() => { setSoaMotifFilter(m.id); setActiveDropdown(null); }} className={`w-full text-right px-5 py-2.5 text-[10px] font-bold transition-colors ${soaMotifFilter === m.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'}`}>
                                                            {m.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Date Range Picker */}
                                        <div className="flex-[1.5] min-w-[240px]">
                                            <DateRangePicker startDate={soaDateFrom} endDate={soaDateTo} onChange={(start, end) => { setSoaDateFrom(start); setSoaDateTo(end); }} theme="blue" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                                    {/* Initial Balance Header */}
                                    <div className="bg-blue-600 text-white p-6 rounded-t-[2rem] flex justify-between items-center shadow-lg shadow-blue-100 no-print">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white/10 p-2 rounded-xl"><Activity size={18} /></div>
                                            <span className="text-xs font-black uppercase tracking-widest opacity-70">الرصيد قبل الفلترة (Solde Initial)</span>
                                        </div>
                                        <span className={`text-2xl font-black font-sans ${initialBalance > 0.01 ? 'text-red-400' : (initialBalance < -0.01 ? 'text-emerald-400' : 'text-white')}`}>
                                            {initialBalance.toLocaleString()} دج
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right border-collapse min-w-[1000px]">
                                            <thead>
                                                <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                                    <th className="p-4 text-center">N°</th>
                                                    <th className="p-4">تاريخ العملية</th>
                                                    <th className="p-4 text-center">المرجع / الطلبية</th>
                                                    <th className="p-4">رقم العملية</th>
                                                    <th className="p-4 text-center">نوع العملية / البيان</th>
                                                    <th className="p-4">طريقة الدفع</th>
                                                    <th className="p-4 text-left">مبلغ الشراء (دج)</th>
                                                    <th className="p-4 text-emerald-600 text-left">المدفوعات (دج)</th>
                                                    <th className="p-4 bg-gray-100/50 text-gray-900 text-left">الرصيد التراكمي (دج)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {paginatedTxs.map((tx, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors font-bold text-sm">
                                                        <td className="p-4 text-center text-gray-400 font-sans">{displayedTxs.length - ((generalOrderCurrentPage - 1) * soaItemsPerPage + idx)}</td>
                                                        <td className="p-4 font-sans text-xs">
                                                            <div className="flex flex-col">
                                                                <span>{formatDate(tx.date)}</span>
                                                                <span className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleTimeString('ar-DZ', {hour:'2-digit', minute:'2-digit'})}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center font-sans">
                                                            <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">{tx.orderRef}</span>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`text-xs font-black px-2 py-1 rounded-lg font-sans ${tx.number === '---' || tx.number === 'Droits' || tx.number === 'Remboursement' || tx.number === 'Retours' ? 'text-gray-400 bg-gray-50' : 'text-blue-600 bg-blue-50'}`}>{tx.number}</span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <div className="flex flex-col gap-1">
                                                                <span className={`text-[10px] px-3 py-1 rounded-full inline-block mx-auto ${
                                                                    tx.type === 'PURCHASE' ? 'bg-blue-50 text-blue-700' :
                                                                    tx.type === 'RETURN' ? 'bg-orange-50 text-orange-700' :
                                                                    tx.type === 'REFUND' ? 'bg-purple-50 text-purple-700' :
                                                                    'bg-emerald-50 text-emerald-700'
                                                                }`}>
                                                                    {tx.motif}
                                                                </span>
                                                                {tx.ref !== '---' && <span className="text-[9px] text-gray-400">{tx.ref}</span>}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            {tx.method !== '---' ? (
                                                                <span className="bg-gray-100 px-2 py-1 rounded-lg text-xs">{tx.method === 'CASH' ? 'نقداً' : tx.method === 'CHEQUE' ? 'شيك' : 'تحويل بنكي'}</span>
                                                            ) : '---'}
                                                        </td>
                                                        <td className="p-4 text-left font-sans">{tx.achat !== 0 ? tx.achat.toLocaleString() : '---'}</td>
                                                        <td className="p-4 text-left font-sans text-emerald-600">{tx.versement !== 0 ? tx.versement.toLocaleString() : '---'}</td>
                                                        <td className={`p-4 font-sans bg-gray-50/30 text-left ${tx.balance > 0.01 ? 'text-rose-600' : (tx.balance < -0.01 ? 'text-emerald-600' : 'text-gray-400')}`}>
                                                            {tx.balance.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {totalSoaPages > 1 && (
                                        <div className="p-4 border-t border-gray-100 flex items-center justify-between no-print bg-white rounded-b-[2rem]">
                                            <span className="text-xs font-bold text-gray-400">
                                                إظهار {(generalOrderCurrentPage - 1) * soaItemsPerPage + 1} إلى {Math.min(generalOrderCurrentPage * soaItemsPerPage, displayedTxs.length)} من أصل {displayedTxs.length} عملية
                                            </span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setGeneralOrderCurrentPage(p => Math.max(1, p - 1))} disabled={generalOrderCurrentPage === 1} className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50">السابق</button>
                                                <span className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-black rounded-xl border border-blue-100">{generalOrderCurrentPage} / {totalSoaPages}</span>
                                                <button onClick={() => setGeneralOrderCurrentPage(p => Math.min(totalSoaPages, p + 1))} disabled={generalOrderCurrentPage === totalSoaPages} className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50">التالي</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {activeTab === 'PRODUCTS' && (
                        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white p-8 rounded-[2.5rem] border-2 border-emerald-600 shadow-xl">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-2 no-print">
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg shadow-emerald-100"><Package size={24} /></div>
                                    <div className="text-right">
                                        <h3 className="text-xl font-black text-emerald-600">قائمة المنتجات الموردة</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">كتالوج المنتجات التي يتم توريدها من هذا المورد</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                                        <span className="text-xs font-black text-emerald-600">{supplier.products.length} منتج مسجل</span>
                                    </div>
                                </div>
                            </div>

                            {/* Products Table */}
                            <div className="overflow-x-auto rounded-[1.5rem] bg-white">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-emerald-50 text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-100">
                                            <th className="p-4 text-center">الرمز</th>
                                            <th className="p-4 text-right">المنتج</th>
                                            <th className="p-4 text-center">المخزون الحالي</th>
                                            <th className="p-4 text-center">سعر الشراء</th>
                                            <th className="p-4 text-center">إجمالي التوريد</th>
                                            <th className="p-4 text-center">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-emerald-50">
                                        {supplier.products.map(p => {
                                            const stockLevel = p.quantity <= (p.minQuantity || 5) ? 'LOW' : 'GOOD';
                                            return (
                                                <tr key={p.id} className="hover:bg-emerald-50/30 transition-colors font-bold text-sm">
                                                    <td className="p-4 text-center">
                                                        <span className="text-[10px] font-black text-emerald-600 bg-white border border-emerald-100 px-2 py-1 rounded-lg font-sans">
                                                            {p.code || '---'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                                                                <Package size={16} />
                                                            </div>
                                                            <span className="text-gray-900">{p.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="font-sans text-gray-700">{p.quantity}</span>
                                                        <span className="text-[10px] text-gray-400 mr-1">{p.unit}</span>
                                                    </td>
                                                    <td className="p-4 text-center font-sans text-emerald-600">
                                                        {p.purchasePrice.toLocaleString()} <span className="text-[10px]">دج</span>
                                                    </td>
                                                    <td className="p-4 text-center font-sans text-gray-900">
                                                        {p.totalPurchasedQty || 0} <span className="text-[10px] text-gray-400">{p.unit}</span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`text-[9px] px-2 py-1 rounded-lg ${
                                                            stockLevel === 'LOW' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                                                        }`}>
                                                            {stockLevel === 'LOW' ? 'منخفض' : 'متوفر'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {supplier.products.length === 0 && (
                                <div className="py-20 flex flex-col items-center justify-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                                    <div className="bg-white p-4 rounded-full shadow-sm mb-4"><Package size={48} className="text-gray-300" /></div>
                                    <p className="text-gray-400 font-bold">لا يوجد منتجات مسجلة لهذا المورد</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'ANALYTICS' && (
                        <div className="p-8">
                            <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 flex flex-col gap-8">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900">تحليل المشتريات</h3>
                                    <p className="text-xs font-bold text-gray-400">تطور حجم المشتريات الشهرية من هذا المورد</p>
                                </div>
                                <div className="h-80 w-full" dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={(() => {
                                            const months: Record<string, number> = {};
                                            const today = new Date();
                                            for(let i=5; i>=0; i--) {
                                                const d = new Date(today.getFullYear(), today.getMonth()-i, 1);
                                                months[d.toLocaleDateString('ar-DZ', {month: 'short'})] = 0;
                                            }
                                            supplier.orders.forEach(o => {
                                                const d = new Date(o.orderDate);
                                                const m = d.toLocaleDateString('ar-DZ', {month: 'short'});
                                                if (months[m] !== undefined) months[m] += o.total;
                                            });
                                            return Object.entries(months).map(([name, val]) => ({ name, value: val }));
                                        })()}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} tickFormatter={v => `${v/1000}k`} />
                                            <RechartsTooltip />
                                            <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={4} dot={{r: 4}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* EDIT SUPPLIER SHEET */}
            {isEditSheetOpen && (
                <>
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] transition-opacity duration-300" onClick={() => setIsEditSheetOpen(false)} />
                    <div className="fixed top-0 bottom-0 left-0 w-full max-w-lg bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-left duration-500 overflow-hidden">
                        <div className="p-8 w-full flex items-center justify-between bg-[#8b5cf6] text-white shadow-lg shrink-0">
                            <div>
                                <h2 className="text-2xl font-black flex items-center gap-3">
                                    <Edit size={28} className="bg-white/20 p-1 rounded-lg" /> تعديل بيانات المورد
                                </h2>
                                <p className="text-white/70 text-xs font-bold mt-1 tracking-tight uppercase">تحديث المعلومات المسجلة في قاعدة البيانات</p>
                            </div>
                            <button onClick={() => setIsEditSheetOpen(false)} className="bg-white/10 hover:bg-white/20 text-white rounded-2xl p-2 transition-all active:scale-90"><X size={24} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-gray-50/30">
                            {/* Section 1: Basic Info */}
                            <div className="space-y-6 p-6 bg-white border-2 border-violet-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-violet-200">
                                <div className="flex items-center gap-3"><div className="w-2 h-8 bg-violet-500 rounded-full"></div><h3 className="text-sm font-black text-violet-600 uppercase tracking-widest">المعلومات الشخصية</h3></div>
                                <div className="grid grid-cols-1 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">اسم المورد <span className="text-red-500">*</span></label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} onBlur={() => setFieldTouched('name')} placeholder="اسم المورد أو الشركة..." className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none transition-all ${touched.name && !validations.name ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white'}`} required />
                                        {touched.name && !validations.name && <p className="text-[10px] text-red-500 font-bold mr-2 animate-bounce">يجب إدخال اسم المورد (كلمتان على الأقل).</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1 tracking-tighter">النشاط التجاري (اختياري)</label>
                                        <input
                                            type="text"
                                            value={formData.activity}
                                            onChange={e => setFormData({ ...formData, activity: e.target.value.toUpperCase() })}
                                            placeholder="أدخل النشاط التجاري هنا..."
                                            className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">رقم الهاتف <span className="text-red-500">*</span></label>
                                        <div className="relative group"><input type="text" maxLength={10} value={formData.phone} onChange={e => { const val = e.target.value.replace(/\D/g, ''); if (val.length === 1 && val[0] !== '0') return; if (val.length === 2 && !['5', '6', '7'].includes(val[1])) return; setFormData({ ...formData, phone: val }); }} onBlur={() => setFieldTouched('phone')} placeholder="05 / 06 / 07 ..." className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-12 py-3.5 text-gray-900 font-bold font-sans transition-all ${touched.phone && !validations.phone ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white'}`} dir="ltr" /><div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-violet-400 transition-colors"><Phone size={18} /></div></div>
                                        {touched.phone && !validations.phone && <p className="text-[10px] text-red-500 font-bold mr-2">رقم الهاتف غير صحيح.</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">البريد الإلكتروني (اختياري)</label>
                                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} onBlur={() => setFieldTouched('email')} placeholder="example@domain.com" className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all ${touched.email && !validations.email ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white'}`} />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Location */}
                            <div className="space-y-6 p-6 bg-white border-2 border-emerald-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-emerald-200">
                                <div className="flex items-center gap-3"><div className="w-2 h-8 bg-emerald-500 rounded-full"></div><h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest">الموقع الجغرافي</h3></div>
                                <div className="grid grid-cols-1 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">الولاية <span className="text-red-500">*</span></label>
                                        <select value={formData.wilaya} onChange={e => { 
                                            const w = ALGERIA_LOCATIONS.find(l => l.name === e.target.value || l.arabicName === e.target.value); 
                                            const firstCommune = w?.communes?.[0];
                                            setFormData({ ...formData, wilaya: e.target.value, commune: firstCommune?.name || '', postCode: firstCommune?.postCode || '' }); 
                                        }} className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-emerald-400 focus:bg-white transition-all appearance-none cursor-pointer">
                                            {ALGERIA_LOCATIONS.map(w => <option key={w.id} value={w.name}>{w.id} - {w.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">البلدية <span className="text-red-500">*</span></label>
                                        <select
                                            value={formData.commune}
                                            onChange={e => {
                                                const selectedWilaya = ALGERIA_LOCATIONS.find(l => l.name === formData.wilaya || l.arabicName === formData.wilaya);
                                                const selectedCommune = selectedWilaya?.communes?.find(c => c.name === e.target.value);
                                                setFormData({ ...formData, commune: e.target.value, postCode: selectedCommune?.postCode || '' });
                                            }}
                                            onBlur={() => setFieldTouched('commune')}
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-4 py-3.5 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer ${touched.commune && !validations.commune ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 focus:bg-white'}`}
                                        >
                                            {(ALGERIA_LOCATIONS.find(l => l.name === formData.wilaya || l.arabicName === formData.wilaya)?.communes || []).map(c => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">الرمز البريدي</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                dir="ltr"
                                                readOnly
                                                value={formData.postCode}
                                                placeholder="يُملأ تلقائياً"
                                                className="w-full bg-emerald-50/60 border-2 border-emerald-100 rounded-[1.2rem] px-5 py-3.5 text-emerald-700 font-black font-mono text-center focus:outline-none cursor-default select-all"
                                            />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-400/70 uppercase tracking-widest">CP</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">العنوان بالتفصيل</label>
                                        <div className="relative group">
                                            <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value.toUpperCase() })} placeholder="اختياري (الشارع، رقم الباب...)" className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 focus:bg-white transition-all" />
                                            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-400 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Legal & Tax */}
                            <div className="space-y-6 p-6 bg-white border-2 border-amber-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-amber-200">
                                <div className="flex items-center gap-3"><div className="w-2 h-8 bg-amber-500 rounded-full"></div><h3 className="text-sm font-black text-amber-600 uppercase tracking-widest">المعلومات الجبائية والاتصال</h3></div>
                                <div className="grid grid-cols-1 gap-5">
                                    {/* RC Field */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">رقم السجل التجاري (RC)</label>
                                        <input
                                            type="text"
                                            value={formData.rc}
                                            onChange={e => setFormData({ ...formData, rc: e.target.value.toUpperCase() })}
                                            placeholder="10 أرقام..."
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                ${rcInfo ? (rcInfo.valid ? 'border-emerald-200 focus:border-emerald-400 bg-emerald-50/20' : 'border-red-200 focus:border-red-400 bg-red-50/20') : 'border-transparent focus:border-amber-400'}`}
                                        />
                                        {rcInfo && (
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${rcInfo.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                {rcInfo.valid ? <Check size={12} /> : <X size={12} />}
                                                <p className="text-[10px] font-bold">{rcInfo.valid ? rcInfo.breakdown : rcInfo.error}</p>
                                            </div>
                                        )}
                                    </div>
                                    {/* NIF Field */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">رقم التعريف الجبائي (NIF)</label>
                                        <input
                                            type="text"
                                            value={formData.nif}
                                            onChange={e => setFormData({ ...formData, nif: e.target.value.replace(/\D/g, '') })}
                                            placeholder="15 رقماً..."
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                ${nifInfo ? (nifInfo.valid ? 'border-emerald-200 focus:border-emerald-400 bg-emerald-50/20' : 'border-red-200 focus:border-red-400 bg-red-50/20') : 'border-transparent focus:border-amber-400'}`}
                                        />
                                        {nifInfo && (
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${nifInfo.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                {nifInfo.valid ? <Check size={12} /> : <X size={12} />}
                                                <p className="text-[10px] font-bold">{nifInfo.valid ? nifInfo.breakdown : nifInfo.error}</p>
                                            </div>
                                        )}
                                    </div>
                                    {/* AI Field */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">رقم المادة (AI)</label>
                                        <input
                                            type="text"
                                            value={formData.ai}
                                            onChange={e => setFormData({ ...formData, ai: e.target.value.replace(/\D/g, '') })}
                                            placeholder="11 رقماً..."
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                ${aiInfo ? (aiInfo.valid ? 'border-emerald-200 focus:border-emerald-400 bg-emerald-50/20' : 'border-red-200 focus:border-red-400 bg-red-50/20') : 'border-transparent focus:border-amber-400'}`}
                                        />
                                        {aiInfo && (
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${aiInfo.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                {aiInfo.valid ? <Check size={12} /> : <X size={12} />}
                                                <p className="text-[10px] font-bold">{aiInfo.valid ? aiInfo.breakdown : aiInfo.error}</p>
                                            </div>
                                        )}
                                    </div>
                                    {/* NIS Field */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">رقم التعريف الإحصائي (NIS)</label>
                                        <input
                                            type="text"
                                            value={formData.nis}
                                            onChange={e => setFormData({ ...formData, nis: e.target.value.replace(/\D/g, '') })}
                                            placeholder="15 رقماً..."
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                ${nisInfo ? (nisInfo.valid ? 'border-emerald-200 focus:border-emerald-400 bg-emerald-50/20' : 'border-red-200 focus:border-red-400 bg-red-50/20') : 'border-transparent focus:border-amber-400'}`}
                                        />
                                        {nisInfo && (
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${nisInfo.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                {nisInfo.valid ? <Check size={12} /> : <X size={12} />}
                                                <p className="text-[10px] font-bold">{nisInfo.valid ? nisInfo.breakdown : nisInfo.error}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-gray-100 bg-white flex gap-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] shrink-0">
                            <button onClick={() => setIsEditSheetOpen(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-[1.2rem] font-black text-sm hover:bg-gray-200 transition-all active:scale-95">إلغاء</button>
                            <button onClick={handleSaveSupplier} disabled={!isFormValid || isSubmitting} className={`flex-[2] py-4 rounded-[1.2rem] font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${ isFormValid ? 'bg-[#8b5cf6] text-white shadow-violet-200 hover:bg-[#7c3aed] hover:shadow-violet-300' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' }`}>
                                {isSubmitting ? 'جاري الحفظ...' : <><Edit size={20} /> حفظ التعديلات</>}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Invoice Detail Modal */}
            {selectedInvoiceForView && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="bg-[#8b5cf6] p-3 rounded-2xl text-white shadow-lg shadow-violet-200"><FileText size={24} /></div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">تفاصيل الفاتورة</h2>
                                    <p className="text-gray-500 text-xs font-bold tracking-tight">رقم: {selectedInvoiceForView.invoiceNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { const el = document.getElementById('inv-print-area'); if(el){const o=document.body.innerHTML;document.body.innerHTML=el.innerHTML;window.print();document.body.innerHTML=o;window.location.reload();}}} className="flex items-center gap-2 px-6 py-3 bg-[#8b5cf6] text-white rounded-2xl font-black text-sm hover:bg-[#7c3aed] transition-all shadow-lg active:scale-95"><Printer size={18} /> طباعة الفاتورة</button>
                                <button onClick={() => setSelectedInvoiceForView(null)} className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 transition-all"><X size={24} /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
                            <div id="inv-print-area" className="bg-white shadow-xl mx-auto rounded-xl p-8">
                                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
                                    <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl flex-1">
                                        <h2 className="text-xl font-black text-gray-900 mb-2 uppercase">Facture de Achat</h2>
                                        <p className="text-sm font-bold text-gray-600">N° <span className="font-sans" dir="ltr">{selectedInvoiceForView.invoiceNumber}</span></p>
                                        <p className="text-sm font-bold text-gray-600">Date: <span className="font-sans">{formatDate(selectedInvoiceForView.invoiceDate)}</span></p>
                                    </div>
                                    <div className="border-r-4 border-[#8b5cf6] pr-5 flex-1 text-right">
                                        <p className="text-xs font-black text-[#8b5cf6] mb-1 uppercase tracking-widest">المورد:</p>
                                        <p className="text-xl font-black text-gray-900">{selectedInvoiceForView.supplier?.name || supplier?.name || 'مورد'}</p>
                                        {selectedInvoiceForView.order?.project?.name && <span className="text-xs font-bold bg-violet-50 text-violet-700 px-2 py-0.5 rounded mt-1 inline-block">مشروع: {selectedInvoiceForView.order.project.name}</span>}
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
                                        {(selectedInvoiceForView.order?.items || []).map((item: any, idx: number) => {
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
                                                </div>
                                            </td>
                                            <td colSpan={2} className="pt-4">
                                                <div className="bg-gray-900 text-white p-5 rounded-xl flex flex-col items-end">
                                                    <div className="flex justify-between w-full opacity-60 text-xs mb-2"><span>Total:</span><span className="font-sans">{(selectedInvoiceForView.total||0).toLocaleString()} DZD</span></div>
                                                    <div className="flex justify-between w-full opacity-60 text-xs mb-3"><span>Payé:</span><span className="font-sans">{(selectedInvoiceForView.paid||0).toLocaleString()}</span></div>
                                                    <div className="w-full h-px bg-white/10 mb-3"></div>
                                                    <span className="text-xs font-bold opacity-70">{(selectedInvoiceForView.remaining||0) < 0 ? 'Crédit (Rendu)' : 'Reste à Payer'}</span>
                                                    <span className={`text-2xl font-black font-sans ${(selectedInvoiceForView.remaining||0) < 0 ? 'text-purple-400' : 'text-red-400'}`}>{Math.abs(selectedInvoiceForView.remaining||0).toLocaleString()} DZD</span>
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

            {/* Payment Modal (Full) */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-200">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">تسجيل دفع للمورد</h2>
                                    <p className="text-gray-500 text-xs font-bold tracking-tight">الفاتورة: {showPaymentModal.invoiceNumber || 'عام'}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPaymentModal(null)} className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 transition-all"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleRecordPayment} className="p-8 space-y-6">
                            <div className="bg-emerald-50 p-4 rounded-2xl flex justify-between items-center border border-emerald-100/50">
                                <span className="text-xs font-black text-emerald-600 uppercase">المبلغ المتبقي</span>
                                <span className="text-xl font-black text-emerald-700 font-sans">{showPaymentModal.remaining?.toLocaleString()} دج</span>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 pr-2">المبلغ المراد دفعه (دج)</label>
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
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"><FileText size={18} /></div>
                                        <input type="text" placeholder={paymentMethod === 'CHEQUE' ? "رقم الشيك البنكي" : "رقم الحوالة / المرجع"} value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className="w-full h-12 bg-white border border-gray-200 rounded-xl pr-12 pl-4 text-sm font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none shadow-sm" />
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 group-focus-within:text-emerald-600 transition-colors pointer-events-none"><Building2 size={18} /></div>
                                        <select value={paymentBank} onChange={e => setPaymentBank(e.target.value)} className="w-full h-12 bg-white border border-gray-200 rounded-xl pr-12 pl-10 text-sm font-black appearance-none outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all cursor-pointer shadow-sm hover:border-gray-300">
                                            <option value="">اختر البنك أو المؤسسة المالية...</option>
                                            <option value="Algérie Poste (بريد الجزائر)">Algérie Poste (بريد الجزائر)</option>
                                            <option value="BNA (البنك الوطني الجزائري)">BNA (البنك الوطني الجزائري)</option>
                                            <option value="CPA (القرض الشعبي الجزائري)">CPA (القرض الشعبي الجزائري)</option>
                                            <option value="BADR (الفلاحة والتنمية الريفية)">BADR (الفلاحة والتنمية الريفية)</option>
                                            <option value="BDL (بنك التنمية المحلية)">BDL (بنك التنمية المحلية)</option>
                                        </select>
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><ChevronDown size={16} /></div>
                                    </div>
                                </div>
                            )}
                            <button type="submit" disabled={isSubmitting || paymentAmount <= 0 || ((paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') && (!chequeNumber || !paymentBank))} className="w-full h-14 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed">
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
                                                    <p className={`text-[11px] font-black ${p.isReturn ? 'text-orange-900' : 'text-gray-700'} leading-none mb-1`}>{p.notes || (p.amount < 0 ? 'إرجاع رصيد زائد نقداً' : 'تسديد دفعة مالية للمورد')}</p>
                                                    
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
                                                            <div className={`${p.amount < 0 ? 'bg-purple-600' : 'bg-gray-900'} text-white p-8 rounded-3xl mt-10 text-center shadow-2xl`}><p className="text-xs font-bold opacity-60 mb-2 tracking-widest uppercase">MONTANT</p><p className="text-5xl font-black font-sans">{Math.abs(p.amount).toLocaleString()} DZD</p></div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-20 mt-16 text-center"><div className="border-t-2 border-gray-900 pt-4 font-black uppercase text-xs">Cachet et Signature</div><div className="border-t-2 border-gray-900 pt-4 font-black uppercase text-xs">Signature Fournisseur</div></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-8 border-t border-gray-50 flex justify-between items-center bg-gray-50/30">
                            <div><p className="text-[10px] font-black text-gray-400 uppercase">إجمالي المحصل</p><p className="text-xl font-black text-green-600 font-sans">{(showHistoryModal.paid || 0).toLocaleString()} دج</p></div>
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
                                <div className="mb-10 flex justify-between items-start"><div><p className="text-xs font-bold text-gray-400 uppercase">Fournisseur:</p><p className="text-xl font-black">{supplier.name}</p><p className="text-sm font-bold text-gray-600 font-sans">Facture: {showHistoryModal.invoiceNumber}</p></div><div className="text-right"><p className="text-xs font-bold text-gray-400 uppercase">État actuel:</p><p className={`text-lg font-black font-sans ${showHistoryModal.remaining < 0 ? 'text-purple-600' : 'text-red-600'}`}>Reste: {Math.abs(showHistoryModal.remaining||0).toLocaleString()} DZD</p></div></div>
                                <table className="w-full text-left border-collapse"><thead className="bg-gray-100"><tr><th className="p-3 text-xs font-black uppercase">Date</th><th className="p-3 text-xs font-black uppercase">Mode / Type</th><th className="p-3 text-xs font-black uppercase text-right">Montant</th></tr></thead><tbody>{showHistoryModal.payments?.map((p: any) => (<tr key={p.id} className="border-b border-gray-100"><td className="p-3 text-sm font-bold font-sans">{new Date(p.paymentDate).toLocaleDateString('fr-FR')}</td><td className="p-3 text-sm font-bold uppercase">{p.isReturn ? 'RETOUR' : p.paymentMethod}</td><td className="p-3 text-sm font-black text-right font-sans">{(p.isReturn || p.amount < 0) ? '-' : '+'}{Math.abs(p.amount).toLocaleString()} DZD</td></tr>))}</tbody><tfoot><tr className="bg-gray-900 text-white"><td colSpan={2} className="p-4 text-right font-black uppercase">Total Payé:</td><td className="p-4 text-right font-black font-sans">{(showHistoryModal.paid||0).toLocaleString()} DZD</td></tr></tfoot></table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Return Process Modal */}
            {showReturnProcessModal && (
                <ReturnModal 
                    orderId={showReturnProcessModal.orderId || showReturnProcessModal.id}
                    onClose={() => setShowReturnProcessModal(null)}
                    onSuccess={() => {
                        fetchSupplier();
                    }}
                />
            )}

            {/* Refund Confirmation Modal */}
            {showRefundConfirmModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowRefundConfirmModal(null)} />
                    <div className="bg-white rounded-[2.5rem] shadow-2xl z-10 w-full max-w-md p-8 animate-in zoom-in-95 duration-300 border border-purple-100 text-center flex flex-col gap-6">
                        {refundSuccess ? (
                            <>
                                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto scale-110 animate-bounce">
                                    <CheckCircle size={40} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 mb-2">تم الاسترجاع بنجاح</h3>
                                    <p className="text-gray-500 font-bold text-sm">تم تسجيل استرجاع الفائض وتحديث الرصيد بنجاح.</p>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setShowRefundConfirmModal(null)}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-2xl font-black text-sm transition-all"
                                    >
                                        إغلاق
                                    </button>
                                    {lastRefundId && (
                                        <button 
                                            onClick={() => {
                                                // Assuming a print endpoint or helper exists for payments
                                                window.print(); 
                                            }}
                                            className="flex-1 bg-[#5EABD5] hover:bg-[#4d9bc2] text-white py-4 rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <Printer size={18} /> طباعة الوصل
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mx-auto scale-110">
                                    <Banknote size={40} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 mb-2">تأكيد استرجاع الفائض</h3>
                                    <p className="text-gray-500 font-bold text-sm leading-relaxed px-4">
                                        هل أنت متأكد من تسجيل استرجاع الفائض نقداً بقيمة <span className="text-purple-600 font-black font-sans">{Math.abs(showRefundConfirmModal.remaining).toLocaleString()} دج</span>؟
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setShowRefundConfirmModal(null)}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-2xl font-black text-sm transition-all"
                                    >
                                        إلغاء
                                    </button>
                                    <button 
                                        onClick={executeRefund}
                                        disabled={isSubmitting}
                                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-purple-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <RotateCcw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                        تأكيد العملية
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
