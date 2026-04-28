'use client';

import React, { useEffect, useState } from 'react';
import { Package, TrendingUp, AlertTriangle, Users, Trash2, CreditCard, ArrowDownLeft, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Run expiry check once on mount
        fetch('/api/batches/expiry-check', { method: 'POST' }).catch(console.error);

        Promise.all([
            fetch('/api/dashboard/stats').then(res => res.json()),
            fetch('/api/dashboard/sales-chart?days=30').then(res => res.json())
        ]).then(([statsData, chartResData]) => {
            setStats(statsData);
            setChartData(Array.isArray(chartResData) ? chartResData : []);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="w-full h-[60vh] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-t-[#20b878] border-[#20b878]/20 animate-spin"></div>
                    <p className="text-gray-500 font-medium font-tajawal">جاري تحميل البيانات...</p>
                </div>
            </div>
        );
    }

    const COLORS = ['#20b878', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="space-y-6 font-tajawal">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4 md:gap-6">
                {/* Products */}
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-blue-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
                    <div className="bg-blue-50 p-3.5 rounded-2xl text-blue-600 relative z-10">
                        <Package size={22} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-wider block mb-0.5">المنتجات</span>
                        <h3 className="text-2xl font-black text-gray-900 font-sans">{stats?.totalProducts || 0}</h3>
                    </div>
                </div>

                {/* Sales Net Today */}
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-green-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
                    <div className="bg-green-50 p-3.5 rounded-2xl text-green-600 relative z-10">
                        <TrendingUp size={22} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-wider block mb-0.5">مبيعات اليوم</span>
                        <h3 className="text-xl font-black text-gray-900 font-sans">{stats?.todayNet?.toLocaleString() || 0} <span className="text-[10px] text-gray-400">دج</span></h3>
                    </div>
                </div>

                {/* Collections Today */}
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-emerald-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
                    <div className="bg-emerald-50 p-3.5 rounded-2xl text-emerald-600 relative z-10">
                        <CreditCard size={22} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider block mb-0.5">تحصيلات اليوم</span>
                        <h3 className="text-xl font-black text-gray-900 font-sans">{stats?.todayCustomerCollections?.toLocaleString() || 0} <span className="text-[10px] text-gray-400">دج</span></h3>
                    </div>
                </div>

                {/* Supplier Payments Today */}
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-rose-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
                    <div className="bg-rose-50 p-3.5 rounded-2xl text-rose-600 relative z-10">
                        <ArrowDownLeft size={22} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block mb-0.5">مدفوعات اليوم</span>
                        <h3 className="text-xl font-black text-gray-900 font-sans">{stats?.todaySupplierPayments?.toLocaleString() || 0} <span className="text-[10px] text-gray-400">دج</span></h3>
                    </div>
                </div>

                {/* Net Liquidity (Dark Card) */}
                <div className="bg-gray-900 p-5 rounded-[2rem] border border-gray-800 shadow-xl flex items-center gap-4 relative overflow-hidden group hover:scale-[1.03] transition-all">
                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-blue-500/10 rounded-full"></div>
                    <div className="bg-blue-600 p-3.5 rounded-2xl text-white relative z-10 shadow-lg shadow-blue-500/20">
                        <TrendingUp size={22} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-0.5">السيولة الفعلية</span>
                        <h3 className="text-lg font-black text-white font-sans truncate">
                            {((stats?.todayNet || 0) + (stats?.todayCustomerCollections || 0) - (stats?.todaySupplierPayments || 0)).toLocaleString()} <span className="text-[8px] text-gray-500">دج</span>
                        </h3>
                    </div>
                </div>

                {/* Low Stock */}
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-red-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
                    <div className="bg-red-50 p-3.5 rounded-2xl text-red-600 relative z-10">
                        <AlertTriangle size={22} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-wider block mb-0.5">مخزون منخفض</span>
                        <h3 className="text-2xl font-black text-gray-900 font-sans">{stats?.lowStockCount || 0}</h3>
                    </div>
                </div>

                {/* Total Debt */}
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-amber-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
                    <div className="bg-amber-50 p-3.5 rounded-2xl text-amber-600 relative z-10">
                        <ArrowDownLeft size={22} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block mb-0.5">إجمالي الديون</span>
                        <h3 className="text-xl font-black text-gray-900 font-sans">{(stats?.totalDebt || 0).toLocaleString()} <span className="text-[10px] text-gray-400">دج</span></h3>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Line Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">المبيعات والمشتريات — آخر 30 يوم</h3>
                    <div className="h-80 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
                                <Tooltip
                                    formatter={(value: any) => [`${value.toLocaleString()} دج`]}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right', fontFamily: 'inherit' }}
                                />
                                <Legend iconType="circle" />
                                <Line type="monotone" dataKey="sales" name="المبيعات" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="purchases" name="المشتريات" stroke="#20b878" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">المنتجات الأكثر مبيعاً</h3>
                    <div className="flex-1 w-full" dir="ltr">
                        {stats?.topProducts?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.topProducts}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="sold"
                                        nameKey="name"
                                    >
                                        {stats.topProducts.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => [`${value} قطعة`]} contentStyle={{ fontFamily: 'inherit', textAlign: 'right' }} />
                                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', fontFamily: 'inherit', marginTop: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">لا توجد بيانات مبيعات بعد</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders Table */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900">آخر الطلبات</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">رقم الطلب</th>
                                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">العميل</th>
                                    <th className="px-6 py-3 text-sm font-semibold text-gray-600 text-left">المبلغ</th>
                                    <th className="px-6 py-3 text-sm font-semibold text-gray-600 text-center">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {stats?.recentOrders?.length > 0 ? stats.recentOrders.map((order: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900" dir="ltr">{order.orderNumber}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{order.customerName}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900 text-left" dir="ltr">{order.total.toLocaleString()} دج</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full
                        ${order.status === 'DONE' || order.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                                                {order.status === 'DONE' || order.status === 'COMPLETED' ? 'مكتمل' : 'معلق'}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">لا توجد طلبات حديثة</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-red-50/50 p-6 rounded-xl border border-red-100 shadow-sm h-full max-h-[400px] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                            <AlertTriangle size={20} />
                            التنبيهات
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {stats?.expiredList?.map((product: any, idx: number) => (
                            <div key={`expired-${idx}`} className="p-3 bg-red-50 border border-red-300 rounded-lg flex items-center gap-3 shadow-sm">
                                <div className="text-red-600 flex-shrink-0"><AlertTriangle size={18} /></div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-red-700 leading-tight">🔴 منتهي الصلاحية: {product.name}</p>
                                </div>
                            </div>
                        ))}

                        {stats?.lowStockProducts?.map((product: any, idx: number) => (
                            <div key={`low-stock-${idx}`} className="p-3 bg-white border border-red-200 rounded-lg flex items-center gap-3 shadow-sm">
                                <div className="text-red-500 flex-shrink-0"><AlertTriangle size={18} /></div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900 leading-tight">🚨 {product.name} — باقي {product.quantity} {product.unit}</p>
                                </div>
                            </div>
                        ))}

                        {stats?.creditAlerts?.map((alert: any, idx: number) => (
                            <div key={`credit-${idx}`} className="p-3 bg-white border border-amber-200 rounded-lg flex items-center gap-3 shadow-sm">
                                <div className="text-amber-500 flex-shrink-0"><AlertTriangle size={18} /></div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900 leading-tight">⚠️ الزبون {alert.name} تجاوز الائتمان</p>
                                </div>
                            </div>
                        ))}

                        {stats?.overdueInvoices?.map((inv: any, idx: number) => {
                            const dateStr = new Date(inv.dueDate).toLocaleDateString('ar-DZ');
                            return (
                                <div key={`overdue-${idx}`} className="p-3 bg-red-50 border border-red-300 rounded-lg flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="text-red-600 flex-shrink-0"><Clock size={18} /></div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-red-800 leading-tight">فاتورة متأخرة: <span className="font-sans">{inv.invoiceNumber}</span></p>
                                            <p className="text-xs text-red-600 font-medium">العميل: {inv.customerName}</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black text-gray-900 font-sans" dir="ltr">{inv.remaining.toLocaleString()} دج</p>
                                        <p className="text-[10px] font-bold text-red-500 mt-1">استحقت يوم: {dateStr}</p>
                                    </div>
                                </div>
                            );
                        })}

                        {(!stats?.lowStockProducts?.length && !stats?.creditAlerts?.length && !stats?.expiredList?.length && !stats?.overdueInvoices?.length) && (
                            <div className="h-40 flex flex-col items-center justify-center text-center text-gray-500">
                                <Package size={32} className="text-gray-300 mb-2" />
                                <p className="text-sm font-medium">كل شيء على ما يرام.</p>
                                <p className="text-xs mt-1">لا توجد تنبيهات حالياً.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
