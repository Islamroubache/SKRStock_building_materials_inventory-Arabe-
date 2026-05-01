'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
    ShoppingBag, Plus, Search, Calendar, User, PackageOpen, LayoutGrid, 
    MoreVertical, Eye, Printer, FileDown, FileText, Table as TableIcon, XCircle, CheckCircle, FileSpreadsheet, ChevronDown, ChevronUp, Banknote, RotateCcw, Download
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import * as xlsx from 'xlsx';
import { exportOrdersToPDF } from '@/lib/export-orders-pdf';

interface OrderItem {
    id: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    total: number;
    product: { name: string; unit: string; sellPrice?: number };
    returnedQuantity?: number;
}

interface Order {
    id: number;
    orderNumber: string;
    orderDate: string;
    total: number;
    grandTotal: number;
    paidAmount: number;
    status: string;
    type: 'SALE' | 'PURCHASE' | 'RETURN_SALE' | 'RETURN_PURCHASE';
    notes: string | null;
    customerName?: string | null;
    customer?: { name: string } | null;
    supplier?: { name: string } | null;
    project?: { name: string } | null;
    items: OrderItem[];
    invoice?: { 
        paid: number; 
        remaining: number;
        status?: string;
        payments?: { paymentMethod: string }[] 
    } | null;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filtering states
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'SALE' | 'PURCHASE' | 'RETURN'>('SALE');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | 'GUEST' | 'FIDEL'>('ALL');
    
    // Expandable row state
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    // View toggle
    const [showList, setShowList] = useState(false);

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/orders');
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || 
                order.orderNumber.toLowerCase().includes(searchLower) ||
                (order.customer?.name || '').toLowerCase().includes(searchLower) ||
                (order.supplier?.name || '').toLowerCase().includes(searchLower) ||
                (order.project?.name || '').toLowerCase().includes(searchLower);
            
            const matchesType = typeFilter === 'RETURN' 
                ? (order.type === 'RETURN_SALE' || order.type === 'RETURN_PURCHASE')
                : order.type === typeFilter;
            
            const matchesStatus = statusFilter === 'ALL' || 
                (typeFilter === 'RETURN' && statusFilter === 'RETURN_SALE' && order.type === 'RETURN_SALE') ||
                (typeFilter === 'RETURN' && statusFilter === 'RETURN_PURCHASE' && order.type === 'RETURN_PURCHASE') ||
                (typeFilter !== 'RETURN' && order.status === statusFilter);

            // Date filtering: normalize to local date string for comparison or use start/end of day
            const orderDate = new Date(order.orderDate);
            orderDate.setHours(0, 0, 0, 0);

            let matchesStartDate = true;
            if (startDate) {
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                matchesStartDate = orderDate >= sDate;
            }

            let matchesEndDate = true;
            if (endDate) {
                const eDate = new Date(endDate);
                eDate.setHours(0, 0, 0, 0);
                matchesEndDate = orderDate <= eDate;
            }

            const matchesCustomerType = typeFilter !== 'SALE' || customerTypeFilter === 'ALL' || 
                (customerTypeFilter === 'GUEST' ? !order.customerId : !!order.customerId);

