'use client';

import React, { useEffect, useState } from 'react';
import { Package, TrendingUp, AlertTriangle, Users, Trash2, CreditCard, ArrowDownLeft, Clock, Printer, Download, ChevronDown, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

    const fetchData = () => {
        setLoading(true);
        const query = new URLSearchParams({ type: period });
        if (period === 'custom' && from && to) {
            query.append('from', from);
            query.append('to', to);
        }

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
        if (period !== 'custom') fetchData();
    }, [period]);

    const handlePrint = () => {
        window.print();
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
        if (period === 'daily') return 'اليوم';
        if (period === 'weekly') return 'الأسبوع';
        if (period === 'monthly') return 'الشهر';
        if (period === 'yearly') return 'السنة';
        return 'الفترة';
    };

    return (
        <div className="space-y-6 font-tajawal">
            {/* STICKY FILTER BAR */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border border-slate-200/50 p-4 rounded-2xl shadow-md flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex bg-slate-100/60 p-1 rounded-xl gap-1 w-full lg:w-auto overflow-x-auto">
                    {[
                        { id: 'daily', label: 'اليوم' },
                        { id: 'weekly', label: 'أسبوع' },
                        { id: 'monthly', label: 'شهر' },
                        { id: 'yearly', label: 'سنة' },
                        { id: 'custom', label: 'مخصص' }
                    ].map(p => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id as any)}
                            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${period === p.id ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {period === 'custom' && (
                    <div className="flex gap-2 items-center animate-in slide-in-from-right duration-300">
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none" />
                        <span className="text-slate-400 font-bold text-xs">إلى</span>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none" />
                        <button onClick={fetchData} className="bg-gradient-to-r from-sky-500 to-teal-500 text-white p-2 rounded-lg hover:shadow-lg transition-all shadow-md"><TrendingUp size={16} /></button>
                    </div>
                )}

                {loading && (
                    <div className="flex items-center gap-2 text-sky-600 animate-pulse">
                        <div className="w-2 h-2 bg-sky-600 rounded-full animate-bounce"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">جاري التحديث...</span>
                    </div>
                )}

                <div className="flex items-center gap-2 no-print">
                    <div className="relative">
                        <button 
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 rounded-lg hover:shadow-md transition-all text-xs font-bold border border-teal-200/50 shadow-sm"
                        >
                            <Download size={16} />
                            تصدير
                            <ChevronDown size={14} className={`transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isExportDropdownOpen && (
                            <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in duration-200 overflow-hidden">
                                <button 
                                    onClick={handleExportExcel}
                                    className="w-full text-right px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100"
                                >
                                    <FileText size={16} className="text-teal-600" />
                                    تصدير Excel
                                </button>
                                <button 
                                    onClick={handlePrint}
                                    className="w-full text-right px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                                >
                                    <FileText size={16} className="text-sky-600" />
                                    طباعة / PDF
                                </button>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100/60 text-slate-700 rounded-lg hover:bg-slate-200/60 transition-all text-xs font-bold border border-slate-200/50 shadow-sm"
                    >
                        <Printer size={16} />
                        طباعة
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4 md:gap-6">
                {/* Products */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-lg hover:border-slate-300/50 transition-all">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-sky-500/8 rounded-full group-hover:scale-125 transition-transform"></div>
                    <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 p-3.5 rounded-xl text-sky-600 relative z-10 border border-sky-200/30">
                        <Package size={24} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block mb-1">المنتجات</span>
                        <h3 className="text-2xl font-bold text-slate-900 font-sans">{stats?.totalProducts || 0}</h3>
                    </div>
                </div>

                {/* Sales Net Today */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-lg hover:border-slate-300/50 transition-all">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/8 rounded-full group-hover:scale-125 transition-transform"></div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-3.5 rounded-xl text-emerald-600 relative z-10 border border-emerald-200/30">
                        <TrendingUp size={24} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">مبيعات {getPeriodLabel()}</span>
                        <h3 className="text-xl font-bold text-slate-900 font-sans">{stats?.todayNet?.toLocaleString() || 0} <span className="text-[10px] text-slate-500">دج</span></h3>
                    </div>
                </div>

                {/* Collections Today */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-lg hover:border-slate-300/50 transition-all">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-teal-500/8 rounded-full group-hover:scale-125 transition-transform"></div>
                    <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 p-3.5 rounded-xl text-teal-600 relative z-10 border border-teal-200/30">
                        <CreditCard size={24} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider block mb-1">تحصيلات {getPeriodLabel()}</span>
                        <h3 className="text-xl font-bold text-slate-900 font-sans">{stats?.todayCustomerCollections?.toLocaleString() || 0} <span className="text-[10px] text-slate-500">دج</span></h3>
                    </div>
                </div>

                {/* Supplier Payments Today */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-lg hover:border-slate-300/50 transition-all">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/8 rounded-full group-hover:scale-125 transition-transform"></div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-3.5 rounded-xl text-red-600 relative z-10 border border-red-200/30">
                        <ArrowDownLeft size={24} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block mb-1">مدفوعات {getPeriodLabel()}</span>
                        <h3 className="text-xl font-bold text-slate-900 font-sans">{stats?.todaySupplierPayments?.toLocaleString() || 0} <span className="text-[10px] text-slate-500">دج</span></h3>
                    </div>
                </div>

                {/* Net Liquidity (Dark Card) */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-xl border border-slate-700/50 shadow-lg flex items-center gap-4 relative overflow-hidden group hover:shadow-xl hover:scale-105 transition-all">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-sky-500/15 rounded-full"></div>
                    <div className="bg-gradient-to-br from-sky-500 to-teal-500 p-3.5 rounded-xl text-white relative z-10 shadow-lg shadow-sky-500/30 border border-sky-400/30">
                        <TrendingUp size={24} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[11px] font-bold text-sky-300 uppercase tracking-widest block mb-1">السيولة الفعلية</span>
                        <h3 className="text-lg font-bold text-white font-sans truncate">
                            {((stats?.todayNet || 0) + (stats?.todayCustomerCollections || 0) - (stats?.todaySupplierPayments || 0)).toLocaleString()} <span className="text-[10px] text-slate-400">دج</span>
                        </h3>
                    </div>
                </div>

                {/* Low Stock */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-lg hover:border-slate-300/50 transition-all">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/8 rounded-full group-hover:scale-125 transition-transform"></div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-3.5 rounded-xl text-orange-600 relative z-10 border border-orange-200/30">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider block mb-1">مخزون منخفض</span>
                        <h3 className="text-2xl font-bold text-slate-900 font-sans">{stats?.lowStockCount || 0}</h3>
                    </div>
                </div>

                {/* Total Debt */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-lg hover:border-slate-300/50 transition-all">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/8 rounded-full group-hover:scale-125 transition-transform"></div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-3.5 rounded-xl text-amber-600 relative z-10 border border-amber-200/30">
                        <ArrowDownLeft size={24} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-1">إجمالي الديون</span>
                        <h3 className="text-xl font-bold text-slate-900 font-sans">{(stats?.totalDebt || 0).toLocaleString()} <span className="text-[10px] text-slate-500">دج</span></h3>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Line Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/50 shadow-sm hover:shadow-lg transition-shadow">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">المبيعات والمشتريات — {getPeriodLabel()}</h3>
                    <div className="h-80 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
                                <Tooltip
                                    formatter={(value: any) => [`${value.toLocaleString()} دج`]}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', textAlign: 'right', fontFamily: 'inherit', backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Line type="monotone" dataKey="sales" name="المبيعات" stroke="#06B6D4" strokeWidth={3} dot={false} activeDot={{ r: 7, fill: '#06B6D4' }} />
                                <Line type="monotone" dataKey="purchases" name="المشتريات" stroke="#14B8A6" strokeWidth={3} dot={false} activeDot={{ r: 7, fill: '#14B8A6' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Area Chart for Profit */}
                <div className="bg-white p-6 rounded-xl border border-slate-200/50 shadow-sm hover:shadow-lg transition-shadow flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">الأرباح التراكمية — {getPeriodLabel()}</h3>
                    <div className="flex-1 w-full" dir="ltr">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="date" hide />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} />
                                    <Tooltip 
                                        formatter={(value: any) => [`${value.toLocaleString()} دج`, 'الربح']}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', textAlign: 'right', backgroundColor: '#f8fafc' }} 
                                    />
                                    <Area type="monotone" dataKey="profit" name="الربح" stroke="#0EA5E9" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">لا توجد بيانات أداء بعد</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product Performance Table */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/50 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
                    <div className="p-6 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-100/50">
                        <h3 className="text-lg font-bold text-slate-900">أداء المنتجات (الأكثر ربحاً)</h3>
                        <TrendingUp className="text-sky-600" size={22} />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50/60 border-b border-slate-200/50">
                                <tr>
                                    <th className="px-6 py-3 text-sm font-semibold text-slate-700">المنتج</th>
                                    <th className="px-6 py-3 text-sm font-semibold text-slate-700 text-center">الكمية</th>
                                    <th className="px-6 py-3 text-sm font-semibold text-slate-700 text-left">الإيراد</th>
                                    <th className="px-6 py-3 text-sm font-semibold text-slate-700 text-left">الربح الصافي</th>
                                    <th className="px-6 py-3 text-sm font-semibold text-slate-700 text-center">الهامش</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/30">
                                {stats?.productPerformance?.length > 0 ? stats.productPerformance.map((p: any, idx: number) => {
                                    const margin = (p.profit / p.revenue) * 100;
                                    return (
                                        <tr key={idx} className="hover:bg-sky-50/40 transition-colors">
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{p.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600 text-center font-sans">{p.sold}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900 text-left font-sans" dir="ltr">{p.revenue.toLocaleString()} دج</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-teal-600 text-left font-sans" dir="ltr">{p.profit.toLocaleString()} دج</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 text-[11px] font-bold rounded-full border ${margin >= 15 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' : 'bg-amber-50 text-amber-700 border-amber-200/50'}`}>
                                                    %{margin.toFixed(1)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">لا توجد بيانات أداء متاحة</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Alerts Section */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50/30 p-6 rounded-xl border border-red-200/30 shadow-sm h-full max-h-[400px] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
                            <AlertTriangle size={22} className="text-red-600" />
                            التنبيهات
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {stats?.expiredList?.map((product: any, idx: number) => (
                            <div key={`expired-${idx}`} className="p-3 bg-red-50/80 border border-red-300/40 rounded-lg flex items-center gap-3 shadow-sm">
                                <div className="text-red-600 flex-shrink-0"><AlertTriangle size={18} /></div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-red-800 leading-tight">منتهي الصلاحية: {product.name}</p>
                                </div>
                            </div>
                        ))}

                        {stats?.lowStockProducts?.map((product: any, idx: number) => (
                            <div key={`low-stock-${idx}`} className="p-3 bg-white/60 border border-red-200/30 rounded-lg flex items-center gap-3 shadow-sm">
                                <div className="text-red-500 flex-shrink-0"><AlertTriangle size={18} /></div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-900 leading-tight">مخزون منخفض: {product.name} — {product.quantity} {product.unit}</p>
                                </div>
                            </div>
                        ))}

                        {stats?.creditAlerts?.map((alert: any, idx: number) => (
                            <div key={`credit-${idx}`} className="p-3 bg-white/60 border border-amber-200/30 rounded-lg flex items-center gap-3 shadow-sm">
                                <div className="text-amber-500 flex-shrink-0"><AlertTriangle size={18} /></div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-900 leading-tight">العميل {alert.name} تجاوز الائتمان</p>
                                </div>
                            </div>
                        ))}

                        {stats?.overdueInvoices?.map((inv: any, idx: number) => {
                            const dateStr = new Date(inv.dueDate).toLocaleDateString('ar-DZ');
                            return (
                                <div key={`overdue-${idx}`} className="p-3 bg-red-50/80 border border-red-300/40 rounded-lg flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="text-red-600 flex-shrink-0"><Clock size={18} /></div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-red-800 leading-tight">فاتورة متأخرة: <span className="font-sans">{inv.invoiceNumber}</span></p>
                                            <p className="text-xs text-red-700 font-medium">العميل: {inv.customerName}</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-slate-900 font-sans" dir="ltr">{inv.remaining.toLocaleString()} دج</p>
                                        <p className="text-[10px] font-bold text-red-600 mt-1">{dateStr}</p>
                                    </div>
                                </div>
                            );
                        })}

                        {(!stats?.lowStockProducts?.length && !stats?.creditAlerts?.length && !stats?.expiredList?.length && !stats?.overdueInvoices?.length) && (
                            <div className="h-40 flex flex-col items-center justify-center text-center text-slate-500">
                                <Package size={32} className="text-slate-300 mb-2" />
                                <p className="text-sm font-semibold">كل شيء على ما يرام.</p>
                                <p className="text-xs mt-1">لا توجد تنبيهات حالياً.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
