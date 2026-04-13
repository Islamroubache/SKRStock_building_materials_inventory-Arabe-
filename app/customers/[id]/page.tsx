'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ChevronRight, Building2, User, AlertTriangle, Briefcase,
    ShoppingCart, FileText, Plus, ChevronDown, ChevronUp,
    CreditCard, History, Clock, ArrowDownLeft, CheckCircle,
    Calendar, Phone, MapPin, MoreVertical, ExternalLink, X,
    Printer, Activity, RotateCcw, Package
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export default function CustomerDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [customer, setCustomer] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'PROJECTS' | 'ORDERS' | 'INVOICES' | 'PAYMENTS'>('PROJECTS');

    // States for modals/sheets
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentData, setPaymentData] = useState<{ type: 'ORDER' | 'PROJECT' | 'GLOBAL', invoiceId?: number, projectId?: number, amount: string, max: number }>({ type: 'ORDER', amount: '', max: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isProjectSheetOpen, setIsProjectSheetOpen] = useState(false);
    const [projectData, setProjectData] = useState({ name: '', description: '', startDate: '' });

    const [expandedProjects, setExpandedProjects] = useState<number[]>([]);

    // New states for returns and expanded orders
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
    const [returnModal, setReturnModal] = useState<{ item: any; maxQty: number } | null>(null);
    const [returnQty, setReturnQty] = useState(1);
    const [isReturning, setIsReturning] = useState(false);

    const fetchCustomer = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/customers/${id}`);
            if (res.ok) {
                const data = await res.json();
                setCustomer(data);
                if (data.type !== 'LOYAL') {
                    setActiveTab('ORDERS');
                }
            }

            // Fetch payments
            const payRes = await fetch(`/api/payments/customer/${id}`);
            if (payRes.ok) {
                const payData = await payRes.json();
                setPayments(payData);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchCustomer();
    }, [id]);

    const handlePayment = async () => {
        setIsSubmitting(true);
        try {
            let res;
            if (paymentData.type === 'ORDER') {
                res = await fetch(`/api/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        invoiceId: paymentData.invoiceId,
                        customerId: parseInt(id as string),
                        amount: parseFloat(paymentData.amount),
                        paymentMethod: 'CASH',
                        notes: 'دفعة من صفحة تفاصيل العميل'
                    })
                });
            } else {
                res = await fetch(`/api/customers/${id}/pay`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: parseFloat(paymentData.amount),
                        projectId: paymentData.projectId
                    })
                });
            }
            if (res.ok) {
                setIsPaymentModalOpen(false);
                setPaymentData({ type: 'ORDER', amount: '', max: 0 });
                fetchCustomer();
            } else {
                const err = await res.json();
                alert(err.error || 'فشل تسجيل الدفعة');
            }
        } catch (e) {
            alert('خطأ في الاتصال');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateProject = async () => {
        try {
            const res = await fetch(`/api/customers/${id}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
            if (res.ok) {
                setIsProjectSheetOpen(false);
                fetchCustomer();
                setProjectData({ name: '', description: '', startDate: '' });
            } else {
                alert('فشل إنشاء المشروع');
            }
        } catch (e) {
            alert('خطأ');
        }
    };

    const toggleProjectExpansion = (pid: number) => {
        if (expandedProjects.includes(pid)) {
            setExpandedProjects(expandedProjects.filter(x => x !== pid));
        } else {
            setExpandedProjects([...expandedProjects, pid]);
        }
    };

    const handleReturn = async () => {
        if (!returnModal) return;
        setIsReturning(true);
        try {
            const res = await fetch(`/api/customers/${id}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderItemId: returnModal.item.id, quantity: returnQty })
            });
            const data = await res.json();
            if (res.ok) {
                setReturnModal(null);
                fetchCustomer();
                alert(`✅ تم الإرجاع بنجاح. تم تخفيض رصيد العميل بـ ${data.returnValue?.toLocaleString()} دج`);
            } else {
                alert(`❌ ${data.error}`);
            }
        } catch { alert('خطأ في الاتصال'); }
        finally { setIsReturning(false); }
    };

    const getChartData = () => {
        if (!customer?.orders) return [];
        const months: Record<string, number> = {};
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthName = d.toLocaleDateString('ar-DZ', { month: 'short', year: 'numeric' });
            months[monthName] = 0;
        }

        customer.orders.forEach((o: any) => {
            const d = new Date(o.orderDate);
            const monthName = d.toLocaleDateString('ar-DZ', { month: 'short', year: 'numeric' });
            if (months[monthName] !== undefined) {
                months[monthName] += o.totalAmount || o.total;
            }
        });

        return Object.keys(months).map(k => ({ name: k, 'إجمالي المبيعات': months[k] }));
    };

    const handlePrint = () => window.print();

    const creditStats = useMemo(() => {
        if (!customer) return null;
        const totalDebt = customer.balanceDue || 0;
        const limit = customer.creditLimit || 0;
        const usedPercent = limit > 0 ? (totalDebt / limit) * 100 : 0;
        const remaining = limit - totalDebt;

        return { totalDebt, limit, usedPercent, remaining };
    }, [customer]);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col justify-center items-center h-screen bg-gray-50 gap-4" dir="rtl">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-black text-gray-400">جاري تحميل بيانات العميل...</p>
            </div>
        );
    }

    if (!customer) {
        return <div className="p-8 text-center text-red-500 font-black" dir="rtl">لم يتم العثور على العميل</div>;
    }

    const isLoyal = customer.type === 'LOYAL';
    const overCredit = isLoyal && customer.creditLimit && customer.balanceDue >= customer.creditLimit;

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 flex flex-col gap-8 print:bg-white print:p-0" dir="rtl">
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
                    .no-print { display: none !important; }
                    .print-shadow-none { box-shadow: none !important; border: 1px solid #e5e7eb !important; background: white !important; }
                }
            `}</style>

            <div className="print-area w-full h-full">
                {/* Breadcrumb & Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print mb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                            <Link href="/customers" className="hover:text-blue-600 transition-colors">قائمة العملاء</Link>
                            <ChevronRight size={14} className="rotate-180" />
                            <span className="text-gray-900">{customer.name}</span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 mt-2 flex items-center gap-3">
                            {customer.name}
                        </h1>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all">
                            <Printer size={18} /> كشف الحساب
                        </button>
                        <Link href={`/orders/new?customerId=${id}`} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-blue-200 hover:scale-105 transition-all">
                            <Plus size={18} /> طلبية بيع
                        </Link>
                    </div>
                </div>

                {/* Profile Info & Credit Dashboard */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* Left Column: Client Info */}
                    <div className="xl:col-span-1 flex flex-col gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center text-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-10"></div>
                            <div className="w-24 h-24 rounded-[2rem] bg-white border-4 border-gray-50 flex items-center justify-center text-3xl font-black text-blue-600 shadow-xl relative z-10">
                                {customer.name.substring(0, 1)}
                            </div>
                            <div className="relative z-10 w-full mt-2">
                                <h2 className="text-2xl font-black text-gray-900">{customer.name}</h2>
                                <p className="text-gray-400 font-bold text-sm mt-1">{customer.company || 'شركة خاصة'}</p>
                            </div>

                            <div className="w-full grid grid-cols-1 gap-3 mt-4">
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="bg-white p-2 rounded-xl text-gray-400"><Phone size={18} /></div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">رقم الهاتف</p>
                                        <p className="font-black font-sans text-gray-900" dir="ltr">{customer.phone || '---'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="bg-white p-2 rounded-xl text-gray-400 mt-1"><MapPin size={18} /></div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">الموقع الجغرافي</p>
                                        <p className="font-black text-gray-900 leading-tight">
                                            {customer.address}<br />
                                            {customer.commune} - {customer.wilaya}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <History size={16} /> نشاط العميل
                            </h3>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                        <span className="text-sm font-bold text-gray-500">منذ الانضمام</span>
                                    </div>
                                    <span className="font-black text-gray-900 font-sans">{formatDate(customer.createdAt)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                        <span className="text-sm font-bold text-gray-500">آخر دفعة</span>
                                    </div>
                                    <span className="font-black text-gray-900 font-sans">{customer.lastPaymentDate ? formatDate(customer.lastPaymentDate) : '---'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-amber-600"></div>
                                        <span className="text-sm font-bold text-gray-500">آخر طلبية</span>
                                    </div>
                                    <span className="font-black text-gray-900 font-sans">
                                        {customer.orders && customer.orders.length > 0
                                            ? formatDate(customer.orders[0].orderDate)
                                            : '---'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Credit Analytics */}
                    <div className="xl:col-span-2 flex flex-col gap-8">
                        {overCredit && (
                            <div className="bg-red-600 text-white p-6 rounded-[2rem] shadow-xl shadow-red-200 flex items-center gap-6 animate-pulse">
                                <div className="bg-white/20 p-4 rounded-2xl"><AlertTriangle size={32} /></div>
                                <div>
                                    <h3 className="text-xl font-black">تجاوز الحد الائتماني!</h3>
                                    <p className="font-bold opacity-80 mt-1">يجب على العميل تسديد جزء من ديونه ليتمكن من القيام بعمليات شراء آجلة أخرى.</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900">تحليل الرصيد والائتمان</h3>
                                    <p className="text-gray-400 font-bold text-sm">مراقبة الديون المفتوحة وسقف الإنفاق الآجل</p>
                                </div>
                                <div className="flex bg-gray-50 p-1 rounded-xl">
                                    <span className="px-4 py-2 text-xs font-black text-gray-900 bg-white rounded-lg shadow-sm">الحساب الجاري</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">إجمالي الدين المستحق</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-3xl font-black font-sans ${creditStats && creditStats.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {creditStats?.totalDebt?.toLocaleString()} دج
                                        </span>
                                        {creditStats && creditStats.totalDebt > 0 && <ArrowDownLeft className="text-red-600" size={24} />}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الحد الائتماني المعتمد</span>
                                    <div className="flex items-center gap-2 text-gray-900">
                                        <span className="text-3xl font-black font-sans">{creditStats?.limit?.toLocaleString()} دج</span>
                                        <div className="bg-gray-100 p-1 rounded-lg"><CreditCard size={18} /></div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الرصيد الائتماني المتاح</span>
                                    <div className="flex items-center gap-2 text-blue-600">
                                        <span className="text-3xl font-black font-sans">{creditStats?.remaining?.toLocaleString()} دج</span>
                                        <div className={`w-3 h-3 rounded-full ${overCredit ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-black text-gray-500">معدل استخدام الائتمان</span>
                                    <span className={`text-xs font-black font-sans ${overCredit ? 'text-red-600' : 'text-blue-600'}`}>{creditStats ? Math.round(creditStats.usedPercent) : 0}%</span>
                                </div>
                                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ease-out ${overCredit ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]'}`}
                                        style={{ width: `${creditStats ? Math.min(100, creditStats.usedPercent) : 0}%` }}
                                    ></div>
                                </div>
                                {overCredit && (
                                    <p className="text-[10px] font-black text-red-600 mt-3 text-left">تنبيه: تجاوز العميل سقف الائتمان بـ {Math.abs(creditStats?.remaining ?? 0).toLocaleString()} دج</p>
                                )}
                                
                                {creditStats && creditStats.totalDebt > 0 && (
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => { setPaymentData({ type: 'GLOBAL', amount: creditStats.totalDebt.toString(), max: creditStats.totalDebt }); setIsPaymentModalOpen(true); }}
                                            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-gray-200 hover:-translate-y-1 transition-all flex items-center gap-2 w-full justify-center"
                                        >
                                            <CreditCard size={16} /> تسديد شامل لكامل ديون العميل
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-2">
                                <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl w-fit mb-2"><Briefcase size={20} /></div>
                                <span className="text-[10px] font-black text-gray-400 uppercase">المشاريع النشطة</span>
                                <span className="text-2xl font-black font-sans text-gray-900">{customer.projects?.length || 0}</span>
                            </div>
                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-2">
                                <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl w-fit mb-2"><ShoppingCart size={20} /></div>
                                <span className="text-[10px] font-black text-gray-400 uppercase">إجمالي المقتنيات الثابتة</span>
                                <span className="text-2xl font-black font-sans text-gray-900 border-b border-indigo-100 pb-1 w-fit">{customer.orders?.reduce((sum: number, o: any) => sum + (o.total || 0), 0).toLocaleString()} دج</span>
                            </div>
                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-2">
                                <div className="bg-green-50 text-green-600 p-3 rounded-2xl w-fit mb-2"><CheckCircle size={20} /></div>
                                <span className="text-[10px] font-black text-gray-400 uppercase">المبلغ الإجمالي المسدد</span>
                                <span className="text-2xl font-black font-sans text-green-600">
                                    {customer.invoices?.reduce((sum: number, inv: any) => sum + (inv.paid || 0), 0).toLocaleString()} دج
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Tabs */}
                <div className="flex flex-col gap-6">
                    <div className="flex gap-2 p-1 bg-white border border-gray-200 rounded-2xl w-fit shadow-sm no-print">
                        {isLoyal && (
                            <button onClick={() => setActiveTab('PROJECTS')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'PROJECTS' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                                <Briefcase size={16} /> المشاريع
                            </button>
                        )}
                        <button onClick={() => setActiveTab('ORDERS')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'ORDERS' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                            <ShoppingCart size={16} /> المبيعات
                        </button>
                        <button onClick={() => setActiveTab('INVOICES')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'INVOICES' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                            <FileText size={16} /> الرصيد والديون
                        </button>
                        <button onClick={() => setActiveTab('PAYMENTS')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'PAYMENTS' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                            <History size={16} /> سجل المدفوعات
                        </button>
                        <button onClick={() => setActiveTab('ANALYTICS' as any)} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'ANALYTICS' as any ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                            <Activity size={16} /> التحليلات
                        </button>
                    </div>

                    <div className="min-h-[400px]">
                        {/* PRINT TABLES */}
                        <div className="hidden print-block w-full text-sm mt-8 no-print print:block !shadow-none !border-none">
                            <h3 className="font-black text-gray-900 mb-2 border-b pb-2">سجل آخر المبيعات (الطلبيات):</h3>
                            <table className="w-full text-right mb-8">
                                <thead><tr className="border-b"><th className="py-2">رقم الطلب</th><th className="py-2">التاريخ</th><th className="py-2">المشروع</th><th className="py-2">الرصيد المدين</th></tr></thead>
                                <tbody>
                                    {customer.orders?.slice(0, 10).map((o: any) => <tr key={o.id} className="border-b"><td className="py-2">{o.orderNumber}</td><td className="py-2">{formatDate(o.orderDate)}</td><td className="py-2">{o.project?.name || '-'}</td><td className="py-2">{o.totalAmount || o.total} دج</td></tr>)}
                                </tbody>
                            </table>

                            <h3 className="font-black text-gray-900 mb-2 border-b pb-2">سجل الديون (الفواتير):</h3>
                            <table className="w-full text-right mb-8">
                                <thead><tr className="border-b"><th className="py-2">الفاتورة</th><th className="py-2">حالة الدفع</th><th className="py-2">الإجمالي</th><th className="py-2">المتبقي</th></tr></thead>
                                <tbody>
                                    {customer.invoices?.map((inv: any) => <tr key={inv.id} className="border-b"><td className="py-2">{inv.invoiceNumber}</td><td className="py-2">{inv.status === 'PAID' ? 'خالصة' : 'متبقي'}</td><td className="py-2">{inv.total} دج</td><td className="py-2">{inv.total - inv.paid} دج</td></tr>)}
                                </tbody>
                            </table>
                        </div>

                        {/* ANALYTICS TAB */}
                        {activeTab === 'ANALYTICS' as any && (
                            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden animate-in fade-in duration-500 no-print">
                                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-6">
                                    <Activity size={18} className="text-blue-600" /> تحليل حجم المبيعات (آخر 6 أشهر)
                                </h3>
                                <div className="h-72 w-full" dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={getChartData()}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.5} vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} dx={-10} tickFormatter={value => `${value / 1000}k`} />
                                            <RechartsTooltip cursor={{ stroke: '#E5E7EB', strokeWidth: 2 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} labelStyle={{ fontWeight: 'black', marginBottom: '8px' }} />
                                            <Line type="monotone" dataKey="إجمالي المبيعات" stroke="#2563EB" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                        {/* PROJECTS TAB */}
                        {activeTab === 'PROJECTS' && isLoyal && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {customer.projects?.length === 0 ? (
                                    <div className="col-span-full py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 flex flex-col items-center gap-4 text-gray-300">
                                        <Briefcase size={48} />
                                        <p className="font-black">لا توجد مشاريع مسجلة لهذا العميل حالياً</p>
                                        <button onClick={() => setIsProjectSheetOpen(true)} className="text-blue-600 font-black text-sm hover:underline">+ إنشاء أول مشروع</button>
                                    </div>
                                ) : (
                                    customer.projects.map((p: any) => {
                                        const prog = p.totalAmount > 0 ? (p.paidAmount / p.totalAmount) * 100 : 0;
                                        const isExpanded = expandedProjects.includes(p.id);
                                        const projOrders = customer.orders?.filter((o: any) => o.projectId === p.id) || [];

                                        return (
                                            <div key={p.id} className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group flex flex-col">
                                                <div className="p-8 flex flex-col gap-6 cursor-pointer" onClick={() => toggleProjectExpansion(p.id)}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="font-black text-xl text-gray-900 flex items-center gap-3">
                                                                {p.name}
                                                                {isExpanded ? <ChevronUp size={18} className="text-blue-600" /> : <ChevronDown size={18} className="text-gray-300 group-hover:text-blue-400 transition-colors" />}
                                                            </h3>
                                                            <p className="text-gray-400 font-bold text-sm mt-1">{p.description || 'مشروع بناء وتوريد مواد'}</p>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                            {p.status === 'ACTIVE' ? 'قيد التنفيذ' : 'مكتمل'}
                                                        </span>
                                                    </div>

                                                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                                        <div className="flex justify-between items-end mb-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-gray-400 uppercase">إجمالي الطلبات المسندة للمشروع</span>
                                                                <span className="font-black text-blue-600 font-sans">{p.totalAmount.toLocaleString()} دج</span>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] font-black text-gray-400 uppercase">نسبة السداد</span>
                                                                <span className="font-black text-green-600 font-sans">{Math.round(prog)}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(prog, 100)}%` }} />
                                                        </div>
                                                    </div>

                                                    {p.totalAmount - p.paidAmount > 0 && (
                                                        <div className="flex justify-end mt-4">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setPaymentData({ type: 'PROJECT', projectId: p.id, amount: (p.totalAmount - p.paidAmount).toString(), max: (p.totalAmount - p.paidAmount) }); setIsPaymentModalOpen(true); }}
                                                                className="bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 border border-blue-100 shadow-sm"
                                                            >
                                                                <ArrowDownLeft size={16} /> تسديد ديون هذا المشروع
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {isExpanded && (
                                                    <div className="bg-gray-50/50 border-t border-gray-100 p-8 pt-0 animate-in slide-in-from-top-4 duration-300">
                                                        <div className="space-y-3 mt-6">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">تفاصيل الطلبيات المرتبطة</p>
                                                            {projOrders.length === 0 ? (
                                                                <p className="text-center py-4 text-xs font-bold text-gray-400 italic">لا توجد طلبيات مسجلة لهذا المشروع بعد</p>
                                                            ) : (
                                                                projOrders.map((o: any) => {
                                                                    const isFullyReturned = o.items && o.items.length > 0 && o.items.every((i: any) => i.returnedQuantity === i.quantity);
                                                                    const isPartiallyReturned = o.items && !isFullyReturned && o.items.some((i: any) => i.returnedQuantity > 0);
                                                                    
                                                                    return (
                                                                    <div key={o.id} className="flex flex-col gap-3 bg-white p-4 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                                                        <div className="flex justify-between items-start">
                                                                            <div className="flex flex-col gap-1">
                                                                                <span className="font-black text-gray-900 font-sans tracking-tight flex items-center gap-2">
                                                                                    {o.orderNumber}
                                                                                    {isFullyReturned && <span className="bg-rose-100 text-rose-700 text-[9px] px-2 py-0.5 rounded-sm">مسترجعة كلياً</span>}
                                                                                    {isPartiallyReturned && <span className="bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 rounded-sm">مسترجعة جزئياً</span>}
                                                                                </span>
                                                                                <span className="text-[10px] font-black text-gray-400">{formatDate(o.orderDate)}</span>
                                                                            </div>
                                                                            <div className="flex flex-col items-end">
                                                                                <span className={`font-black font-sans ${isFullyReturned ? 'text-gray-400 line-through' : 'text-blue-600'}`}>{(o.total || 0).toLocaleString()} دج</span>
                                                                                {o.invoice ? (
                                                                                    <span className={`text-[10px] font-black ${o.invoice.remaining === 0 ? 'text-green-600 border border-green-100 bg-green-50 px-2 py-0.5 rounded-md mt-1' : 'text-amber-600 border border-amber-100 bg-amber-50 px-2 py-0.5 rounded-md mt-1'}`}>
                                                                                        {o.invoice.remaining === 0 ? 'مكتمل التسديد' : `دين متبقي: ${o.invoice.remaining.toLocaleString()} دج`}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className={`text-[9px] font-black text-gray-400`}>لا توجد فاتورة</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div className="flex justify-between items-center mt-1 pt-3 border-t border-gray-50">
                                                                            <div className="flex gap-2">
                                                                                <button onClick={() => window.open(`/orders/${o.id}/print`, '_blank')} className="text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5">
                                                                                    <Printer size={12} /> معاينة وطباعة
                                                                                </button>
                                                                            </div>
                                                                            {o.invoice?.remaining > 0 && !isFullyReturned && (
                                                                                <button
                                                                                    onClick={() => { setPaymentData({ type: 'ORDER', invoiceId: o.invoice.id, amount: o.invoice.remaining.toString(), max: o.invoice.remaining }); setIsPaymentModalOpen(true); }}
                                                                                    className="text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                                                                                >
                                                                                    <CreditCard size={12} /> تسديد الطلبية
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )})
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                                <div className="col-span-full flex justify-center mt-4">
                                    <button
                                        onClick={() => setIsProjectSheetOpen(true)}
                                        className="p-8 rounded-[2rem] border-4 border-dashed border-gray-100 text-gray-300 hover:border-blue-100 hover:text-blue-400 transition-all flex flex-col items-center gap-2 group min-w-[300px]"
                                    >
                                        <Plus size={32} className="group-hover:scale-125 transition-transform" />
                                        <span className="font-black uppercase tracking-widest text-xs">إضافة مشروع جديد</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ORDERS TAB */}
                        {activeTab === 'ORDERS' && (
                            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden animate-in fade-in duration-500">
                                <div className="divide-y divide-gray-50">
                                    {customer.orders?.length === 0 ? (
                                        <div className="py-20 text-center text-gray-300 font-black">لا توجد مبيعات مسجلة</div>
                                    ) : (
                                        customer.orders.map((o: any) => {
                                            const isFullyReturned = o.items && o.items.length > 0 && o.items.every((i: any) => i.returnedQuantity === i.quantity);
                                            const isPartiallyReturned = o.items && !isFullyReturned && o.items.some((i: any) => i.returnedQuantity > 0);
                                            return (
                                            <div key={o.id}>
                                                <div
                                                    className="flex items-center justify-between p-5 hover:bg-gray-50/80 cursor-pointer group transition-colors"
                                                    onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-xl transition-colors ${expandedOrder === o.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                                                            {expandedOrder === o.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-900 font-sans tracking-tight flex items-center gap-2">
                                                                {o.orderNumber}
                                                                {isFullyReturned && <span className="bg-rose-100 text-rose-700 text-[9px] px-2 py-0.5 rounded-sm">مسترجعة كلياً</span>}
                                                                {isPartiallyReturned && <span className="bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 rounded-sm">مسترجعة جزئياً</span>}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                                                <Calendar size={11} /> {formatDate(o.orderDate)}
                                                                {o.project && <span className="mr-2 px-2 rounded bg-blue-50 text-blue-600">{o.project.name}</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-6">
                                                        <button onClick={(e) => { e.stopPropagation(); window.open(`/orders/${o.id}/print`, '_blank'); }} className="text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200 px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 h-fit">
                                                            <Printer size={14} /> إعداد للطباعة
                                                        </button>
                                                        <div className="flex flex-col text-left">
                                                            <span className={`font-black font-sans ${isFullyReturned ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{((o.totalAmount || o.total) || 0).toLocaleString()} دج</span>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase min-w-[70px] text-center ${o.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {o.status === 'DONE' ? 'مكتمل' : 'معلق'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Expanded Order Items */}
                                                {expandedOrder === o.id && (
                                                    <div className="bg-indigo-50/30 border-t border-indigo-50 px-5 pb-5 pt-4 animate-in slide-in-from-top-2 duration-200">
                                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">تفاصيل المبيعات:</p>
                                                        <div className="flex flex-col gap-2">
                                                            {o.items?.map((item: any) => {
                                                                const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                                                                return (
                                                                    <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-indigo-50/50 shadow-sm">
                                                                        <div className="flex items-center gap-3">
                                                                            <Package size={16} className="text-indigo-400" />
                                                                            <div>
                                                                                <p className="font-bold text-gray-900 text-sm">{item.product.name}</p>
                                                                                <p className="text-xs font-black text-indigo-600">{item.unitPrice.toLocaleString()} دج / {item.product.unit}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="flex flex-col items-end">
                                                                                <span className="font-black text-gray-900 text-sm" dir="ltr">{item.quantity} {item.product.unit}</span>
                                                                                {item.returnedQuantity > 0 && (
                                                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">تم استرجاع: {item.returnedQuantity}</span>
                                                                                )}
                                                                            </div>
                                                                            <span className="text-gray-200">|</span>
                                                                            <span className="font-black text-gray-900 text-sm">{item.total.toLocaleString()} دج</span>

                                                                            {/* Return Button inside Order */}
                                                                            <div className="min-w-[70px] flex justify-end">
                                                                                {maxReturnable > 0 ? (
                                                                                    <button
                                                                                        onClick={() => { setReturnModal({ item, maxQty: maxReturnable }); setReturnQty(1); }}
                                                                                        className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 hover:bg-amber-100 transition-all"
                                                                                    >
                                                                                        <RotateCcw size={12} /> إسترجاع
                                                                                    </button>
                                                                                ) : (
                                                                                    <span className="text-[10px] font-black bg-gray-100 text-gray-400 px-2 py-1 rounded-xl">مسترجع بالكامل</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* INVOICES TAB */}
                        {activeTab === 'INVOICES' && (
                            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden animate-in fade-in duration-500">
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">الفاتورة / الاستحقاق</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-center">الحالة</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">إجمالي الفاتورة</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest">المتبقي للدفع</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-left">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {customer.invoices?.length === 0 ? (
                                            <tr><td colSpan={5} className="py-20 text-center text-gray-300 font-black">لا توجد فواتير דיון</td></tr>
                                        ) : (
                                            customer.invoices.map((inv: any) => {
                                                const remain = inv.total - inv.paid;
                                                return (
                                                    <tr key={inv.id} className="hover:bg-red-50/30 transition-all group">
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-black text-gray-900 font-sans tracking-tight">{inv.invoiceNumber}</span>
                                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase">
                                                                    <Clock size={10} />
                                                                    {inv.dueDate ? `استحقاق: ${formatDate(inv.dueDate)}` : 'فورية'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase
                                                            ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                                    inv.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                                {inv.status === 'PAID' ? 'خالصة' : inv.status === 'PARTIAL' ? 'دفع جزئي' : 'غير مسددة'}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6 font-black font-sans text-gray-900">{inv.total.toLocaleString()} دج</td>
                                                        <td className="px-8 py-6">
                                                            <span className={`font-black font-sans text-lg ${remain > 0 ? 'text-red-600' : 'text-green-600'}`}>{remain.toLocaleString()} دج</span>
                                                        </td>
                                                        <td className="px-8 py-6 text-left">
                                                            {remain > 0 ? (
                                                                <button
                                                                    onClick={() => { setPaymentData({ type: 'ORDER', invoiceId: inv.id, amount: remain.toString(), max: remain }); setIsPaymentModalOpen(true); }}
                                                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-blue-100 hover:scale-105 transition-all flex items-center gap-2"
                                                                >
                                                                    <ArrowDownLeft size={14} /> تسديد الآن
                                                                </button>
                                                            ) : (
                                                                <button className="text-gray-400 p-2"><CheckCircle size={20} className="text-green-500" /></button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* PAYMENTS TAB */}
                        {activeTab === 'PAYMENTS' && (
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl animate-in fade-in duration-500">
                                {payments.length === 0 ? (
                                    <div className="py-24 text-center text-gray-200 flex flex-col items-center gap-4">
                                        <History size={64} />
                                        <p className="text-xl font-black">لا توجد سجلات دفع لهذا العميل حالياً</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8 relative pr-6 border-r-4 border-gray-50 mr-4">
                                        {payments.map((p, idx) => (
                                            <div key={p.id} className="relative group">
                                                {/* Timeline Node */}
                                                <div className="absolute top-2 -right-[34px] w-6 h-6 bg-white border-4 border-blue-600 rounded-full shadow-lg z-10 group-hover:scale-125 transition-transform duration-500"></div>

                                                <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 group-hover:bg-white group-hover:shadow-xl group-hover:border-blue-50 transition-all duration-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-2xl font-black text-green-600 font-sans">{p.amount.toLocaleString()} دج</span>
                                                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{p.paymentMethod}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                                            <Calendar size={14} />
                                                            <span>{formatDate(p.paymentDate)}</span>
                                                            <span className="mx-2 opacity-50">•</span>
                                                            <Clock size={14} />
                                                            <span>{new Date(p.paymentDate).toLocaleTimeString('ar-DZ')}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col md:items-end gap-1">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase">بخصوص الفاتورة</span>
                                                        <Link href={`/invoices`} className="text-sm font-black text-gray-900 font-sans hover:text-blue-600 underline flex items-center gap-1">
                                                            {p.invoice?.invoiceNumber} <ExternalLink size={12} />
                                                        </Link>
                                                        {p.notes && <p className="text-[10px] font-bold text-gray-500 italic mt-1 max-w-[200px] text-left">{p.notes}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* PAYMENT MODAL */}
                {isPaymentModalOpen && (
                    <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4">
                        <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">
                                        {paymentData.type === 'GLOBAL' ? 'تسديد ديون العميل شاملة' : 
                                         paymentData.type === 'PROJECT' ? 'تسديد ديون المشروع' : 'سداد طلبية'}
                                    </h2>
                                    <p className="text-xs font-bold text-gray-400 mt-1">
                                        {paymentData.type === 'GLOBAL' ? 'سيتم التوزيع آلياً على أقدم الطلبيات غير المسددة' : 
                                         paymentData.type === 'PROJECT' ? 'سيتم التوزيع آلياً لتسديد ديون هذا المشروع' : 'تأكيد استلام دفعة مالية للطلبية'}
                                    </p>
                                </div>
                                <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors p-2"><X size={24} /></button>
                            </div>

                            <div className="p-8 flex flex-col gap-8">
                                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-blue-800 uppercase mb-1">المبلغ المتبقي للاستحقاق</p>
                                        <p className="text-2xl font-black text-blue-900 font-sans">{paymentData.max.toLocaleString()} دج</p>
                                    </div>
                                    <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><ArrowDownLeft size={24} /></div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-black text-gray-600 mb-3 mr-1 uppercase">المبلغ المدفوع حـالـيـاً</label>
                                        <input
                                            type="number"
                                            value={paymentData.amount}
                                            onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-8 py-6 font-black font-sans text-3xl text-center focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="0"
                                        />
                                        <p className="text-center text-[10px] font-black text-gray-400 mt-3 uppercase tracking-widest">تنبيه: سيتم خصم هذا المبلغ من رصيد العميل فوراً</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setPaymentData({ ...paymentData, amount: paymentData.max.toString() })} className="bg-gray-100 py-3 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-200 transition-all">دفع كامل الدين</button>
                                        <button onClick={() => setPaymentData({ ...paymentData, amount: (paymentData.max / 2).toString() })} className="bg-gray-100 py-3 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-200 transition-all">دفع نصف المبلغ</button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 pt-0">
                                <button
                                    onClick={handlePayment}
                                    disabled={isSubmitting || !paymentData.amount || parseFloat(paymentData.amount) <= 0}
                                    className="w-full bg-gray-900 hover:bg-black disabled:opacity-20 text-white h-16 rounded-[1.5rem] font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? 'جاري الحفظ...' : <><CheckCircle size={24} /> حفظ العملية وتحديث الرصيد</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* NEW PROJECT SHEET */}
                {isProjectSheetOpen && (
                    <div className="fixed inset-0 z-[120] flex justify-end">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsProjectSheetOpen(false)} />
                        <div className="bg-white w-full max-w-lg h-full z-10 p-10 flex flex-col shadow-2xl border-l border-gray-100 animate-in slide-in-from-right duration-500">
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-3xl font-black text-gray-900">إضافة مشروع</h2>
                                <button onClick={() => setIsProjectSheetOpen(false)} className="text-gray-400 p-2"><X size={24} /></button>
                            </div>

                            <div className="space-y-8 flex-1">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">اسم المشروع بالكامل</label>
                                    <input
                                        type="text"
                                        value={projectData.name} onChange={e => setProjectData({ ...projectData, name: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-black focus:bg-white focus:ring-4 focus:ring-blue-50/50 outline-none transition-all"
                                        placeholder="مثال: مشروع عمارة بن أحمد - نهج النخل"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">وصف تفصيلي أو موقع المشروع</label>
                                    <textarea
                                        value={projectData.description} onChange={e => setProjectData({ ...projectData, description: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-black focus:bg-white focus:ring-4 focus:ring-blue-50/50 outline-none transition-all min-h-[120px]"
                                        placeholder="ذكر العنوان البريدي أو طبيعة الأشغال..."
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">تاريخ انطلاق الأشغال</label>
                                    <input
                                        type="date"
                                        value={projectData.startDate} onChange={e => setProjectData({ ...projectData, startDate: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-black font-sans focus:bg-white focus:ring-4 focus:ring-blue-50/50 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-50">
                                <button
                                    onClick={handleCreateProject}
                                    disabled={!projectData.name}
                                    className="w-full bg-blue-600 text-white disabled:opacity-50 py-5 rounded-3xl font-black text-lg shadow-xl shadow-blue-100 hover:scale-105 transition-all"
                                >
                                    تأكيد إنشاء المشروع
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* RETURN MODAL */}
                {returnModal && (
                    <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4">
                        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-amber-50/50">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                        <RotateCcw className="text-amber-600" size={20} /> إسترجاع بضاعة من العميل
                                    </h2>
                                    <p className="text-xs font-bold text-gray-500 mt-1">{returnModal.item.product.name}</p>
                                </div>
                                <button onClick={() => setReturnModal(null)} className="text-gray-400 hover:text-gray-900 p-2"><X size={20} /></button>
                            </div>

                            <div className="p-6 flex flex-col gap-6">
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-black text-amber-800 uppercase mb-1">المتبقي الصالح للإرجاع</p>
                                        <p className="text-xl font-black text-amber-900 font-sans">{returnModal.maxQty} {returnModal.item.product.unit}</p>
                                    </div>
                                    <ArrowDownLeft size={28} className="text-amber-400" />
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
                                    ℹ️ سيتم تلقائياً: زيادة الكمية في المخزون + تخفيض الرصيد المطلوب من العميل
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
            </div>
        </div>
    );
}