            return matchesSearch && matchesType && matchesStatus && matchesStartDate && matchesEndDate && matchesCustomerType;
        }).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [orders, searchTerm, typeFilter, statusFilter, startDate, endDate, customerTypeFilter]);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const ordersToday = orders.filter(o => o.orderDate.startsWith(today));
        
        return {
            totalToday: ordersToday.reduce((sum, o) => sum + o.total, 0),
            pendingCount: orders.filter(o => o.status === 'PENDING').length,
            salesTodayCount: ordersToday.filter(o => o.type === 'SALE').length,
            purchasesTodayCount: ordersToday.filter(o => o.type === 'PURCHASE').length
        };
    }, [orders]);

    const currentOrders = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredOrders.slice(start, start + itemsPerPage);
    }, [filteredOrders, currentPage, itemsPerPage]);

    const handleExportExcel = () => {
        const data = filteredOrders.map(o => ({
            'رقم الطلبية': o.orderNumber,
            'النوع': o.type,
            'التاريخ': formatDate(o.orderDate),
            'الجهة': o.type === 'SALE' ? o.customer?.name : o.supplier?.name,
            'المبلغ': o.total,
            'الحالة': o.status
        }));
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Orders");
        xlsx.writeFile(wb, `طلبيات_${new Date().toLocaleDateString()}.xlsx`);
    };

    const handleExportPDF = () => {
        exportOrdersToPDF(filteredOrders);
    };

    const toggleOrder = (id: number) => {
        setExpandedOrder(expandedOrder === id ? null : id);
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;

    return (
        <div className="font-tajawal min-h-screen bg-transparent text-gray-900 flex flex-col gap-4 print:p-0 print:bg-white" dir="rtl">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: landscape; margin: 0.5cm; }
                    body { background: white !important; }
                    .print-hide { display: none !important; }
                    .no-print { display: none !important; }
                    nav, aside, header { display: none !important; }
                    .print-area { width: 100% !important; margin: 0 !important; padding: 0 !important; }
                    table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #000 !important; }
                    th, td { border: 1px solid #000 !important; padding: 6px !important; text-align: right !important; font-size: 9px !important; color: #000 !important; }
                    th { background-color: #eee !important; -webkit-print-color-adjust: exact; font-weight: bold !important; }
                }
            `}} />

            {!showList ? (
                /* ===== HOME VIEW ===== */
                <div className="flex-1 flex flex-col gap-8 p-4 md:p-8 animate-in fade-in duration-700">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">إدارة الطلبيات</h1>
                            <p className="text-gray-500 font-bold mt-1">تتبع المبيعات والمشتريات وإدارة المخزون</p>
                        </div>

                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Card 1: Today's Total */}
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
                            <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 relative z-10 shadow-sm">
                                <LayoutGrid size={24} />
                            </div>
                            <div className="flex-1 relative z-10">
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider mb-1 inline-block">إجمالي اليوم</span>
                                <p className="text-2xl font-black font-sans text-gray-900">{stats.totalToday.toLocaleString()} <span className="text-xs font-bold text-gray-400 mr-1">دج</span></p>
                            </div>
                        </div>

                        {/* Card 2: Pending Orders */}
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
                            <div className="bg-amber-50 p-4 rounded-2xl text-amber-600 relative z-10 shadow-sm">
                                <RotateCcw size={24} />
                            </div>
                            <div className="flex-1 relative z-10">
                                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-wider mb-1 inline-block">طلبيات معلقة</span>
                                <p className="text-2xl font-black font-sans text-gray-900">{stats.pendingCount} <span className="text-xs font-bold text-gray-400 mr-1">طلبية</span></p>
                            </div>
                        </div>

                        {/* Card 3: Sales Today */}
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
                            <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 relative z-10 shadow-sm">
                                <ShoppingBag size={24} />
                            </div>
                            <div className="flex-1 relative z-10">
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider mb-1 inline-block">مبيعات اليوم</span>
                                <p className="text-2xl font-black font-sans text-gray-900">{stats.salesTodayCount} <span className="text-xs font-bold text-gray-400 mr-1">طلبية</span></p>
                            </div>
                        </div>

                        {/* Card 4: Purchases Today */}
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
                            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 relative z-10 shadow-sm">
                                <PackageOpen size={24} />
                            </div>
                            <div className="flex-1 relative z-10">
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider mb-1 inline-block">مشتريات اليوم</span>
                                <p className="text-2xl font-black font-sans text-gray-900">{stats.purchasesTodayCount} <span className="text-xs font-bold text-gray-400 mr-1">طلبية</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Two Big Action Buttons */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
                        <p className="text-gray-400 font-black text-sm uppercase tracking-widest">اختر نوع الطلبية</p>
                        <div className="flex flex-col sm:flex-row gap-5 w-full max-w-xl">
                            <Link
                                href="/orders/new?type=SALE"
                                className="flex-1 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-3xl py-10 px-6 shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.03] active:scale-95 transition-all duration-200 group"
                            >
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-all">
                                    <ShoppingBag size={32} className="text-white" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-black">طلبية بيع</p>
                                    <p className="text-blue-200 text-xs font-medium mt-1">إنشاء فاتورة بيع جديدة</p>
                                </div>
                            </Link>
                            <Link
                                href="/orders/new?type=PURCHASE"
                                className="flex-1 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-3xl py-10 px-6 shadow-xl shadow-emerald-200 hover:shadow-emerald-300 hover:scale-[1.03] active:scale-95 transition-all duration-200 group"
                            >
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-all">
                                    <PackageOpen size={32} className="text-white" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-black">طلبية شراء</p>
                                    <p className="text-emerald-200 text-xs font-medium mt-1">تسجيل طلبية شراء جديدة</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Bottom Button: Show Orders List */}
                    <div className="flex justify-center pb-4">
                        <button
                            onClick={() => setShowList(true)}
                            className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                            <Eye size={18} />
                            سجل الطلبيات
                            <ChevronDown size={16} className="opacity-60" />
                        </button>
                    </div>
                </div>
            ) : (
                /* ===== LIST VIEW ===== */
                <div className="flex flex-col min-h-screen p-4 md:p-6 gap-4 animate-in slide-in-from-bottom-4 duration-500 print:p-0">
                    {/* List Header */}
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 print:hidden">
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <button onClick={() => setShowList(false)} className="p-2.5 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all shadow-sm">
                                <ChevronUp size={18} className="text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-black text-gray-900">سجل الطلبيات</h1>
                                <p className="text-gray-400 text-xs">{filteredOrders.length} طلبية تم العثور عليها</p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full lg:w-auto justify-end">
                            <div className="relative group">
                                <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-2xl font-black text-xs shadow-sm flex items-center gap-2 hover:bg-gray-50">
                                    <Download size={14} className="text-blue-600"/> تصدير
                                </button>
                                <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                    <button onClick={handleExportExcel} className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-xs font-bold text-gray-700 flex items-center gap-2 border-b border-gray-50 transition-colors">
                                        <FileSpreadsheet size={14} className="text-emerald-600"/> Excel (.xlsx)
                                    </button>
                                    <button onClick={handleExportPDF} className="w-full text-right px-4 py-3 hover:bg-rose-50 text-xs font-bold text-gray-700 flex items-center gap-2 transition-colors">
                                        <FileText size={14} className="text-rose-600"/> PDF (.pdf)
                                    </button>
                                </div>
                            </div>
                            <button 
                                onClick={() => window.print()}
                                className="bg-gray-900 text-white px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                            >
                                <Printer size={16} /> طباعة القائمة
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm flex flex-col gap-4 print:hidden">
                        <div className="flex flex-col xl:flex-row gap-3 xl:items-center justify-between">
                            <div className="flex flex-col md:flex-row gap-3 flex-1">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                                    <input 
                                        type="text" 
                                        placeholder="ابحث برقم الطلبية أو اسم الجهة..." 
                                        value={searchTerm} 
                                        onChange={(e) => setSearchTerm(e.target.value)} 
                                        className="w-full border border-gray-200 rounded-2xl pr-10 pl-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-400 outline-none font-sans transition-all"
                                    />
                                </div>
                                <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-200 w-fit">
                                    <button onClick={() => { setTypeFilter('SALE'); setStatusFilter('ALL'); setCustomerTypeFilter('ALL'); }} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${typeFilter === 'SALE' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-800'}`}>🛒 مبيعات</button>
                                    <button onClick={() => { setTypeFilter('PURCHASE'); setStatusFilter('ALL'); setCustomerTypeFilter('ALL'); }} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${typeFilter === 'PURCHASE' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-800'}`}>📦 مشتريات</button>
                                    <button onClick={() => { setTypeFilter('RETURN'); setStatusFilter('ALL'); setCustomerTypeFilter('ALL'); }} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${typeFilter === 'RETURN' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-800'}`}>🔄 استرجاع</button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-200 w-fit">
                                <span className="text-[10px] font-black text-gray-400 px-1">الفترة من</span>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs font-bold text-gray-700 outline-none border-none focus:ring-0 cursor-pointer"/>
                                <div className="w-px h-4 bg-gray-200"/>
                                <span className="text-[10px] font-black text-gray-400 px-1">إلى</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs font-bold text-gray-700 outline-none border-none focus:ring-0 cursor-pointer"/>
                                {(startDate || endDate) && <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-gray-400 hover:text-rose-500 text-sm font-black px-1 transition-colors">↺</button>}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-50">
                            {/* Status Dropdown */}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase">حالة الطلبية:</span>
                                <select 
                                    value={statusFilter} 
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[10px] font-black text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-sm"
                                >
                                    <option value="ALL">الكل</option>
                                    {typeFilter === 'SALE' && (<>
                                        <option value="DONE">✅ مكتملة</option>
                                        <option value="PENDING">⏳ معلقة</option>
                                        <option value="PARTIAL_RETURN">🔄 استرجاع جزئي</option>
                                        <option value="FULL_RETURN">↩ استرجاع كلي</option>
                                        <option value="CANCELLED">❌ ملغية</option>
                                    </>)}
                                    {typeFilter === 'PURCHASE' && (<>
                                        <option value="DONE">✅ مكتملة</option>
                                        <option value="PARTIAL_RETURN">🔄 استرجاع جزئي</option>
                                        <option value="FULL_RETURN">↩ استرجاع كلي</option>
                                    </>)}
                                    {typeFilter === 'RETURN' && (<>
                                        <option value="RETURN_SALE">🔄 استرجاع بيع</option>
                                        <option value="RETURN_PURCHASE">🔄 استرجاع شراء</option>
                                    </>)}
                                </select>
                            </div>

                            {typeFilter === 'SALE' && (<>
                                <div className="w-px h-4 bg-gray-200 mx-1 self-center"/>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase">نوع العميل:</span>
                                    <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-200">
                                        <button onClick={() => setCustomerTypeFilter('ALL')} className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${customerTypeFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>الكل</button>
                                        <button onClick={() => setCustomerTypeFilter('FIDEL')} className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${customerTypeFilter === 'FIDEL' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>👤 مسجل</button>
                                        <button onClick={() => setCustomerTypeFilter('GUEST')} className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${customerTypeFilter === 'GUEST' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>👥 عابر</button>
                                    </div>
                                </div>
                            </>)}
                        </div>
                    </div>

                    {/* Orders Table */}
                    <div className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden shadow-sm flex-1 print:border-none">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">رقم الطلبية</th>
                                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">التاريخ</th>
                                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">نوع الطلبية</th>
                                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">الجهة / المشروع</th>
                                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">المبلغ الإجمالي</th>
                                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">المبلغ الباقي</th>
                                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {currentOrders.map((order) => (
                                    <React.Fragment key={order.id}>
                                        <tr className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-8 rounded-full ${
                                                        order.type === 'SALE' ? 'bg-blue-500' : 
                                                        order.type === 'PURCHASE' ? 'bg-emerald-500' : 
                                                        order.type === 'RETURN_SALE' ? 'bg-rose-500' : 'bg-orange-500'
                                                    }`} />
                                                    <p className="text-sm font-black text-gray-900 font-sans">{order.orderNumber}</p>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Calendar size={14} />
                                                    <span className="text-xs font-bold font-sans">{formatDate(order.orderDate)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    order.type === 'SALE' ? 'bg-blue-50 text-blue-600' : 
                                                    order.type === 'PURCHASE' ? 'bg-emerald-50 text-emerald-600' : 
                                                    order.type === 'RETURN_SALE' ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-orange-600'
                                                }`}>
                                                    {order.type === 'SALE' ? 'بيع' : 
                                                     order.type === 'PURCHASE' ? 'شراء' : 
                                                     order.type === 'RETURN_SALE' ? 'إرجاع بيع' : 'إرجاع شراء'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <User size={14} className="text-gray-400" />
                                                        <p className="text-sm font-bold text-gray-800">
                                                            {(order.type === 'SALE' || order.type === 'RETURN_SALE')
                                                                ? (order.customer?.name || order.customerName || '---')
                                                                : (order.supplier?.name || order.customerName || '---')}
                                                        </p>
                                                    </div>
                                                    {order.project && (
                                                        <p className="text-[10px] font-black text-blue-600 mt-0.5 mr-6 uppercase tracking-tighter">مشروع: {order.project.name}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm font-black text-gray-900 font-sans">{order.total.toLocaleString()} <span className="text-[10px] text-gray-400">دج</span></p>
                                            </td>
                                            <td className="p-4">
                                                <p className={`text-sm font-black font-sans ${(order.invoice?.remaining || 0) > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                                    {(order.invoice?.remaining || 0).toLocaleString()} <span className="text-[10px] text-gray-400">دج</span>
                                                </p>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    order.status === 'DONE' ? 'bg-emerald-50 text-emerald-600' :
                                                    order.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                                                    order.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                                                    'bg-orange-50 text-orange-600'
                                                }`}>
                                                    {order.status === 'DONE' ? 'مكتملة' : 
                                                     order.status === 'PENDING' ? 'معلقة' : 
                                                     order.status === 'CANCELLED' ? 'ملغية' : 'مسترجعة'}
                                                </span>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                                {filteredOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="bg-gray-50 p-6 rounded-full text-gray-300">
                                                    <Search size={48} />
                                                </div>
                                                <p className="text-gray-400 font-black">لم يتم العثور على أي طلبيات</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm print:hidden">
                        <p className="text-xs font-bold text-gray-500">
                            عرض {Math.min(filteredOrders.length, itemsPerPage)} من أصل {filteredOrders.length} طلبية
                        </p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-2 hover:bg-gray-50 rounded-2xl disabled:opacity-30 transition-all border border-gray-100"
                            >
                                <ChevronUp className="-rotate-90" size={18} />
                            </button>
                            <div className="flex items-center px-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <span className="text-xs font-black text-gray-900 font-sans">{currentPage}</span>
                            </div>
                            <button 
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                disabled={currentPage * itemsPerPage >= filteredOrders.length}
                                className="p-2 hover:bg-gray-50 rounded-2xl disabled:opacity-30 transition-all border border-gray-100"
                            >
                                <ChevronDown className="-rotate-90" size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
