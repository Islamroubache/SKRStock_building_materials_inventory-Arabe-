'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { printDocument } from '@/lib/print-helper';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { LayoutGrid, Package, TrendingUp, AlertTriangle, Users, Trash2, CreditCard, ArrowDownLeft, Clock, Printer, Download, ChevronDown, FileText, RotateCcw, DollarSign, Activity, Truck, AlertCircle, ArrowUpRight, Bell, CheckCircle } from 'lucide-react';
import { format, startOfToday, endOfToday } from 'date-fns';
import DateRangePicker from '@/components/DateRangePicker';
import * as XLSX from 'xlsx';

export default function Dashboard() {
    return (
        <Suspense fallback={<div className="p-10 text-center font-black text-gray-400">جاري التحميل...</div>}>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [from, setFrom] = useState(format(startOfToday(), 'yyyy-MM-dd'));
    const [to, setTo] = useState(format(endOfToday(), 'yyyy-MM-dd'));
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'operations' | 'finance' | 'notifications'>('operations');

    // Sync state with URL
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'notifications') setActiveTab('notifications');
        else if (tab === 'finance') setActiveTab('finance');
        else if (tab === 'operations') setActiveTab('operations');

        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');
        if (fromParam) setFrom(fromParam);
        if (toParam) setTo(toParam);
    }, [searchParams]);

    const updateUrl = (updates: Record<string, string>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value) params.set(key, value);
            else params.delete(key);
        });
        router.replace(`/dashboard?${params.toString()}`, { scroll: false });
    };

    const handleTabChange = (tab: 'operations' | 'finance' | 'notifications') => {
        const today = format(startOfToday(), 'yyyy-MM-dd');
        setActiveTab(tab);
        setFrom(today);
        setTo(today);
        updateUrl({ tab, from: today, to: today });
    };

    const handleDateChange = (newFrom: string, newTo: string) => {
        setFrom(newFrom);
        setTo(newTo);
        updateUrl({ from: newFrom, to: newTo });
    };

    const fetchData = () => {
        setLoading(true);
        const query = new URLSearchParams({ 
            from: from || format(startOfToday(), 'yyyy-MM-dd'), 
            to: to || format(endOfToday(), 'yyyy-MM-dd') 
        });

        Promise.all([
            fetch(`/api/dashboard/stats?${query.toString()}`).then(res => res.json()),
            fetch(`/api/dashboard/sales-chart?${query.toString()}`).then(res => res.json())
        ]).then(([statsData, chartResData]) => {
            setStats(statsData);
            setChartData(Array.isArray(chartResData) ? chartResData : []);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    };

    useEffect(() => {
        fetch('/api/batches/expiry-check', { method: 'POST' }).catch(console.error);
    }, []);

    useEffect(() => {
        fetchData();
    }, [from, to]);

    const handlePrint = () => {
        printDocument();
    };

    const handleExportExcel = () => {
        if (!stats) return;
        
        // Main Stats
        const summaryData = [
            { 'المقياس': 'مبيعات ' + getPeriodLabel(), 'القيمة': stats.todayNet || 0 },
            { 'المقياس': 'تحصيلات ' + getPeriodLabel(), 'القيمة': stats.todayCustomerCollections || 0 },
            { 'المقياس': 'مدفوعات ' + getPeriodLabel(), 'القيمة': stats.todaySupplierPayments || 0 },
            { 'المقياس': 'إجمالي الديون', 'القيمة': stats.totalDebt || 0 },
            { 'المقياس': 'منتجات منخفضة المخزون', 'القيمة': stats.lowStockCount || 0 },
            { 'المقياس': 'منتجات منتهية الصلاحية', 'القيمة': stats.expiredCount || 0 },
        ];

        // Performance Data
        const performanceData = (stats.productPerformance || []).map((p: any) => ({
            'المنتج': p.name,
            'الكمية المباعة': p.sold,
            'الإيرادات': p.revenue,
            'الأرباح': p.profit
        }));

        const wb = XLSX.utils.book_new();
        
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص لوحة التحكم");

        if (performanceData.length > 0) {
            const wsPerformance = XLSX.utils.json_to_sheet(performanceData);
            XLSX.utils.book_append_sheet(wb, wsPerformance, "أداء المنتجات");
        }

        XLSX.writeFile(wb, `Dashboard_Report_${getPeriodLabel()}_${new Date().toISOString().split('T')[0]}.xlsx`);
        setIsExportDropdownOpen(false);
    };

    const COLORS = ['#20b878', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    const getPeriodLabel = () => {
        if (!from && !to) return 'كل الوقت';
        if (from === to) return 'اليوم';
        return `من ${from} إلى ${to}`;
    };

    return (
        <div className="flex flex-col gap-6 font-tajawal p-4 md:p-6">
            <PageHeader 
                title="لوحة التحكم" 
                subtitle="نظرة عامة على أداء المتجر والمخزون" 
                Icon={LayoutGrid} 
            />

            {/* Subpages Tabs */}
            <div className="flex items-center gap-6 no-print mb-2 pb-1">
                <button
                    onClick={() => handleTabChange('operations')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 ${activeTab === 'operations' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    إجمالي
                </button>
                <button
                    onClick={() => handleTabChange('finance')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 ${activeTab === 'finance' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    الحسابات والمالية
                </button>
                <button
                    onClick={() => handleTabChange('notifications')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${activeTab === 'notifications' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    التنبيهات
                    {(stats?.expiredCount > 0 || stats?.lowStockCount > 0 || stats?.overdueInvoicesCount > 0) && (
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                </button>
            </div>

            {/* STICKY FILTER BAR (Only for Finance Tab) */}
            {activeTab === 'finance' && (
                <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border border-gray-100 p-3 rounded-2xl shadow-sm flex items-center justify-between mb-4 px-6">
                    {/* Left: Date Picker */}
                    <div className="w-1/3 flex justify-start">
                        <DateRangePicker 
                            startDate={from}
                            endDate={to}
                            onChange={handleDateChange}
                            theme="violet"
                        />
                    </div>

                    {/* Center: Period Label */}
                    <div className="w-1/3 flex flex-col items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الفترة المحددة</span>
                        <span className="text-sm font-black text-[#8b5cf6]">{getPeriodLabel()}</span>
                    </div>

                    {/* Right: Loading / Placeholder to balance */}
                    <div className="w-1/3 flex justify-end">
                        {loading && (
                            <div className="flex items-center gap-2 text-[#8b5cf6] animate-pulse">
                                <div className="w-2 h-2 bg-[#8b5cf6] rounded-full animate-bounce"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">جاري التحديث...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'operations' ? (
                <div className="animate-in fade-in duration-500">
                    {/* Unified Operations Metrics Bar */}
                    <div className="bg-white/80 backdrop-blur-md border border-gray-100 p-6 rounded-[2.5rem] shadow-sm mb-8 flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4 px-4 py-2 bg-blue-50/40 rounded-2xl border border-blue-100/50 flex-1 min-w-[160px]">
                            <div className="bg-white p-2.5 rounded-xl text-blue-600 shadow-sm"><Package size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-blue-500 uppercase block leading-none mb-1">إجمالي المنتجات</span>
                                <h3 className="text-lg font-black text-gray-900 font-sans">{stats?.totalProducts || 0}</h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 px-4 py-2 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 flex-1 min-w-[160px]">
                            <div className="bg-white p-2.5 rounded-xl text-indigo-600 shadow-sm"><Users size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-indigo-500 uppercase block leading-none mb-1">إجمالي العملاء</span>
                                <h3 className="text-lg font-black text-gray-900 font-sans">{stats?.totalCustomers || 0}</h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 px-4 py-2 bg-violet-50/40 rounded-2xl border border-violet-100/50 flex-1 min-w-[160px]">
                            <div className="bg-white p-2.5 rounded-xl text-violet-600 shadow-sm"><Truck size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-violet-500 uppercase block leading-none mb-1">إجمالي الموردين</span>
                                <h3 className="text-lg font-black text-gray-900 font-sans">{stats?.totalSuppliers || 0}</h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 px-4 py-2 bg-gray-900 rounded-2xl border border-gray-800 shadow-xl flex-1 min-w-[180px]">
                            <div className="bg-white/10 p-2.5 rounded-xl text-white shadow-sm"><DollarSign size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-amber-400 uppercase block leading-none mb-1">قيمة المخزون</span>
                                <h3 className="text-lg font-black text-white font-sans">{stats?.totalInventoryValue?.toLocaleString() || 0} <span className="text-[10px] text-gray-400">دج</span></h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 px-4 py-2 bg-rose-50/40 rounded-2xl border border-rose-100/50 flex-1 min-w-[180px]">
                            <div className="bg-white p-2.5 rounded-xl text-rose-600 shadow-sm"><ArrowDownLeft size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-rose-500 uppercase block leading-none mb-1">إجمالي الديون</span>
                                <h3 className="text-lg font-black text-gray-900 font-sans">{stats?.totalDebt?.toLocaleString() || 0} <span className="text-[10px] text-gray-400">دج</span></h3>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        {/* Product Performance Table stays in Operations */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white/50">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900">أداء المنتجات (الأكثر ربحاً)</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mt-1">تحليل حركة المنتجات وربحيتها بناءً على المبيعات</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead className="bg-gray-50/50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">المنتج</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-center">الكمية المباعة</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-left">الإيراد</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-left">الربح الصافي</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-center">الهامش الربحي</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 bg-white">
                                        {stats?.productPerformance?.length > 0 ? stats.productPerformance.map((p: any, idx: number) => {
                                            const margin = (p.profit / p.revenue) * 100;
                                            return (
                                                <tr key={idx} className="hover:bg-blue-50/40 transition-all group">
                                                    <td className="px-8 py-6">
                                                        <span className="font-black text-gray-900">{p.name}</span>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className="font-black text-gray-500 font-sans">{p.sold} قطعة</span>
                                                    </td>
                                                    <td className="px-8 py-6 font-black text-gray-900 text-left font-sans" dir="ltr">{p.revenue.toLocaleString()} دج</td>
                                                    <td className="px-8 py-6 font-black text-emerald-600 text-left font-sans" dir="ltr">{p.profit.toLocaleString()} دج</td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className={`px-4 py-1.5 text-[11px] font-black rounded-full border-2 ${margin >= 15 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                            %{margin.toFixed(1)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-20 text-center text-sm text-gray-400 font-bold opacity-60">
                                                    <Package size={48} className="mx-auto mb-4 opacity-20" />
                                                    لا توجد بيانات أداء متاحة حالياً
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'finance' ? (
                <div className="animate-in fade-in duration-500">
                    {/* Unified Finance Metrics Bar */}
                    <div className="bg-white/80 backdrop-blur-md border border-gray-100 p-6 rounded-[2.5rem] shadow-sm mb-8 flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4 px-4 py-2 bg-blue-50/40 rounded-2xl border border-blue-100/50 flex-1 min-w-[180px]">
                            <div className="bg-white p-2.5 rounded-xl text-blue-600 shadow-sm"><TrendingUp size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-blue-500 uppercase block leading-none mb-1">صافي المبيعات</span>
                                <h3 className="text-lg font-black text-gray-900 font-sans">{stats?.todayNet?.toLocaleString() || 0} <span className="text-[10px] text-gray-400">دج</span></h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 px-4 py-2 bg-emerald-50/40 rounded-2xl border border-emerald-100/50 flex-1 min-w-[180px]">
                            <div className="bg-white p-2.5 rounded-xl text-emerald-600 shadow-sm"><CreditCard size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-emerald-500 uppercase block leading-none mb-1">تحصيلات العملاء</span>
                                <h3 className="text-lg font-black text-gray-900 font-sans">{stats?.todayCustomerCollections?.toLocaleString() || 0} <span className="text-[10px] text-gray-400">دج</span></h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 px-4 py-2 bg-sky-50/40 rounded-2xl border border-sky-100/50 flex-1 min-w-[180px]">
                            <div className="bg-white p-2.5 rounded-xl text-sky-600 shadow-sm"><ArrowUpRight size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-sky-500 uppercase block leading-none mb-1">مدفوعات الموردين</span>
                                <h3 className="text-lg font-black text-gray-900 font-sans">{stats?.todaySupplierPayments?.toLocaleString() || 0} <span className="text-[10px] text-gray-400">دج</span></h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 px-4 py-2 bg-gray-900 rounded-2xl border border-gray-800 shadow-xl flex-1 min-w-[180px]">
                            <div className="bg-white/10 p-2.5 rounded-xl text-white shadow-sm"><Activity size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-amber-400 uppercase block leading-none mb-1">صافي السيولة</span>
                                <h3 className="text-lg font-black text-white font-sans">{((stats?.todayCustomerCollections || 0) - (stats?.todaySupplierPayments || 0)).toLocaleString()} <span className="text-[10px] text-gray-400">دج</span></h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 px-4 py-2 bg-rose-50/40 rounded-2xl border border-rose-100/50 flex-1 min-w-[180px]">
                            <div className="bg-white p-2.5 rounded-xl text-red-600 shadow-sm"><TrendingUp size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-red-500 uppercase block leading-none mb-1">إجمالي الخسائر</span>
                                <h3 className="text-lg font-black text-gray-900 font-sans">{(stats?.todayLosses || 0).toLocaleString()} <span className="text-[10px] text-gray-400">دج</span></h3>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section in Finance */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                        <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-100/50 transition-all duration-700"></div>
                            
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900">المبيعات والمشتريات</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">تحليل التدفقات المالية لـ {getPeriodLabel()}</p>
                                </div>
                                <div className="flex items-center gap-6 mt-4 md:mt-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm shadow-blue-200"></div>
                                        <span className="text-xs font-black text-gray-600">المبيعات</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-sm shadow-emerald-200"></div>
                                        <span className="text-xs font-black text-gray-600">المشتريات</span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-96 w-full" dir="ltr">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="date" 
                                            stroke="#94a3b8" 
                                            fontSize={11} 
                                            tickLine={false} 
                                            axisLine={false} 
                                            dy={10}
                                        />
                                        <YAxis 
                                            stroke="#94a3b8" 
                                            fontSize={11} 
                                            tickLine={false} 
                                            axisLine={false} 
                                            dx={-10}
                                            tickFormatter={(value) => `${value.toLocaleString()}`}
                                        />
                                        <Tooltip 
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white/90 backdrop-blur-md border border-gray-100 p-4 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-50 pb-2">{label}</p>
                                                            {payload.map((item: any, idx: number) => (
                                                                <div key={idx} className="flex items-center justify-between gap-8 mb-2 last:mb-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                                                        <span className="text-xs font-bold text-gray-600">{item.name}</span>
                                                                    </div>
                                                                    <span className="text-xs font-black text-gray-900 font-sans">{item.value.toLocaleString()} دج</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="sales" 
                                            name="المبيعات" 
                                            stroke="#3b82f6" 
                                            strokeWidth={4} 
                                            fillOpacity={1} 
                                            fill="url(#colorSales)" 
                                            animationDuration={1500}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="purchases" 
                                            name="المشتريات" 
                                            stroke="#10b981" 
                                            strokeWidth={4} 
                                            fillOpacity={1} 
                                            fill="url(#colorPurchases)" 
                                            animationDuration={2000}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ===== NOTIFICATIONS VIEW ===== */
                <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Unified Notifications Metrics Bar */}
                    <div className="bg-white/80 backdrop-blur-md border border-gray-100 p-6 rounded-[2.5rem] shadow-sm mb-2 flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4 px-4 py-2 bg-rose-50/40 rounded-2xl border border-rose-100/50 flex-1 min-w-[160px]">
                            <div className="bg-white p-2.5 rounded-xl text-red-600 shadow-sm"><AlertCircle size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-red-500 uppercase block leading-none mb-1">منتجات منتهية</span>
                                <h3 className="text-xl font-black text-gray-900 font-sans">{stats?.expiredCount || 0}</h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 px-4 py-2 bg-amber-50/40 rounded-2xl border border-amber-100/50 flex-1 min-w-[160px]">
                            <div className="bg-white p-2.5 rounded-xl text-amber-600 shadow-sm"><AlertTriangle size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-amber-600 uppercase block leading-none mb-1">مخزون منخفض</span>
                                <h3 className="text-xl font-black text-gray-900 font-sans">{stats?.lowStockCount || 0}</h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 px-4 py-2 bg-orange-50/40 rounded-2xl border border-orange-100/50 flex-1 min-w-[160px]">
                            <div className="bg-white p-2.5 rounded-xl text-orange-600 shadow-sm"><Clock size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-orange-500 uppercase block leading-none mb-1">تنتهي قريباً</span>
                                <h3 className="text-xl font-black text-gray-900 font-sans">{stats?.expiringSoonCount || 0}</h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 px-4 py-2 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 flex-1 min-w-[160px]">
                            <div className="bg-white p-2.5 rounded-xl text-indigo-600 shadow-sm"><FileText size={20} /></div>
                            <div>
                                <span className="text-[10px] font-black text-indigo-500 uppercase block leading-none mb-1">فواتير متأخرة</span>
                                <h3 className="text-xl font-black text-gray-900 font-sans">{stats?.overdueInvoicesCount || 0}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden min-h-[500px]">
                        {/* Notification Tables */}
                        <div className="space-y-12">
                            {/* Table 1: Expired Products */}
                            <div>
                                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                    المنتجات المنتهية (Expired)
                                </h4>
                                <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                                    <table className="w-full text-right">
                                        <thead className="bg-red-50/50">
                                            <tr>
                                                <th className="px-6 py-4 font-black text-red-700 text-[11px] uppercase tracking-wider">المنتج</th>
                                                <th className="px-6 py-4 font-black text-red-700 text-[11px] uppercase tracking-wider">الكود</th>
                                                <th className="px-6 py-4 font-black text-red-700 text-[11px] uppercase tracking-wider">الكمية</th>
                                                <th className="px-6 py-4 font-black text-red-700 text-[11px] uppercase tracking-wider">تاريخ الانتهاء</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {stats?.expiredList?.length > 0 ? stats.expiredList.map((product: any, idx: number) => (
                                                <tr 
                                                    key={`expired-${idx}`} 
                                                    onClick={() => router.push('/inventory?tab=batches&filter=EXPIRED')}
                                                    className="hover:bg-red-50/30 transition-all cursor-pointer"
                                                >
                                                    <td className="px-6 py-4 font-black text-gray-800">{product.name}</td>
                                                    <td className="px-6 py-4 font-black text-gray-500 font-sans">{product.code || '-'}</td>
                                                    <td className="px-6 py-4 font-black text-red-600 font-sans">{product.quantity}</td>
                                                    <td className="px-6 py-4 font-black text-gray-400 font-sans">{new Date(product.expiryDate).toLocaleDateString('ar-DZ')}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-300 text-xs font-bold">لا توجد منتجات منتهية حالياً</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Table 2: Low Stock */}
                            <div>
                                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                                    المخزون المنخفض (Low Stock)
                                </h4>
                                <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                                    <table className="w-full text-right">
                                        <thead className="bg-amber-50/50">
                                            <tr>
                                                <th className="px-6 py-4 font-black text-amber-700 text-[11px] uppercase tracking-wider">المنتج</th>
                                                <th className="px-6 py-4 font-black text-amber-700 text-[11px] uppercase tracking-wider text-left">الكمية المتبقية</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {stats?.lowStockProducts?.length > 0 ? stats.lowStockProducts.map((product: any, idx: number) => (
                                                <tr 
                                                    key={`low-${idx}`} 
                                                    onClick={() => router.push('/inventory?tab=overview&filter=BELOW_MIN')}
                                                    className="hover:bg-amber-50/30 transition-all cursor-pointer"
                                                >
                                                    <td className="px-6 py-4 font-black text-gray-800">{product.name}</td>
                                                    <td className="px-6 py-4 font-black text-amber-600 text-left font-sans">{product.quantity} {product.unit || 'قطعة'}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={2} className="px-6 py-10 text-center text-gray-300 text-xs font-bold">المخزون كافٍ حالياً</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Table 3: Overdue Invoices */}
                            <div>
                                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                    الفواتير المتأخرة (Overdue)
                                </h4>
                                <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                                    <table className="w-full text-right">
                                        <thead className="bg-indigo-50/50">
                                            <tr>
                                                <th className="px-6 py-4 font-black text-indigo-700 text-[11px] uppercase tracking-wider">الفاتورة</th>
                                                <th className="px-6 py-4 font-black text-indigo-700 text-[11px] uppercase tracking-wider">العميل</th>
                                                <th className="px-6 py-4 font-black text-indigo-700 text-[11px] uppercase tracking-wider text-left">المبلغ</th>
                                                <th className="px-6 py-4 font-black text-indigo-700 text-[11px] uppercase tracking-wider text-left">تاريخ الاستحقاق</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {stats?.overdueInvoices?.length > 0 ? stats.overdueInvoices.map((inv: any, idx: number) => (
                                                <tr 
                                                    key={`overdue-${idx}`} 
                                                    onClick={() => router.push('/customers?filter=OVERDUE')}
                                                    className="hover:bg-indigo-50/30 transition-all cursor-pointer"
                                                >
                                                    <td className="px-6 py-4 font-black text-gray-800 font-sans">{inv.invoiceNumber}</td>
                                                    <td className="px-6 py-4 font-black text-gray-600">{inv.customerName}</td>
                                                    <td className="px-6 py-4 font-black text-indigo-600 text-left font-sans">{inv.remaining.toLocaleString()} دج</td>
                                                    <td className="px-6 py-4 font-black text-red-500 text-left font-sans">{new Date(inv.dueDate).toLocaleDateString('ar-DZ')}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-300 text-xs font-bold">لا توجد فواتير متأخرة حالياً</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {(!stats?.lowStockProducts?.length && !stats?.creditAlerts?.length && !stats?.expiredList?.length && !stats?.overdueInvoices?.length) && (
                            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4">
                                    <CheckCircle size={40} />
                                </div>
                                <h4 className="text-xl font-black text-gray-900 mb-1">لا توجد تنبيهات!</h4>
                                <p className="text-sm font-bold">كل شيء يعمل بشكل مثالي في مخزنك.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
