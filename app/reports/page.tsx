'use client';

import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    TrendingUp, TrendingDown, Package, Users, ShoppingBag,
    ArrowUpRight, ArrowDownRight, Printer, Download, Filter, RefreshCw,
    Box, UserCheck, AlertCircle, AlertTriangle, FileText, CheckCircle, CreditCard, ArrowDownLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatDate } from '@/lib/utils';

// --- Types ---
interface ReportData {
    totalSales: number;
    totalPurchases: number;
    netProfit: number;
    profitMargin: number;
    productStats: any[];
    topCustomers: any[];
    chartData: any[];
    stockStatus: any[];
}

export default function ReportsPage() {
    const [reportView, setReportView] = useState<'performance' | 'expiry' | 'losses' | 'debt'>('performance');

    // Performance State
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    // Expiry State
    const [expiryStats, setExpiryStats] = useState<any>(null);
    const [loadingExpiry, setLoadingExpiry] = useState(false);

    const fetchReports = async () => {
        setLoading(true);
        try {
            let url = `/api/reports?type=${period}`;
            if (period === 'custom' && from && to) {
                url += `&from=${from}&to=${to}`;
            }
            const res = await fetch(url);
            const report = await res.json();
            setData(report);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchExpiryStats = async () => {
        setLoadingExpiry(true);
        try {
            const res = await fetch('/api/products/expiry-stats');
            const data = await res.json();
            setExpiryStats(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingExpiry(false);
        }
    };

    useEffect(() => {
        if (reportView === 'performance') {
            if (period !== 'custom') fetchReports();
        } else {
            fetchExpiryStats();
        }
    }, [period, reportView]);

    const exportToExcel = () => {
        if (reportView === 'performance') {
            if (!data) return;
            const wb = XLSX.utils.book_new();
            const wsProducts = XLSX.utils.json_to_sheet(data.productStats.map(p => ({
                'المنتج': p.name,
                'الكمية المباعة': p.sold,
                'الإيراد': p.revenue,
                'التكلفة': p.cost,
                'الربح': p.profit
            })));
            XLSX.utils.book_append_sheet(wb, wsProducts, "أداء المنتجات");
            XLSX.writeFile(wb, `تقرير-أداء-مخزوني-${formatDate(new Date())}.xlsx`);
        } else {
            if (!expiryStats) return;
            const wb = XLSX.utils.book_new();

            const allExpiry = [...(expiryStats.expiredProducts || []), ...(expiryStats.expiringSoonProducts || [])];
            const wsExpiry = XLSX.utils.json_to_sheet(allExpiry.map(p => ({
                'الكود': p.code || '-',
                'المنتج': p.name,
                'المورد': p.supplierName,
                'الكمية': p.quantity,
                'تاريخ الانتهاء': formatDate(p.expiryDate),
                'الأيام المتبقية': p.daysRemaining,
                'الحالة': p.daysRemaining < 0 ? 'منتهي الصلاحية' : 'ينتهي قريباً'
            })));

            XLSX.utils.book_append_sheet(wb, wsExpiry, "تقرير الصلاحية");
            XLSX.writeFile(wb, `تقرير-الصلاحية-${formatDate(new Date())}.xlsx`);
        }
    };

    if (loading && !data && reportView === 'performance') {
        return <div className="min-h-screen flex items-center justify-center font-tajawal">
            <RefreshCw className="animate-spin text-blue-600" size={48} />
        </div>;
    }

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col gap-8" dir="rtl">

            {/* VIEW SWITCHER */}
            <div className="flex flex-wrap gap-4 mb-2 print:hidden">
                <button
                    onClick={() => setReportView('performance')}
                    className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm ${reportView === 'performance' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                >
                    <TrendingUp size={20} /> تقارير الأداء المالي
                </button>
                <button
                    onClick={() => setReportView('expiry')}
                    className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm ${reportView === 'expiry' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                >
                    <AlertTriangle size={20} /> تقرير الصلاحية
                </button>
                <button
                    onClick={() => setReportView('losses')}
                    className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm ${reportView === 'losses' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                >
                    <ArrowDownRight size={20} /> تقرير الخسائر والتوالف
                </button>
                <button
                    onClick={() => setReportView('debt')}
                    className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm ${reportView === 'debt' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                >
                    <CreditCard size={20} /> تقرير الديون والتحصيل
                </button>
            </div>

            {/* STICKY FILTER BAR */}
            <div className="sticky top-4 z-40 bg-white/80 backdrop-blur-md border border-gray-200 p-4 rounded-2xl shadow-xl flex flex-col lg:flex-row gap-4 items-center justify-between print:hidden">
                {reportView === 'performance' ? (
                    <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1 w-full lg:w-auto overflow-x-auto">
                        {[
                            { id: 'daily', label: 'اليوم' },
                            { id: 'weekly', label: 'هذا الأسبوع' },
                            { id: 'monthly', label: 'هذا الشهر' },
                            { id: 'yearly', label: 'هذه السنة' },
                            { id: 'custom', label: 'مخصص' }
                        ].map(p => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id as any)}
                                className={`px-6 py-2 rounded-lg text-sm font-black transition-all whitespace-nowrap ${period === p.id ? 'bg-white text-blue-600 shadow-md transform scale-105' : 'text-gray-500 hover:bg-white/50'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                ) : reportView === 'debt' ? (
                    <div className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <CreditCard className="text-indigo-600" /> تقرير حالة الائتمان والديون الجارية
                    </div>
                ) : (
                    <div className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-red-500" /> تقرير المنتجات منتهية / قريبة الانتهاء
                    </div>
                )}

                {period === 'custom' && reportView === 'performance' && (
                    <div className="flex gap-2 items-center animate-in slide-in-from-right duration-300">
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-white border border-gray-200 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                        <span className="text-gray-400 font-bold">إلى</span>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-white border border-gray-200 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                        <button onClick={fetchReports} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"><RefreshCw size={20} /></button>
                    </div>
                )}

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <button onClick={reportView === 'performance' ? fetchReports : fetchExpiryStats} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-gray-800 transition-all shadow-lg">
                        <RefreshCw size={16} className={(loading || loadingExpiry) ? 'animate-spin' : ''} /> تحديث البيانات
                    </button>
                    <button onClick={exportToExcel} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-black text-xs hover:bg-gray-50 transition-all shadow-sm">
                        <Download size={16} className="text-blue-600" /> تصدير Excel
                    </button>
                    <button onClick={() => window.print()} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-gray-800 transition-all shadow-lg">
                        <Printer size={16} /> طباعة التقرير
                    </button>
                </div>
            </div>

            {reportView === 'performance' ? (
                <>
                    {/* ... (Performance Report remains exactly the same as before) ... */}
                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-[100px] -mr-8 -mt-8 transition-all group-hover:scale-110"></div>
                            <div className="relative z-10 flex flex-col gap-1">
                                <ShoppingBag className="text-green-600 mb-2" size={24} />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">إجمالي المبيعات</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-gray-900 font-sans tracking-tight" dir="ltr">{(data?.totalSales || 0).toLocaleString()}</span>
                                    <span className="text-[10px] font-black text-gray-400">دج</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-blue-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[100px] -mr-8 -mt-8 transition-all group-hover:scale-110"></div>
                            <div className="relative z-10 flex flex-col gap-1">
                                <TrendingUp className="text-blue-600 mb-2" size={24} />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الربح الإجمالي (WAC)</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-blue-700 font-sans tracking-tight" dir="ltr">{((data as any)?.grossProfit || 0).toLocaleString()}</span>
                                    <span className="text-[10px] font-black text-gray-400">دج</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-red-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-[100px] -mr-8 -mt-8 transition-all group-hover:scale-110"></div>
                            <div className="relative z-10 flex flex-col gap-1">
                                <ArrowDownRight className="text-red-600 mb-2" size={24} />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الخسائر والتوالف</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-red-700 font-sans tracking-tight" dir="ltr">{((data as any)?.totalLoss || 0).toLocaleString()}</span>
                                    <span className="text-[10px] font-black text-gray-400">دج</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-purple-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-[100px] -mr-8 -mt-8 transition-all group-hover:scale-110"></div>
                            <div className="relative z-10 flex flex-col gap-1">
                                <TrendingUp className="text-purple-600 mb-2" size={24} />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الأرباح الصافية</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-purple-700 font-sans tracking-tight" dir="ltr">{(data?.netProfit || 0).toLocaleString()}</span>
                                    <span className="text-[10px] font-black text-gray-400">دج</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-[100px] -mr-8 -mt-8 transition-all group-hover:scale-110"></div>
                            <div className="relative z-10 flex flex-col gap-1">
                                <TrendingUp className="text-amber-600 mb-2" size={24} />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">هامش الربح %</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-gray-900 font-sans tracking-tight" dir="ltr">{(data?.profitMargin || 0).toFixed(1)}</span>
                                    <span className="text-xl font-black text-amber-600">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CHARTS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900">المبيعات والمشتريات</h3>
                                </div>
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short' })} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }} cursor={{ fill: '#f8fafc' }} labelFormatter={(val) => `التاريخ: ${formatDate(val)}`} />
                                        <Bar dataKey="sales" name="المبيعات" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="purchases" name="المشتريات" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm flex flex-col">
                            <div className="mb-8">
                                <h3 className="text-lg font-black text-gray-900">الأرباح التراكمية</h3>
                            </div>
                            <div className="h-[350px] w-full mt-auto">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data?.chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" hide />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                                        <Area type="monotone" dataKey="profit" name="الربح" stroke="#a855f7" strokeWidth={4} fillOpacity={1} fill="url(#colorProfit)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* PRODUCT PERFORMANCE TABLE */}
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <Box size={20} className="text-blue-600" /> أداء المنتجات
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">المنتج</th>
                                        <th className="px-6 py-4 text-center">الكمية المباعة</th>
                                        <th className="px-6 py-4">الإيراد (دج)</th>
                                        <th className="px-6 py-4">التكلفة (دج)</th>
                                        <th className="px-6 py-4">الربح (دج)</th>
                                        <th className="px-6 py-4 text-center">هامش الربح%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(data?.productStats || []).map((p, i) => {
                                        const margin = (p.profit / p.revenue) * 100;
                                        return (
                                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-black text-gray-900">{p.name}</td>
                                                <td className="px-6 py-4 text-center font-bold font-sans" dir="ltr">{p.sold}</td>
                                                <td className="px-6 py-4 font-bold font-sans" dir="ltr">{(p.revenue || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-gray-500 font-sans" dir="ltr">{(p.cost || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 font-black text-purple-600 font-sans" dir="ltr">{(p.profit || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${margin >= 20 ? 'bg-green-50 text-green-700 border-green-200' :
                                                        margin >= 10 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            'bg-red-50 text-red-700 border-red-200'
                                                        }`}>
                                                        %{margin.toFixed(1)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : reportView === 'expiry' ? (
                /* EXPIRY REPORT TAB */
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Top Expiry Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-3xl border border-red-200 shadow-sm flex items-center justify-between group h-32">
                            <div>
                                <h3 className="text-gray-500 font-bold mb-1">الخسارة المحتملة (المنتجات المنتهية)</h3>
                                <div className="text-3xl font-black text-red-600 font-sans">
                                    {((expiryStats?.expiredProducts || []).reduce((sum: number, p: any) => sum + (p.quantity * (p.purchasePrice || 0)), 0)).toLocaleString()} <span className="text-sm">دج</span>
                                </div>
                            </div>
                            <div className="p-4 bg-red-50 rounded-2xl text-red-500 group-hover:scale-110 transition-transform">
                                <AlertCircle size={36} />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-sm flex items-center justify-between group h-32">
                            <div>
                                <h3 className="text-gray-500 font-bold mb-1">تنبيهات الانتهاء قريباً</h3>
                                <div className="text-3xl font-black text-amber-600 font-sans">
                                    {expiryStats?.expiringSoon || 0} <span className="text-sm font-tajawal">منتجات</span>
                                </div>
                                <p className="text-xs text-amber-800 font-bold mt-2">منها {expiryStats?.expiringThisWeek || 0} تنتهي خلال أسبوع</p>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform">
                                <AlertTriangle size={36} />
                            </div>
                        </div>
                    </div>

                    {/* Expiry Table */}
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <FileText size={20} className="text-red-500" /> قائمة المنتجات منتهية / قريبة الانتهاء
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">الكود</th>
                                        <th className="px-6 py-4">المنتج</th>
                                        <th className="px-6 py-4">المورد</th>
                                        <th className="px-6 py-4 text-center">الكمية الموجودة</th>
                                        <th className="px-6 py-4 text-center">تاريخ الانتهاء</th>
                                        <th className="px-6 py-4 text-center">الأيام المتبقية</th>
                                        <th className="px-6 py-4 text-center">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loadingExpiry ? (
                                        <tr><td colSpan={7} className="text-center py-10 font-bold text-gray-400">جاري تحميل البيانات...</td></tr>
                                    ) : (!expiryStats?.expiredProducts?.length && !expiryStats?.expiringSoonProducts?.length) ? (
                                        <tr><td colSpan={7} className="text-center py-16 text-emerald-600 font-bold text-lg"><CheckCircle className="inline-block mr-2" /> لا توجد منتجات منتهية أو قريبة الانتهاء.</td></tr>
                                    ) : (
                                        [...(expiryStats.expiredProducts || []), ...(expiryStats.expiringSoonProducts || [])].map((p: any, i: number) => (
                                            <tr key={i} className={`hover:bg-gray-50/50 transition-colors ${p.daysRemaining < 0 ? 'bg-red-50/20' : 'bg-amber-50/20'}`}>
                                                <td className="px-6 py-4 font-mono text-gray-500 text-xs">{p.code || '—'}</td>
                                                <td className="px-6 py-4 font-black border-r-2 border-transparent">{p.name}</td>
                                                <td className="px-6 py-4 text-gray-600 font-bold text-xs">{p.supplierName}</td>
                                                <td className="px-6 py-4 text-center font-bold font-sans" dir="ltr">{p.quantity}</td>
                                                <td className="px-6 py-4 text-center font-bold font-sans" dir="ltr">{formatDate(p.expiryDate)}</td>
                                                <td className="px-6 py-4 text-center font-bold font-sans" dir="ltr">{p.daysRemaining < 0 ? 0 : p.daysRemaining} يوم</td>
                                                <td className="px-6 py-4 text-center">
                                                    {p.daysRemaining < 0 ? (
                                                        <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-lg text-[10px] font-black">🔴 منتهية الصلاحية</span>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black">🟡 تنتهي قريباً</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : reportView === 'debt' ? (
                /* DEBT REPORT TAB */
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-indigo-200 shadow-sm flex items-center justify-between group">
                            <div>
                                <h3 className="text-gray-500 font-bold mb-1">إجمالي الديون المعلقة</h3>
                                <div className="text-3xl font-black text-indigo-600 font-sans">
                                    {((data as any)?.totalDebt || 0).toLocaleString()} <span className="text-sm">دج</span>
                                </div>
                            </div>
                            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-500 group-hover:scale-110 transition-transform">
                                <ArrowDownLeft size={36} />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-green-200 shadow-sm flex items-center justify-between group">
                            <div>
                                <h3 className="text-gray-500 font-bold mb-1">نسبة التحصيل</h3>
                                <div className="text-3xl font-black text-green-600 font-sans">
                                    {((data as any)?.collectionRate || 0).toFixed(1)} <span className="text-sm">%</span>
                                </div>
                            </div>
                            <div className="p-4 bg-green-50 rounded-2xl text-green-500 group-hover:scale-110 transition-transform">
                                <CheckCircle size={36} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <Users size={20} className="text-indigo-600" /> قائمة المقاولين المدينين
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">المقاول</th>
                                        <th className="px-6 py-4">الهاتف</th>
                                        <th className="px-6 py-4 text-center">عدد الفواتير المفتوحة</th>
                                        <th className="px-6 py-4 text-center">الحد الائتماني</th>
                                        <th className="px-6 py-4 text-left">الدين الحالي (دج)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(data as any)?.debtors?.length > 0 ? (data as any).debtors.map((d: any, i: number) => (
                                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-black text-gray-900">{d.name}</td>
                                            <td className="px-6 py-4 font-sans" dir="ltr">{d.phone || '---'}</td>
                                            <td className="px-6 py-4 text-center font-bold">{d._count?.invoices || 0}</td>
                                            <td className="px-6 py-4 text-center font-sans">{(d.creditLimit || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-left font-black text-red-600 font-sans" dir="ltr">{(d.balanceDue || 0).toLocaleString()}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-bold">لا يوجد مديونيات حالياً</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                /* LOSSES REPORT TAB */
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-red-200 shadow-sm flex items-center justify-between group">
                            <div>
                                <h3 className="text-gray-500 font-bold mb-1">إجمالي الخسائر (الفترة المختارة)</h3>
                                <div className="text-3xl font-black text-red-600 font-sans">
                                    {((data as any)?.totalLoss || 0).toLocaleString()} <span className="text-sm">دج</span>
                                </div>
                            </div>
                            <div className="p-4 bg-red-50 rounded-2xl text-red-500 group-hover:scale-110 transition-transform">
                                <ArrowDownRight size={36} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <ArrowDownRight size={20} className="text-red-600" /> سجل الخسائر والتوالف المالي
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">التاريخ</th>
                                        <th className="px-6 py-4">المنتج</th>
                                        <th className="px-6 py-4">السبب</th>
                                        <th className="px-6 py-4">النوع</th>
                                        <th className="px-6 py-4 text-center">الكمية</th>
                                        <th className="px-6 py-4 text-left">الخسارة (دج)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(data as any)?.damages?.length > 0 ? (data as any).damages.map((d: any, i: number) => (
                                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(d.createdAt)}</td>
                                            <td className="px-6 py-4 font-black text-gray-900">{d.product?.name || 'منتج محذوف'}</td>
                                            <td className="px-6 py-4 text-gray-600">{d.reason}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${d.damageType === 'EXPIRED' ? 'bg-amber-100 text-amber-700' :
                                                    d.damageType === 'DAMAGED' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {d.damageType === 'EXPIRED' ? 'صلاحية' : d.damageType === 'DAMAGED' ? 'تلف' : 'فقدان'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold font-sans">{d.quantity}</td>
                                            <td className="px-6 py-4 text-left font-black text-red-600 font-sans" dir="ltr">{(d.totalLoss || 0).toLocaleString()}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-gray-400 font-bold italic">لا توجد خسائر مسجلة في هذه الفترة</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body { background: white !important; }
                  .p-4, .md\\:p-8 { padding: 0 !important; }
                  .bg-gray-50 { background: white !important; }
                  .shadow-sm, .shadow-xl, .shadow-2xl { box-shadow: none !important; }
                  .border { border-color: #eee !important; }
                  .sticky { position: static !important; }
                  aside { display: none !important; }
                  @page { size: landscape; margin: 10mm; }
                }
                `
            }} />
        </div>
    );
}
