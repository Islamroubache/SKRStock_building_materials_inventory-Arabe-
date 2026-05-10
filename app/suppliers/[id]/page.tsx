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
    const [isSubmitting, setIsSubmitting] = useState(false);
    
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

    useEffect(() => { if (id) fetchSupplier(); }, [id]);

    const setFieldTouched = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
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
                alert('✅ تم تحديث بيانات المورد بنجاح');
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

    const handleRefundExcess = async (inv: any) => {
        const excess = Math.abs(inv.remaining);
        if (excess <= 0) return;

        const confirmRefund = window.confirm(`هل أنت متأكد من تسجيل استرجاع الفائض نقداً بقيمة ${excess.toLocaleString()} دج؟`);
        if (!confirmRefund) return;

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

    if (loading) return (
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
                <div className="bg-white rounded-[2rem] border-2 border-emerald-500 shadow-xl shadow-gray-100 overflow-hidden">
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
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{supplier.name}</h2>
                                <span className="px-4 py-1.5 bg-white shadow-sm text-gray-600 rounded-full text-[11px] font-black uppercase tracking-wider border border-emerald-100">
                                    {supplier.activity || 'نشاط تجاري'}
                                </span>
                            </div>
                            <div className="flex-1 flex justify-end">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsEditSheetOpen(true); }}
                                    className="bg-white/60 backdrop-blur-md border border-emerald-200 text-emerald-700 px-5 py-2.5 rounded-xl font-black text-[11px] flex items-center gap-2 shadow-sm hover:bg-white hover:border-emerald-300 transition-all no-print"
                                >
                                    <Edit size={14} /> تعديل البيانات
                                </button>
                            </div>
                        </div>

                        {/* Quick Stats Highlights */}
                        <div className="flex items-center justify-center gap-12 py-6 w-full max-w-2xl">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">تاريخ الانضمام</p>
                                <p className="text-sm font-black text-gray-700 font-sans">{formatDate(supplier.createdAt)}</p>
                            </div>
                            <div className="w-px h-10 bg-emerald-100" />
                            <div className="text-center">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">إجمالي المشتريات</p>
                                <p className="text-sm font-black text-blue-600 font-sans">{totalPurchased.toLocaleString()} دج</p>
                            </div>
                            <div className="w-px h-10 bg-emerald-100" />
                            <div className="text-center">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">الرصيد الحالي</p>
                                <p className={`text-sm font-black font-sans ${supplier.balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {Math.abs(supplier.balanceDue).toLocaleString()} دج
                                </p>
                            </div>
                        </div>
                    </div>

                    {isSupplierDetailsOpen && (
                        <div className="px-8 pb-8 flex flex-col gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="border-t border-gray-100" />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Section 1: Contact */}
                                <div className="flex flex-col gap-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Phone size={11} /> اتصال وتواصل
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100/50">
                                            <Phone size={15} className="text-blue-500 shrink-0" />
                                            <span className="font-black font-sans text-gray-900 text-sm" dir="ltr">{supplier.phone || '---'}</span>
                                        </div>
                                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <MapPin size={15} className="text-gray-500 shrink-0 mt-0.5" />
                                            <div className="flex flex-col gap-0.5">
                                                <p className="font-black text-gray-900 text-sm">{supplier.address || '---'}</p>
                                                <p className="text-gray-500 font-bold text-[11px]">{supplier.commune} - {supplier.wilaya}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">الرمز البريدي:</span>
                                                    <span className="font-black font-sans text-emerald-600 text-[11px]">{supplier.postalCode || '---'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <Mail size={15} className="text-gray-500 shrink-0" />
                                            <span className="font-black font-sans text-gray-900 text-sm truncate" dir="ltr">{supplier.email || '---'}</span>
                                        </div>
                                    </div>
                                    <div className="border-t border-dashed border-gray-200 mt-2" />
                                </div>

                                {/* Section 2: Legal Documents */}
                                <div className="flex flex-col gap-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <FileText size={11} /> الوثائق القانونية
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: 'RC', value: supplier.rc },
                                            { label: 'NIF', value: supplier.nif },
                                            { label: 'AI', value: supplier.ai },
                                            { label: 'NIS', value: supplier.nis },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-amber-200 transition-all">
                                                <span className="text-[9px] font-black text-gray-400 uppercase">{label}</span>
                                                <span className="font-black font-sans text-gray-900 text-[11px] break-all">{value || '---'}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-dashed border-gray-200 mt-2" />
                                </div>

                                {/* Section 3: Performance Analysis */}
                                <div className="flex flex-col gap-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Activity size={11} /> إحصائيات المورد
                                    </p>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
                                            <p className="text-[9px] font-black text-violet-400 uppercase mb-1 tracking-tighter">إجمالي الطلبيات</p>
                                            <p className="text-2xl font-black font-sans text-violet-600">{totalOrders}</p>
                                        </div>
                                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <p className="text-[9px] font-black text-emerald-400 uppercase mb-1 tracking-tighter">المنتجات الموردة</p>
                                            <p className="text-2xl font-black font-sans text-emerald-600">{supplier.products.length}</p>
                                        </div>
                                    </div>
                                    <div className="mt-auto p-3 bg-amber-50 rounded-xl border border-amber-100">
                                        <p className="text-[9px] font-bold text-amber-700 leading-relaxed">
                                            يتم تحديث الرصيد والمشتريات تلقائياً عند كل عملية شراء أو دفع مسجلة لهذا المورد.
                                        </p>
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
                    <button onClick={() => setActiveTab('ORDERS')} className={`px-4 py-4 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${activeTab === 'ORDERS' ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                        <ShoppingCart size={18} /> سجل الطلبات
                        <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px]">{supplier.orders.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('SOA')} className={`px-4 py-4 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${activeTab === 'SOA' ? 'text-emerald-600 border-emerald-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                        <History size={18} /> كشف الحساب (SOA)
                    </button>
                    <button onClick={() => setActiveTab('PRODUCTS')} className={`px-4 py-4 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${activeTab === 'PRODUCTS' ? 'text-violet-600 border-violet-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                        <Package size={18} /> قائمة المنتجات الموردة
                    </button>
                    <button onClick={() => setActiveTab('ANALYTICS')} className={`px-4 py-4 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${activeTab === 'ANALYTICS' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                        <Activity size={18} /> تحليلات الأداء
                    </button>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
                    {activeTab === 'ORDERS' && (
                        <div className="p-0">
                            <InvoicesTable 
                                invoices={supplier.orders.map(o => ({
                                    ...o,
                                    invoiceNumber: o.orderNumber,
                                    invoiceDate: o.orderDate,
                                    paid: (o.invoice?.supplierPayments || []).reduce((sum, p) => sum + p.amount, 0),
                                    remaining: (o.total || 0) - (o.invoice?.supplierPayments || []).reduce((sum, p) => sum + p.amount, 0)
                                }))}
                                onShowPayment={(inv) => { setShowPaymentModal(inv); setPaymentAmount(Math.max(0, inv.remaining)); }}
                                onShowHistory={(inv) => setShowHistoryModal(inv)}
                                onShowReturns={(inv) => setShowReturnsModal(inv)}
                                isSupplierView={true}
                                onRefundExcess={handleRefundExcess}
                            />
                        </div>
                    )}

                    {activeTab === 'SOA' && (
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><History size={24} /></div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900">كشف الحساب التفصيلي</h3>
                                        <p className="text-xs font-bold text-gray-400">سجل كامل للطلبيات والمدفوعات المالية</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => window.print()} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-black transition-all">
                                        <Printer size={16} /> طباعة الكشف
                                    </button>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-6 py-4 font-black text-gray-400 text-[10px] uppercase tracking-widest">التاريخ</th>
                                            <th className="px-6 py-4 font-black text-gray-400 text-[10px] uppercase tracking-widest">نوع العملية</th>
                                            <th className="px-6 py-4 font-black text-gray-400 text-[10px] uppercase tracking-widest">المرجع</th>
                                            <th className="px-6 py-4 font-black text-gray-400 text-[10px] uppercase tracking-widest text-left">مبلغ الشراء</th>
                                            <th className="px-6 py-4 font-black text-gray-400 text-[10px] uppercase tracking-widest text-left">المبلغ المدفوع</th>
                                            <th className="px-6 py-4 font-black text-gray-400 text-[10px] uppercase tracking-widest text-left">الرصيد</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(() => {
                                            const txs: any[] = [];
                                            (supplier.orders || []).forEach(o => {
                                                txs.push({ date: new Date(o.orderDate), type: o.type === 'PURCHASE' ? 'شراء' : 'إرجاع', ref: o.orderNumber, debit: o.type === 'PURCHASE' ? o.total : 0, credit: o.type === 'RETURN_PURCHASE' ? o.total : 0 });
                                            });
                                            (supplier.payments || []).forEach(p => {
                                                txs.push({ date: new Date(p.paymentDate), type: 'دفع', ref: 'PAY-' + p.id, debit: 0, credit: p.amount });
                                            });
                                            txs.sort((a, b) => a.date.getTime() - b.date.getTime());
                                            
                                            let balance = 0;
                                            return txs.map((tx, idx) => {
                                                balance += (tx.debit - tx.credit);
                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-gray-900 font-sans">{tx.date.toLocaleDateString('ar-DZ')}</td>
                                                        <td className="px-6 py-4 font-black text-gray-600">{tx.type}</td>
                                                        <td className="px-6 py-4 font-bold text-indigo-600 font-sans">{tx.ref}</td>
                                                        <td className="px-6 py-4 font-black text-gray-900 text-left font-sans">{tx.debit > 0 ? tx.debit.toLocaleString() : '---'}</td>
                                                        <td className="px-6 py-4 font-black text-emerald-600 text-left font-sans">{tx.credit > 0 ? tx.credit.toLocaleString() : '---'}</td>
                                                        <td className="px-6 py-4 font-black text-gray-900 text-left font-sans">{balance.toLocaleString()}</td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'PRODUCTS' && (
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {supplier.products.map(p => (
                                    <div key={p.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col gap-4 group hover:bg-white hover:shadow-xl hover:shadow-gray-100 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><Package size={24} /></div>
                                            <span className="bg-white text-gray-400 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest">{p.code || 'NO-CODE'}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{p.name}</h4>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1">المخزون الحالي: <span className="text-gray-900">{p.quantity} {p.unit}</span></p>
                                        </div>
                                        <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-gray-400 uppercase">سعر الشراء</span>
                                                <span className="font-black text-gray-900">{p.purchasePrice.toLocaleString()} <span className="text-[10px]">دج</span></span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-black text-gray-400 uppercase">إجمالي المورد</span>
                                                <span className="font-black text-indigo-600">{p.totalPurchasedQty} {p.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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

            {/* PAYMENT MODAL (Simplified) */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(null)} />
                    <form onSubmit={handleRecordPayment} className="bg-white rounded-[2.5rem] shadow-2xl z-10 w-full max-w-lg p-8 animate-in zoom-in-95 border border-gray-100 flex flex-col gap-6">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                <CreditCard size={24} className="text-indigo-600" /> تسجيل دفع للمورد
                            </h2>
                            <button type="button" onClick={() => setShowPaymentModal(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-indigo-50 p-4 rounded-2xl flex justify-between items-center">
                                <span className="text-xs font-black text-indigo-600 uppercase">المبلغ المتبقي</span>
                                <span className="text-xl font-black text-indigo-700 font-sans">{showPaymentModal.remaining?.toLocaleString()} دج</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase mr-1">المبلغ المراد دفعه</label>
                                <input type="number" required value={paymentAmount} onChange={e => setPaymentAmount(parseFloat(e.target.value))} className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 text-gray-900 font-black text-lg focus:bg-white focus:border-indigo-400 transition-all outline-none" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase mr-1">طريقة الدفع</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['CASH', 'CHEQUE', 'BANK_TRANSFER'].map((method: any) => (
                                        <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`py-3 rounded-xl text-[10px] font-black transition-all border-2 ${paymentMethod === method ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'}`}>
                                            {method === 'CASH' ? 'نقداً' : method === 'CHEQUE' ? 'صك' : 'تحويل'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50">
                            {isSubmitting ? 'جاري الحفظ...' : 'تأكيد عملية الدفع'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
