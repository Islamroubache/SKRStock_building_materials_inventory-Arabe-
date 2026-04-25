'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
    ShoppingBag, Plus, Search, Calendar, User, PackageOpen, LayoutGrid, 
    MoreVertical, Eye, Printer, FileDown, Table as TableIcon, XCircle, CheckCircle, FileSpreadsheet, ChevronDown, ChevronUp, Banknote, RotateCcw
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
    product: { name: string; unit: string };
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
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'SALE' | 'PURCHASE' | 'RETURN'>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'DONE' | 'PENDING' | 'CANCELLED' | 'PARTIAL_RETURN' | 'FULL_RETURN'>('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Expandable row state
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

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

    const handleUpdateStatus = async (orderId: number, newStatus: 'DONE' | 'CANCELLED') => {
        if (!confirm(`هل أنت متأكد من تغيير حالة الطلبية إلى ${newStatus === 'DONE' ? 'مكتملة' : 'ملغية'}؟`)) return;
        
        try {
            setLoading(true);
            const res = await fetch(`/api/orders/${orderId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                await fetchOrders();
            } else {
                const err = await res.json();
                alert(`خطأ: ${err.error}`);
                setLoading(false);
            }
        } catch (e) {
            console.error(e);
            alert('فشلت العملية');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // Derived stats
    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];

        let totalToday = 0;
        let pendingCount = 0;
        let salesTodayCount = 0;
        let purchasesTodayCount = 0;

        orders.forEach(o => {
            const dDate = new Date(o.orderDate);
            const oDate = dDate.toISOString().split('T')[0];

            if (oDate === today) {
                if (o.type === 'SALE') {
                    // Formula: grandTotal - remaining (If paid, remaining is 0)
                    const grandTotal = o.grandTotal || o.total || 0;
                    const isPaid = o.invoice?.status === 'PAID';
                    const remaining = isPaid ? 0 : (o.invoice?.remaining || 0);
                    totalToday += (grandTotal - remaining);
                    salesTodayCount++;
                } else if (o.type === 'PURCHASE') {
                    purchasesTodayCount++;
                }
            }
            
            if (o.status === 'PENDING') pendingCount++;
        });

        return { totalToday, pendingCount, salesTodayCount, purchasesTodayCount };
    }, [orders]);

    // Filtering logic
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch = 
                o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.customer?.name.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (o.supplier?.name.toLowerCase() || '').includes(searchTerm.toLowerCase());
            
            const matchesType = typeFilter === 'ALL' || 
                                (typeFilter === 'RETURN' ? (o.type === 'RETURN_SALE' || o.type === 'RETURN_PURCHASE') : o.type === typeFilter);
            const isPartiallyReturned = o.items.some(i => (i.returnedQuantity || 0) > 0) && o.items.some(i => (i.returnedQuantity || 0) < i.quantity);
            const isFullyReturned = o.items.length > 0 && o.items.every(i => (i.returnedQuantity || 0) >= i.quantity);

            let matchesStatus = false;
            if (statusFilter === 'ALL') {
                matchesStatus = true;
            } else if (statusFilter === 'PARTIAL_RETURN') {
                matchesStatus = isPartiallyReturned;
            } else if (statusFilter === 'FULL_RETURN') {
                matchesStatus = isFullyReturned;
            } else {
                matchesStatus = o.status === statusFilter;
            }

            let matchesDate = true;
            if (startDate || endDate) {
                const orderDate = new Date(o.orderDate).toISOString().split('T')[0];
                if (startDate && orderDate < startDate) matchesDate = false;
                if (endDate && orderDate > endDate) matchesDate = false;
            }

            return matchesSearch && matchesType && matchesStatus && matchesDate;
        });
    }, [orders, searchTerm, typeFilter, statusFilter, startDate, endDate]);

    // Pagination slice
    const currentOrders = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredOrders.slice(start, start + itemsPerPage);
    }, [filteredOrders, currentPage, itemsPerPage]);

    // Export to Excel
    const handleExportExcel = () => {
        const exportData = filteredOrders.map(o => {
            const finalBalance = o.grandTotal || o.total;
            const remainingDebt = o.invoice?.remaining !== undefined ? o.invoice.remaining : (finalBalance - (o.invoice?.paid || 0));
            
            // Translate payment method
            const method = o.invoice?.payments?.[0]?.paymentMethod || 'CASH';
            const methodMap: Record<string, string> = {
                'CASH': 'Espèces',
                'CHEQUE': 'Chèque',
                'BANK_TRANSFER': 'Virement',
                'CREDIT': 'Crédit'
            };

            return {
                'N° Commande': o.orderNumber,
                'Type': o.type === 'SALE' ? 'Vente' : o.type === 'PURCHASE' ? 'Achat' : 'Retour',
                'Date': formatDate(o.orderDate),
                'Client / Fournisseur': o.type.includes('SALE') ? (o.customer?.name || 'Client Divers') : (o.supplier?.name || 'Fournisseur Divers'),
                'Total Global (DZD)': finalBalance,
                'Mode de Paiement': methodMap[method] || method,
                'Reste à Payer (DZD)': remainingDebt,
                'Statut': o.status === 'DONE' ? 'Terminé' : (o.status === 'PENDING' ? 'En attente' : 'Annulé'),
            };
        });

        const worksheet = xlsx.utils.json_to_sheet(exportData);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Commandes');
        xlsx.writeFile(workbook, `commandes-${formatDate(new Date()).replace(/\//g, '-')}.xlsx`);
    };

    // Export to PDF
    const handleExportPDF = () => {
        exportOrdersToPDF(filteredOrders);
    };

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 flex flex-col gap-8" dir="rtl">
            <style jsx global>{`
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: #111825; }
                ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}</style>
            
            {/* HEADER SECTION */}
            <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600/20 p-3 rounded-2xl border border-blue-500/30">
                        <ShoppingBag size={28} className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">إدارة الطلبيات</h1>
                        <p className="text-gray-400 text-sm font-medium mt-1">متابعة كل عمليات البيع والشراء</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Link
                        href="/orders/new?type=SALE"
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3.5 rounded-2xl text-sm font-black transition-all shadow-lg shadow-blue-900/40 hover:scale-105 active:scale-95"
                    >
                        <Plus size={20} /> طلبية بيع
                    </Link>
                    <Link
                        href="/orders/new?type=PURCHASE"
                        className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-6 py-3.5 rounded-2xl text-sm font-black transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                    >
                        <PackageOpen size={20} /> طلبية شراء
                    </Link>
                </div>
            </div>

            {/* TOP STATS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16 transition-all group-hover:bg-blue-500/20"></div>
                    <p className="text-gray-400 text-sm font-bold flex items-center gap-2 mb-2">
                        إجمالي اليوم <LayoutGrid size={14} className="text-blue-400" />
                    </p>
                    <div className="flex items-end gap-3 font-sans">
                        <span className="text-3xl font-black text-gray-900">{stats.totalToday.toLocaleString()} دج</span>
                        <span className="text-green-400 text-sm mb-1 font-bold">🟢</span>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full -mr-16 -mt-16 transition-all group-hover:bg-amber-500/20"></div>
                    <p className="text-gray-400 text-sm font-bold flex items-center gap-2 mb-2">
                        طلبيات معلقة <PackageOpen size={14} className="text-amber-400" />
                    </p>
                    <div className="flex items-end gap-3 font-sans">
                        <span className="text-3xl font-black text-gray-900">{stats.pendingCount}</span>
                        <span className="text-amber-400 text-sm mb-1 font-bold">⏳</span>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16 transition-all group-hover:bg-indigo-500/20"></div>
                    <p className="text-gray-400 text-sm font-bold flex items-center gap-2 mb-2">
                        طلبيات البيع اليوم <ShoppingBag size={14} className="text-indigo-400" />
                    </p>
                    <div className="flex items-end gap-3 font-sans">
                        <span className="text-3xl font-black text-gray-900">{stats.salesTodayCount}</span>
                        <span className="text-indigo-400 text-sm mb-1 font-bold">طلبية</span>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16 transition-all group-hover:bg-emerald-500/20"></div>
                    <p className="text-gray-400 text-sm font-bold flex items-center gap-2 mb-2">
                        طلبيات الشراء اليوم <PackageOpen size={14} className="text-emerald-400" />
                    </p>
                    <div className="flex items-end gap-3 font-sans">
                        <span className="text-3xl font-black text-gray-900">{stats.purchasesTodayCount}</span>
                        <span className="text-emerald-400 text-sm mb-1 font-bold">طلبية</span>
                    </div>
                </div>
            </div>

            {/* ADVANCED FILTER BAR */}
            <div className="bg-white border border-gray-200 rounded-3xl p-2 shadow-lg flex flex-col xl:flex-row gap-2 xl:items-center justify-between">
                <div className="flex flex-col md:flex-row gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="ابحث برقم الطلبية أو اسم الجهة..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/50 border border-gray-300/50 rounded-2xl pl-4 pr-12 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/50 outline-none placeholder-gray-500 transition-all font-sans font-medium"
                        />
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 items-center bg-white/50 p-1 rounded-2xl border border-gray-300/50">
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-[10px] font-black text-gray-400">من</span>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-gray-700 outline-none border-none focus:ring-0 p-1"
                            />
                        </div>
                        <div className="w-px h-4 bg-gray-200 hidden md:block"></div>
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-[10px] font-black text-gray-400">إلى</span>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-gray-700 outline-none border-none focus:ring-0 p-1"
                            />
                        </div>
                    </div>
                    
                    <div className="flex p-1 bg-white/50 rounded-2xl border border-gray-300/50">
                        <button onClick={() => setTypeFilter('ALL')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${typeFilter === 'ALL' ? 'bg-gray-200 text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-800'}`}>الكل</button>
                        <button onClick={() => setTypeFilter('SALE')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${typeFilter === 'SALE' ? 'bg-blue-600/20 text-blue-400 shadow-md' : 'text-gray-400 hover:text-gray-800'}`}>🛒 مبيعات</button>
                        <button onClick={() => setTypeFilter('PURCHASE')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${typeFilter === 'PURCHASE' ? 'bg-green-600/20 text-green-400 shadow-md' : 'text-gray-400 hover:text-gray-800'}`}>📦 مشتريات</button>
                        <button onClick={() => setTypeFilter('RETURN')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${typeFilter === 'RETURN' ? 'bg-rose-600/20 text-rose-400 shadow-md' : 'text-gray-400 hover:text-gray-800'}`}>🔄 استرجاع</button>
                    </div>

                    <div className="flex p-1 bg-white/50 rounded-2xl border border-gray-300/50">
                        <button onClick={() => setStatusFilter('ALL')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === 'ALL' ? 'bg-gray-200 text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-800'}`}>الكل</button>
                        <button onClick={() => setStatusFilter('DONE')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${statusFilter === 'DONE' ? 'bg-emerald-600/20 text-emerald-400 shadow-md' : 'text-gray-400 hover:text-gray-800'}`}>✅ مكتملة</button>
                        <button onClick={() => setStatusFilter('PENDING')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${statusFilter === 'PENDING' ? 'bg-amber-600/20 text-amber-400 shadow-md' : 'text-gray-400 hover:text-gray-800'}`}>⏳ معلقة</button>
                        <button onClick={() => setStatusFilter('PARTIAL_RETURN')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${statusFilter === 'PARTIAL_RETURN' ? 'bg-orange-600/20 text-orange-400 shadow-md' : 'text-gray-400 hover:text-gray-800'}`}>🔄 استرجاع جزئي</button>
                        <button onClick={() => setStatusFilter('FULL_RETURN')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${statusFilter === 'FULL_RETURN' ? 'bg-rose-600/20 text-rose-400 shadow-md' : 'text-gray-400 hover:text-gray-800'}`}>✅ استرجاع كلي</button>
                        <button onClick={() => setStatusFilter('CANCELLED')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${statusFilter === 'CANCELLED' ? 'bg-red-600/20 text-red-400 shadow-md' : 'text-gray-400 hover:text-gray-800'}`}>❌ ملغية</button>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 p-2">
                    <button onClick={handleExportExcel} className="bg-white/50 hover:bg-gray-100 border border-gray-300/50 text-gray-700 px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2">
                        <FileSpreadsheet size={16} className="text-emerald-400" /> Excel
                    </button>
                    <button onClick={handleExportPDF} className="bg-white/50 hover:bg-gray-100 border border-gray-300/50 text-gray-700 px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2">
                        <FileDown size={16} className="text-rose-400" /> PDF
                    </button>
                    <button onClick={() => window.print()} className="bg-white/50 hover:bg-gray-100 border border-gray-300/50 text-gray-700 px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2">
                        <Printer size={16} className="text-blue-400" /> Imprimer
                    </button>
                    <button onClick={() => { setSearchTerm(''); setTypeFilter('ALL'); setStatusFilter('ALL'); setStartDate(''); setEndDate(''); }} className="bg-white/50 hover:bg-gray-100 border border-gray-300/50 text-gray-700 px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2">
                        ↺ إعادة تعيين
                    </button>
                </div>
            </div>

            {/* ORDERS TABLE */}
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-2xl flex-1 flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-white/50 border-b border-gray-200 text-gray-400 font-sans tracking-tight">
                            <tr>
                                <th className="px-6 py-5 font-black uppercase text-xs">رقم الطلبية</th>
                                <th className="px-6 py-5 font-black uppercase text-xs">النوع</th>
                                <th className="px-6 py-5 font-black uppercase text-xs">التاريخ</th>
                                <th className="px-6 py-5 font-black uppercase text-xs">العميل / المورد</th>
                                <th className="px-6 py-5 font-black uppercase text-xs">الرصيد النهائي</th>
                                <th className="px-6 py-5 font-black uppercase text-xs text-center">طريقة الدفع</th>
                                <th className="px-6 py-5 font-black uppercase text-xs text-center">الديون المتبقية</th>
                                <th className="px-6 py-5 font-black uppercase text-xs">الحالة</th>
                                <th className="px-6 py-5 text-center w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-24">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto opacity-50"></div>
                                        <p className="mt-4 text-gray-500 font-bold">جاري تحميل البيانات...</p>
                                    </td>
                                </tr>
                            ) : currentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-24">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-24 h-24 bg-gray-200/50 rounded-full flex justify-center items-center">
                                                <ShoppingBag size={40} className="text-gray-600" />
                                            </div>
                                            <h3 className="text-xl font-black text-gray-400">لا توجد طلبيات مطابقة</h3>
                                            <p className="text-gray-600 text-sm max-w-sm text-center">قم بإنشاء طلبية جديدة أو تعديل كلمات البحث لتظهر النتائج هنا.</p>
                                            <Link href="/orders/new" className="mt-2 bg-gray-200 hover:bg-gray-700 text-gray-900 px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-md">
                                                إنشاء طلبية جديدة
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentOrders.map(order => {
                                    const paid = order.invoice?.paid || 0;
                                    const isReturn = order.type === 'RETURN_SALE' || order.type === 'RETURN_PURCHASE';
                                    const remaining = isReturn ? 0 : (order.invoice?.remaining !== undefined ? order.invoice.remaining : (order.total - paid));
                                    
                                    // Calculate return status
                                    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
                                    const totalReturnedQty = order.items.reduce((sum, item) => sum + (item.returnedQuantity || 0), 0);
                                    const isFullyReturned = totalReturnedQty > 0 && totalReturnedQty === totalQty;
                                    const isPartiallyReturned = totalReturnedQty > 0 && totalReturnedQty < totalQty;
                                    
                                    return (
                                        <React.Fragment key={order.id}>
                                            <tr 
                                                className="hover:bg-white/50/50 transition-colors cursor-pointer group"
                                                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                            >
                                                <td className="px-6 py-5 font-black text-gray-900 font-sans tracking-widest">{order.orderNumber}</td>
                                                <td className="px-6 py-5">
                                                    {order.type === 'SALE' 
                                                        ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-blue-500/10 text-blue-400 border border-blue-500/20"><ShoppingBag size={12} /> بيع</span>
                                                        : order.type === 'PURCHASE'
                                                        ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><PackageOpen size={12} /> شراء</span>
                                                        : order.type === 'RETURN_SALE'
                                                        ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-rose-500/10 text-rose-500 border border-rose-500/20"><RotateCcw size={12} /> استرجاع بيع</span>
                                                        : <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-orange-500/10 text-orange-500 border border-orange-500/20"><RotateCcw size={12} /> استرجاع شراء</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-5 text-gray-400 flex items-center gap-2 font-sans font-medium">
                                                    <Calendar size={14} className="text-gray-600" />
                                                    <span>{formatDate(order.orderDate)}</span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-bold text-gray-800">
                                                            {(order.type === 'SALE' || order.type === 'RETURN_SALE')
                                                                ? (order.customer?.name || 'زبون عام')
                                                                : (order.supplier?.name || 'مورد عام')}
                                                        </span>
                                                        {order.project && <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 rounded-md w-fit">{order.project.name}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 font-black text-gray-900 font-sans tracking-tight">
                                                    {order.total.toLocaleString()} دج
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    {(() => {
                                                        const method = order.invoice?.payments?.[0]?.paymentMethod || 'CASH';
                                                        const map: Record<string, { label: string; color: string }> = {
                                                            CASH:          { label: '💵 نقداً',         color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
                                                            CHEQUE:        { label: '📄 شيك',           color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
                                                            BANK_TRANSFER: { label: '🏦 حوالة',         color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
                                                            CREDIT:        { label: '🔖 آجل',           color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
                                                        };
                                                        const m = map[method] || { label: method, color: 'bg-gray-200 text-gray-600 border-gray-300' };
                                                        return (
                                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black border ${m.color}`}>
                                                                {m.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    {remaining <= 0 ? (
                                                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">مسدد ✓</span>
                                                    ) : (
                                                        <span className="text-xs font-black text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 font-sans tracking-tight shrink-0 flex items-center justify-center min-w-fit gap-1">
                                                            {remaining.toLocaleString()} دج 🔴
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    {/* Status badge */}
                                                    {isFullyReturned ? (
                                                        <span className="px-3 py-1.5 rounded-lg text-xs font-black border inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-500 border-rose-500/20">
                                                            <RotateCcw size={12} /> استرجاع كلي
                                                        </span>
                                                    ) : isPartiallyReturned ? (
                                                        <span className="px-3 py-1.5 rounded-lg text-xs font-black border inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 border-amber-500/20">
                                                            <RotateCcw size={12} /> استرجاع جزئي
                                                        </span>
                                                    ) : (order.type === 'RETURN_SALE' || order.type === 'RETURN_PURCHASE') ? (
                                                        <span className="px-3 py-1.5 rounded-lg text-xs font-black border inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-500 border-rose-500/20">
                                                            <RotateCcw size={12} /> مسترجعة
                                                        </span>
                                                    ) : (
                                                        <span className={`px-3 py-1.5 rounded-lg text-xs font-black border inline-flex items-center gap-1.5
                                                            ${order.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                                            order.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                                                            'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                            {order.status === 'DONE' ? '✅ مكتمل' : order.status === 'PENDING' ? '⏳ معلق' : '❌ ملغي'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-center w-10">
                                                    <div className={`p-2 rounded-xl transition-colors ${expandedOrder === order.id ? 'bg-gray-200 text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}>
                                                        {expandedOrder === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* EXPANDABLE ROW CONTENT */}
                                            {expandedOrder === order.id && (
                                                <tr className="bg-gray-50 border-b border-gray-200 relative z-0">
                                                    <td colSpan={9} className="p-8 shadow-inner">
                                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <div className="lg:col-span-2">
                                                                <h4 className="text-gray-400 font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-4">
                                                                    <TableIcon size={14} /> تفاصيل المنتجات والمشتريات
                                                                </h4>
                                                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                                                    <table className="w-full text-right text-sm">
                                                                        <thead className="bg-white/50 border-b border-gray-200 text-gray-500 font-sans tracking-tight text-xs">
                                                                            <tr>
                                                                                <th className="px-4 py-3 font-bold">المنتج</th>
                                                                                <th className="px-4 py-3 font-bold">الكمية</th>
                                                                                <th className="px-4 py-3 font-bold text-left">سعر الوحدة</th>
                                                                                <th className="px-4 py-3 font-bold text-left">المجموع</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-800/50">
                                                                            {order.items.map(item => (
                                                                                <tr key={item.id} className="hover:bg-gray-200/30">
                                                                                    <td className="px-4 py-3 font-bold text-gray-800">{item.product.name}</td>
                                                                                    <td className="px-4 py-3 font-sans font-medium text-gray-400" dir="ltr">{item.quantity} {item.product.unit}</td>
                                                                                    <td className="px-4 py-3 font-sans font-bold text-gray-700 text-left" dir="ltr">{item.unitPrice.toLocaleString()}</td>
                                                                                    <td className="px-4 py-3 font-sans font-black text-blue-400 text-left" dir="ltr">{item.total.toLocaleString()} دج</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-4">
                                                                <div className="flex flex-col gap-2 p-5 bg-white border border-gray-200 rounded-2xl">
                                                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">إجراءات سريعة</p>
                                                                    {/* Return button — disabled only for already-return orders or fully-returned orders */}
                                                                    {(order.type === 'RETURN_SALE' || order.type === 'RETURN_PURCHASE' || isFullyReturned) ? (
                                                                        <span className="flex items-center gap-3 p-3 rounded-xl text-gray-300 border border-gray-100 mt-1 cursor-not-allowed font-bold text-sm select-none">
                                                                            <RotateCcw size={16} className="text-gray-300" />
                                                                            {order.type === 'SALE' ? 'استرجاع مبيعات (إعادة للمخزون)' : 'استرجاع مشتريات (إرجاع للمورد)'}
                                                                            <span className="mr-auto text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-md font-black">{isFullyReturned ? 'مسترجعة كلياً' : 'مستورجعة'}</span>
                                                                        </span>
                                                                    ) : order.status !== 'CANCELLED' ? (
                                                                        <Link
                                                                            href={`/orders/${order.id}/return`}
                                                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition-colors font-bold text-sm border border-rose-200/50 mt-1"
                                                                        >
                                                                            <RotateCcw size={16} className="text-rose-500" />
                                                                            {order.type === 'SALE' ? 'استرجاع مبيعات (إعادة للمخزون)' : 'استرجاع مشتريات (إرجاع للمورد)'}
                                                                            {isPartiallyReturned && <span className="mr-auto text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-md font-black">استرجاع بقية الكمية</span>}
                                                                        </Link>
                                                                    ) : null}
                                                                    {(order.type === 'SALE' || order.type === 'RETURN_SALE' || order.type === 'RETURN_PURCHASE') && (
                                                                        <button className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/20 text-gray-700 hover:text-gray-900 transition-colors font-bold text-sm text-right">
                                                                            <Printer size={16} className="text-purple-400" /> طباعة وصل استلام / فاتورة
                                                                        </button>
                                                                    )}
                                                                    {order.status === 'PENDING' && (
                                                                        <>
                                                                            <button onClick={() => handleUpdateStatus(order.id, 'DONE')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600 transition-colors font-bold text-sm text-right mt-2 border border-emerald-500/20">
                                                                                <CheckCircle size={16} /> تأكيد تسليم الطلبية (مكتملة)
                                                                            </button>
                                                                            <button onClick={() => handleUpdateStatus(order.id, 'CANCELLED')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition-colors font-bold text-sm text-right mt-2 border border-rose-500/20">
                                                                                <XCircle size={16} /> إلغاء هذه الطلبية تماماً والتراجع
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                {order.notes && (
                                                                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-amber-200 text-sm font-bold leading-relaxed">
                                                                        <span className="text-xs uppercase tracking-widest text-amber-500/70 block mb-1">ملاحظات</span>
                                                                        {order.notes}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION FOOTER */}
                {!loading && filteredOrders.length > 0 && (
                    <div className="p-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 mt-auto">
                        <div className="flex items-center gap-3 text-sm font-bold text-gray-400">
                            <span>عرض الإدخالات</span>
                            <select 
                                className="bg-white/50 border border-gray-300/50 rounded-lg px-2 py-1 text-gray-900 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-sans"
                                value={itemsPerPage} 
                                onChange={(e) => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span>عرض {Math.min((currentPage - 1) * itemsPerPage + 1, filteredOrders.length)} - {Math.min(currentPage * itemsPerPage, filteredOrders.length)} من أصـل {filteredOrders.length} طلبية</span>
                        </div>
                        
                        <div className="flex gap-1 font-sans">
                            <button 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="px-4 py-2 rounded-xl bg-white/50 text-gray-700 disabled:opacity-50 hover:bg-gray-200 transition-colors font-bold text-sm"
                            >
                                السابق
                            </button>
                            <div className="px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 font-black border border-blue-500/20 text-sm">
                                {currentPage}
                            </div>
                            <button 
                                disabled={currentPage * itemsPerPage >= filteredOrders.length}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="px-4 py-2 rounded-xl bg-white/50 text-gray-700 disabled:opacity-50 hover:bg-gray-200 transition-colors font-bold text-sm"
                            >
                                التالي
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <style jsx global>{`
                @media print {
                    nav, sidebar, .no-print, button, input, .xl\:flex-row {
                        display: none !important;
                    }
                    .bg-white {
                        box-shadow: none !important;
                        border: none !important;
                    }
                    body {
                        background: white !important;
                        padding: 0 !important;
                    }
                    .bg-gray-50 {
                        background: white !important;
                    }
                }
            `}</style>
        </div>
    );
}
