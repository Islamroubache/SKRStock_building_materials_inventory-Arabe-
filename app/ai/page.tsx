'use client';

import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line
} from 'recharts';
import {
    Brain, TrendingUp, AlertTriangle, ShoppingCart,
    Layers, UserCheck, Briefcase, Package, RefreshCw,
    ArrowLeft, CheckCircle, Info, Zap, X, Printer,
    Calendar, Coffee, Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AIDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'forecast' | 'profit' | 'replenish' | 'anomalies' | 'timing'>('forecast');
    const [forecastData, setForecastData] = useState<any[]>([]);
    const [profitData, setProfitData] = useState<any[]>([]);
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [timingData, setTimingData] = useState<any>(null);
    const [isReplenishModalOpen, setIsReplenishModalOpen] = useState(false);
    const [groupBy, setGroupBy] = useState<'product' | 'supplier' | 'project' | 'customer'>('product');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fRes, pRes, aRes, tRes] = await Promise.all([
                fetch('/api/ai/demand-forecast'),
                fetch(`/api/ai/profitability?groupBy=${groupBy}`),
                fetch('/api/ai/anomalies'),
                fetch('/api/ai/sales-timing')
            ]);
            const fData = await fRes.json();
            const pData = await pRes.json();
            const aData = await aRes.json();
            const tData = await tRes.json();
            
            setForecastData(Array.isArray(fData) ? fData : []);
            setProfitData(Array.isArray(pData) ? pData : []);
            setAnomalies(Array.isArray(aData) ? aData : []);
            setTimingData(tData);
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

    const handlePrintReplenish = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const tableContent = document.getElementById('replenish-table-print')?.innerHTML;
        printWindow.document.write(`
            <html>
                <head>
                    <title>طلبية شراء ذكية - AI</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 40px; }
                        h1 { text-align: center; color: #7c3aed; }
                        table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                        th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: right; }
                        th { background-color: #f9fafb; font-weight: bold; }
                        .footer { margin-top: 50px; font-size: 10px; color: #9ca3af; text-align: center; }
                    </style>
                </head>
                <body>
                    <h1>مقترحات طلبات الشراء الذكية</h1>
                    <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-DZ')}</p>
                    ${tableContent}
                    <div class="footer">تم إنشاء هذا التقرير بواسطة نظام الذكاء الاصطناعي - سوكر</div>
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

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
            </div>

            {/* TABS */}
            <div className="flex bg-gray-200/50 p-1.5 rounded-2xl gap-1 self-start">
                <button onClick={() => setActiveTab('forecast')} className={`px-8 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === 'forecast' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>🔮 توقع الطلب</button>
                <button onClick={() => setActiveTab('profit')} className={`px-8 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === 'profit' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>💰 تحليل الربحية</button>
                <button onClick={() => setActiveTab('replenish')} className={`px-8 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === 'replenish' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>🛒 إعادة التوريد</button>
                <button onClick={() => setActiveTab('anomalies')} className={`px-8 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === 'anomalies' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>⚠️ كشف الأنماط</button>
                <button onClick={() => setActiveTab('timing')} className={`px-8 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === 'timing' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>🕒 توقيت المبيعات</button>
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
                                        {groupBy === 'product' && <th className="px-6 py-4 text-center">التصنيف</th>}
                                        <th className="px-6 py-4">الإيراد</th>
                                        <th className="px-6 py-4">الربح</th>
                                        <th className="px-6 py-4">الهامش</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {profitData.map((p, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4 font-black">{p.name}</td>
                                            {groupBy === 'product' && (
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black border ${
                                                        p.abcClass === 'A' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                        p.abcClass === 'B' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                        'bg-gray-100 text-gray-400 border-gray-200'
                                                    }`}>
                                                        صنف {p.abcClass}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 font-medium font-sans">{p.totalRevenue.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-black text-purple-600 font-sans">{p.profit.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-black bg-purple-50 text-purple-700 px-2 py-1 rounded-xl">%{p.margin.toFixed(1)}</span>
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
                            onClick={() => setIsReplenishModalOpen(true)}
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
                                <div className="absolute -top-3 -left-3 bg-red-600 text-white p-2 rounded-2xl shadow-lg ring-4 ring-white">
                                    <AlertTriangle size={20} />
                                </div>

                                <h3 className="text-xl font-black text-gray-900 mt-4">{p.productName}</h3>
                                {p.isBelowMin && (
                                    <div className="mt-1 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md inline-block">
                                        وصل للحد الأدنى للمخزون
                                    </div>
                                )}
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

            {activeTab === 'anomalies' && (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">كـشـف الأنـمـاط الـغـريـبـة</h2>
                        <p className="text-sm font-bold text-gray-500">تـنـبـيـهـات عـن حـركـات مـخـزون غـيـر اعـتـيـاديـة</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {anomalies.length === 0 ? (
                            <div className="col-span-full bg-white p-20 rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center text-center gap-4">
                                <div className="bg-purple-50 p-6 rounded-full text-purple-600"><CheckCircle size={48} /></div>
                                <h3 className="text-xl font-black text-gray-900">لا توجد أنماط غريبة حالياً</h3>
                                <p className="text-gray-400 font-bold max-w-sm">جميع حركات المخزون في الـ ٩٠ يوماً الأخيرة تبدو ضمن النطاق الإحصائي الطبيعي.</p>
                            </div>
                        ) : anomalies.map((a, i) => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl transition-all border-r-4 border-r-purple-600">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-purple-100 text-purple-700 p-2 rounded-2xl">
                                        <Zap size={20} />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400">{new Date(a.date).toLocaleDateString('ar-DZ')}</span>
                                </div>
                                
                                <h3 className="text-lg font-black text-gray-900">{a.productName}</h3>
                                <p className="text-xs font-bold text-gray-500 mt-1">طلب غير معتاد من {a.customerName}</p>

                                <div className="mt-6 p-4 bg-gray-50 rounded-2xl flex justify-between items-center">
                                    <div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">الكمية المسجلة</div>
                                        <div className="text-xl font-black text-gray-900 font-sans">{a.quantity}</div>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[10px] font-black text-purple-400 uppercase tracking-wider">الانحراف عن المتوسط</div>
                                        <div className="text-lg font-black text-purple-600 font-sans">+{a.deviation.toFixed(0)}</div>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-gray-400 italic">
                                    <Info size={12} /> هذا الرقم يتجاوز المعدل الطبيعي لهذا المنتج بـ ٣ أضعاف.
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Replenish Modal */}
            {isReplenishModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-purple-50/50">
                            <div className="flex items-center gap-4">
                                <div className="bg-purple-600 text-white p-3 rounded-2xl shadow-lg shadow-purple-200">
                                    <ShoppingCart size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">طلبية شراء ذكية مقترحة</h2>
                                    <p className="text-sm font-bold text-purple-600">قائمة المنتجات التي ينصح بتوفيرها فوراً</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsReplenishModalOpen(false)}
                                className="bg-white p-2 rounded-2xl text-gray-400 hover:text-gray-900 transition-all border border-gray-100 shadow-sm"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 max-h-[60vh] overflow-y-auto">
                            <div id="replenish-table-print">
                                <table className="w-full text-right">
                                    <thead className="bg-gray-50 text-gray-400 font-black text-[10px] tracking-widest uppercase">
                                        <tr>
                                            <th className="px-6 py-4">المنتج</th>
                                            <th className="px-6 py-4 text-center">المخزون الحالي</th>
                                            <th className="px-6 py-4 text-center">الكمية المقترحة (EOQ)</th>
                                            <th className="px-6 py-4 text-center">المورد المفضل</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {replenishItems.map((p, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-5 font-black text-gray-900">{p.productName}</td>
                                                <td className="px-6 py-5 text-center font-bold font-sans text-red-500">{p.currentStock} {p.unit}</td>
                                                <td className="px-6 py-5 text-center font-black font-sans text-purple-600 text-lg">{p.recommendedOrderQty} {p.unit}</td>
                                                <td className="px-6 py-5 text-center font-bold text-gray-500">{p.lastSupplierName || 'غير محدد'}</td>
                                            </tr>
                                        ))}
                                        {replenishItems.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-bold">لا توجد منتجات تحتاج لتوريد حالياً</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
                            <button 
                                onClick={handlePrintReplenish}
                                className="flex-1 bg-white border border-gray-200 text-gray-900 py-4 rounded-2xl font-black shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                <Printer size={20} className="text-purple-600" /> طباعة الطلبية
                            </button>
                            <button 
                                onClick={() => setIsReplenishModalOpen(false)}
                                className="flex-1 bg-purple-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-purple-200 hover:bg-purple-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                <ArrowLeft size={20} /> العودة للتحليلات
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'timing' && timingData && (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 flex flex-col gap-8">
                            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center gap-3">
                                    <Calendar className="text-purple-600" size={20} /> تحليل المبيعات حسب أيام الأسبوع
                                </h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={timingData.dayStats}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 800 }} />
                                            <YAxis hide />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value: any) => [`${Number(value).toLocaleString()} دج`, 'الإيرادات']}
                                            />
                                            <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="#9333ea" barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center gap-3">
                                    <Clock className="text-blue-600" size={20} /> تحليل المبيعات حسب ساعات اليوم
                                </h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={timingData.hourStats}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} tickFormatter={(h) => `${h}:00`} />
                                            <YAxis hide />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value: any) => [value, 'عدد الطلبات']}
                                            />
                                            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 8 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-purple-200">
                                <h3 className="text-xl font-black mb-6">توصيات الذكاء الاصطناعي</h3>
                                
                                <div className="space-y-6">
                                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
                                        <div className="text-white/60 text-[10px] font-black uppercase tracking-wider mb-1">أفضل يوم للبيع</div>
                                        <div className="text-2xl font-black flex items-center gap-3">
                                            <Calendar size={24} /> {timingData.recommendations.bestDay}
                                        </div>
                                    </div>

                                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
                                        <div className="text-white/60 text-[10px] font-black uppercase tracking-wider mb-1">ساعة الذروة</div>
                                        <div className="text-2xl font-black flex items-center gap-3">
                                            <Zap size={24} className="text-yellow-400 fill-yellow-400" /> {timingData.recommendations.bestHour}
                                        </div>
                                    </div>

                                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
                                        <div className="text-white/60 text-[10px] font-black uppercase tracking-wider mb-1">وقت الفتح المقترح</div>
                                        <div className="text-2xl font-black flex items-center gap-3">
                                            <Coffee size={24} /> {timingData.recommendations.suggestedOpening}
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-8 text-xs font-bold text-white/50 italic leading-relaxed">
                                    * تعتمد هذه التوصيات على تحليل جميع طلبات البيع المسجلة في النظام منذ البداية.
                                </p>
                            </div>

                            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                                <h4 className="text-emerald-900 font-black mb-4 flex items-center gap-2">
                                    <TrendingUp size={18} /> فترات الذروة
                                </h4>
                                <div className="space-y-4">
                                    {timingData.recommendations.peakPeriods.map((p: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-emerald-100 shadow-sm">
                                            <span className="text-emerald-700 font-bold text-sm">{p.label}</span>
                                            <span className="text-emerald-900 font-black font-sans">{p.peak}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
