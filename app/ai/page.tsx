'use client';

import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line
} from 'recharts';
import {
    Brain, TrendingUp, AlertTriangle, ShoppingCart,
    Layers, UserCheck, Briefcase, Package, RefreshCw,
    ArrowLeft, CheckCircle, Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AIDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'forecast' | 'profit' | 'replenish'>('forecast');
    const [forecastData, setForecastData] = useState<any[]>([]);
    const [profitData, setProfitData] = useState<any[]>([]);
    const [groupBy, setGroupBy] = useState<'product' | 'supplier' | 'project' | 'customer'>('product');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fRes, pRes] = await Promise.all([
                fetch('/api/ai/demand-forecast'),
                fetch(`/api/ai/profitability?groupBy=${groupBy}`)
            ]);
            setForecastData(await fRes.json());
            setProfitData(await pRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [groupBy]);

    const getUrgencyColor = (days: number | null) => {
        if (days === null) return 'bg-gray-100 text-gray-500';
        if (days <= 7) return 'bg-red-100 text-red-700 border-red-200';
        if (days <= 14) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-green-100 text-green-700 border-green-200';
    };

    const replenishItems = forecastData.filter(i => i.reorderRecommended);

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col gap-8" dir="rtl">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-3 rounded-2xl text-white shadow-xl shadow-purple-200">
                        <Brain size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">التحليلات الذكية</h1>
                        <p className="text-sm font-bold text-gray-500">الذكاء الاصطناعي في خدمة نمو تجارتك</p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    className="bg-white border border-gray-200 p-3 rounded-xl hover:shadow-lg transition-all text-gray-600 flex items-center gap-2 font-black"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> تحديث التحليلات
                </button>
            </div>

            {/* TABS */}
            <div className="flex bg-gray-200/50 p-1.5 rounded-2xl gap-1 self-start">
                <button onClick={() => setActiveTab('forecast')} className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'forecast' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>🔮 توقع الطلب</button>
                <button onClick={() => setActiveTab('profit')} className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'profit' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>💰 تحليل الربحية</button>
                <button onClick={() => setActiveTab('replenish')} className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'replenish' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>🛒 إعادة التوريد</button>
            </div>

            {/* CONTENT */}
            {activeTab === 'forecast' && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 border-b border-gray-50">
                        <h2 className="text-xl font-black text-gray-900">توقعات حركة المخزون (٩٠ يوماً القادمة)</h2>
                        <p className="text-xs font-bold text-gray-400 mt-1 italic">يقوم النظام بتحليل أنماط البيع التاريخية للتنبؤ بنفاد الكمية.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">المنتج</th>
                                    <th className="px-6 py-4 text-center">المخزون الحالي</th>
                                    <th className="px-6 py-4 text-center">متوسط البيع اليومي</th>
                                    <th className="px-6 py-4 text-center">توقع ٣٠ يوم</th>
                                    <th className="px-6 py-4 text-center">الأيام المتبقية</th>
                                    <th className="px-6 py-4">الحالة والتوصية</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {forecastData.map((p, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-black text-gray-900">{p.productName}</td>
                                        <td className="px-6 py-4 text-center font-bold font-sans">{p.currentStock} {p.unit}</td>
                                        <td className="px-6 py-4 text-center font-bold font-sans text-blue-600">{p.avgDailySales.toFixed(1)}</td>
                                        <td className="px-6 py-4 text-center font-bold font-sans text-purple-600">{p.forecast30Days}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black border ${getUrgencyColor(p.daysUntilStockout)}`}>
                                                {p.daysUntilStockout === null ? 'غير محدد' : `${p.daysUntilStockout} يوم`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {p.reorderRecommended ? (
                                                <div className="flex items-center gap-2 text-red-600 font-black text-xs">
                                                    <AlertTriangle size={14} /> يوصى بإعادة الطلب
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-green-600 font-black text-xs">
                                                    <CheckCircle size={14} /> المستوى آمن
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'profit' && (
                <div className="flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex gap-2">
                        {[
                            { id: 'product', label: 'المنتجات', icon: Package },
                            { id: 'supplier', label: 'الموردون', icon: UserCheck },
                            { id: 'project', label: 'المشاريع', icon: Briefcase },
                            { id: 'customer', label: 'العملاء', icon: UserCheck }
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => setGroupBy(btn.id as any)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all border ${groupBy === btn.id ? 'bg-purple-600 text-white border-purple-600 shadow-xl shadow-purple-100' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                            >
                                <btn.icon size={18} /> {btn.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-black text-gray-900 mb-8">توزيع الأرباح الصافية</h3>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={profitData.slice(0, 10)} layout="vertical" margin={{ left: 40, right: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: any, name: any, item: any) => [`${Number(value).toLocaleString()} دج`, 'الربح']}
                                        />
                                        <Bar dataKey="profit" radius={[0, 8, 8, 0]} barSize={24}>
                                            {profitData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#9333ea' : '#c084fc'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden overflow-y-auto max-h-[500px]">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-50 text-gray-400 font-black text-[10px] tracking-widest sticky top-0">
                                    <tr>
                                        <th className="px-6 py-4">الاسم</th>
                                        <th className="px-6 py-4">الإيراد</th>
                                        <th className="px-6 py-4">الربح</th>
                                        <th className="px-6 py-4">الهامش</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {profitData.map((p, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4 font-black">{p.name}</td>
                                            <td className="px-6 py-4 font-medium font-sans">{p.totalRevenue.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-black text-purple-600 font-sans">{p.profit.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-black bg-purple-50 text-purple-700 px-2 py-1 rounded-lg">%{p.margin.toFixed(1)}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'replenish' && (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900">مـقـتـرحـات إعـادة الـتـوريد</h2>
                            <p className="text-sm font-bold text-gray-500">بـنـاءً عـلى خـوارزمـيـة EOQ وطـلـب السوق</p>
                        </div>
                        <button
                            onClick={() => router.push('/orders/new')}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-purple-200 transition-all flex items-center gap-3 active:scale-95"
                        >
                            <ShoppingCart size={20} /> إنشاء طلبية شراء ذكية
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {replenishItems.length === 0 ? (
                            <div className="col-span-full bg-white p-20 rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center text-center gap-4">
                                <div className="bg-green-50 p-6 rounded-full text-green-600"><CheckCircle size={48} /></div>
                                <h3 className="text-xl font-black text-gray-900">المخزون في حالة مثالية</h3>
                                <p className="text-gray-400 font-bold max-w-sm">لا توجد منتجات تحتاج إلى إعادة توريد فورية بناءً على معايير الأمان الحالية.</p>
                            </div>
                        ) : replenishItems.map((p, i) => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm relative group hover:shadow-2xl transition-all">
                                <div className="absolute -top-3 -left-3 bg-red-600 text-white p-2 rounded-xl shadow-lg ring-4 ring-white">
                                    <AlertTriangle size={20} />
                                </div>

                                <h3 className="text-xl font-black text-gray-900 mt-4">{p.productName}</h3>
                                <div className="mt-6 flex flex-col gap-4">
                                    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
                                        <span className="text-gray-400 font-bold">المخزون الحالي</span>
                                        <span className="text-red-500 font-black font-sans">{p.currentStock} {p.unit}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
                                        <span className="text-gray-400 font-bold">الكمية المقترحة (EOQ)</span>
                                        <span className="text-purple-600 font-black font-sans">{p.recommendedOrderQty} {p.unit}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400 font-bold">المورد المفضل</span>
                                        <span className="text-gray-900 font-black">{p.lastSupplierName || 'غير محدد'}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push('/orders/new')}
                                    className="mt-8 w-full py-4 bg-gray-50 text-gray-900 rounded-xl font-black text-sm hover:bg-purple-50 hover:text-purple-600 transition-all border border-transparent hover:border-purple-100 flex items-center justify-center gap-2"
                                >
                                    طلب التوريد الآن <ArrowLeft size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
                        <Info className="text-blue-600 shrink-0" size={24} />
                        <div>
                            <h4 className="text-sm font-black text-blue-900">كيف نقوم بالحساب؟</h4>
                            <p className="text-xs font-bold text-blue-700/70 mt-1 leading-relaxed">
                                نستخدم معادلة **الكمية الاقتصادية للطلب (EOQ)** التي توازن بين تكاليف الطلبية وتكاليف التخزين لضمان أقل تكلفة ممكنة، بالإضافة إلى **تحليل الانحدار الخطي** للتنبؤ بموعد نفاذ المخزون بناءً على متوسط السحب اليومي.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
