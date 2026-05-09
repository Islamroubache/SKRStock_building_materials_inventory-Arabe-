'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
    ShoppingBag, Plus, Search, Calendar, User, PackageOpen, LayoutGrid, 
    MoreVertical, Eye, Printer, FileDown, FileText, Table as TableIcon, XCircle, CheckCircle, FileSpreadsheet, ChevronDown, ChevronUp, Banknote, RotateCcw, Download, Users
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import * as xlsx from 'xlsx';
import { exportOrdersToPDF } from '@/lib/export-orders-pdf';
import { printDocument } from '@/lib/print-helper';
import PageHeader from '@/components/PageHeader';
import DateRangePicker from '@/components/DateRangePicker';

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
    customerId?: number | null;
    supplierId?: number | null;
    projectId?: number | null;
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
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    
    // Expandable row state
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(40);
    // View toggle
    const [showList, setShowList] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        if (activeDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown]);

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
                (order.customerName || '').toLowerCase().includes(searchLower) ||
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
        <div className="font-tajawal min-h-screen bg-white text-gray-900 flex flex-col gap-4 print:p-0 print:bg-white" dir="rtl">
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
                    <PageHeader 
                        title="إدارة الطلبيات" 
                        subtitle="تتبع المبيعات والمشتريات وإدارة المخزون" 
                        Icon={ShoppingBag} 
                    />

                    {/* Two Big Action Buttons */}
                    <div className="flex flex-col items-center gap-6 pt-12">
                        <p className="text-gray-400 font-black text-sm uppercase tracking-widest">اختر نوع الطلبية</p>
                        <div className="flex flex-col sm:flex-row gap-5 w-full max-w-xl">
                            <Link
                                href="/orders/new?type=SALE"
                                className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-3xl py-10 px-6 shadow-xl shadow-violet-100 hover:shadow-violet-200 hover:scale-[1.03] active:scale-95 transition-all duration-200 group"
                            >
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-all">
                                    <ShoppingBag size={32} className="text-white" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-black">طلبية بيع</p>
                                    <p className="text-violet-100 text-xs font-medium mt-1">إنشاء فاتورة بيع جديدة</p>
                                </div>
                            </Link>
                            <Link
                                href="/orders/new?type=PURCHASE"
                                className="flex-1 flex flex-col items-center justify-center gap-3 bg-white border-2 border-gray-100 hover:border-gray-200 text-gray-900 rounded-3xl py-10 px-6 shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-95 transition-all duration-200 group"
                            >
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-gray-100 transition-all">
                                    <PackageOpen size={32} className="text-[#8b5cf6]" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-black">طلبية شراء</p>
                                    <p className="text-gray-400 text-xs font-medium mt-1">تسجيل طلبية شراء جديدة</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Bottom Button: Show Orders List */}
                    <div className="flex justify-center pb-4">
                        <button
                            onClick={() => setShowList(true)}
                            className="flex items-center gap-3 bg-[#fbb815] hover:bg-[#f59e0b] text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-amber-100 hover:shadow-amber-200 hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                            <Eye size={18} />
                            سجل الطلبيات
                            <ChevronDown size={16} className="opacity-80" />
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
                                <h1 className="text-xl font-black text-[#8b5cf6]">سجل الطلبيات</h1>
                                <p className="text-[#fbb815] text-xs font-bold">{filteredOrders.length} طلبية تم العثور عليها</p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full lg:w-auto justify-end">
                            <div className="relative group">
                                <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-black text-xs shadow-sm flex items-center gap-2 hover:bg-gray-50">
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
                                onClick={() => printDocument()}
                                className="bg-[#8b5cf6] text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-[#7c3aed] transition-all shadow-lg active:scale-95"
                            >
                                <Printer size={16} /> طباعة القائمة
                            </button>
                        </div>
                    </div>
                    {/* Tabs Header */}
                    <div className="flex items-center gap-6 no-print mb-2">
                        <button
                            onClick={() => { setTypeFilter('SALE'); setStatusFilter('ALL'); setCustomerTypeFilter('ALL'); }}
                            className={`px-4 py-3 text-sm font-black transition-all flex items-center gap-2 ${typeFilter === 'SALE' ? 'text-[#8b5cf6]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            مبيعات
                        </button>
                        <button
                            onClick={() => { setTypeFilter('PURCHASE'); setStatusFilter('ALL'); setCustomerTypeFilter('ALL'); }}
                            className={`px-4 py-3 text-sm font-black transition-all flex items-center gap-2 ${typeFilter === 'PURCHASE' ? 'text-[#8b5cf6]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            مشتريات
                        </button>
                        <button
                            onClick={() => { setTypeFilter('RETURN'); setStatusFilter('ALL'); setCustomerTypeFilter('ALL'); }}
                            className={`px-4 py-3 text-sm font-black transition-all flex items-center gap-2 ${typeFilter === 'RETURN' ? 'text-[#8b5cf6]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            استرجاع
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm flex flex-col gap-4 print:hidden">
                        <div className="flex flex-col lg:flex-row gap-3 items-center">
                            {/* Search (Widest) */}
                            <div className="relative flex-1 min-w-[300px] group">
                                <input 
                                    type="text" 
                                    placeholder="ابحث برقم الطلبية أو اسم الجهة..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className="w-full h-[52px] bg-white border border-gray-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10 rounded-2xl pr-14 pl-4 text-sm font-bold transition-all outline-none shadow-sm"
                                />
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-[#8b5cf6] rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none group-focus-within:scale-110 transition-transform">
                                    <Search size={20} strokeWidth={3} />
                                </div>
                            </div>

                            {/* Status Filter Button */}
                            <div className="relative group min-w-[160px]">
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                                    className="w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                                >
                                    <div className="bg-[#8b5cf6]/10 p-1.5 rounded-lg text-[#8b5cf6]">
                                        <FileText size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">حالة الطلبية</p>
                                        <p className="text-[10px] font-black text-gray-900 mt-1">
                                            {statusFilter === 'ALL' ? 'الكل' : 
                                             statusFilter === 'DONE' ? 'مكتملة' : 
                                             statusFilter === 'PENDING' ? 'معلقة' :
                                             statusFilter === 'PARTIAL_RETURN' ? 'استرجاع جزئي' :
                                             statusFilter === 'FULL_RETURN' ? 'استرجاع كلي' :
                                             statusFilter === 'CANCELLED' ? 'ملغية' : 
                                             statusFilter === 'RETURN_SALE' ? 'استرجاع بيع' :
                                             statusFilter === 'RETURN_PURCHASE' ? 'استرجاع شراء' : statusFilter}
                                        </p>
                                    </div>
                                    <ChevronDown size={14} className={`text-gray-300 transition-transform ${activeDropdown === 'status' ? 'rotate-180' : ''}`} />
                                </button>
                                
                                    {activeDropdown === 'status' && (
                                        <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 py-2 animate-in zoom-in-95 duration-200">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setStatusFilter('ALL'); setActiveDropdown(null); }} 
                                                className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${statusFilter === 'ALL' ? 'bg-[#3F13F0]/10 text-[#3F13F0]' : 'hover:bg-gray-50 text-gray-700'}`}
                                            >
                                                الكل
                                            </button>
                                            {typeFilter === 'SALE' && (<>
                                                <button onClick={(e) => { e.stopPropagation(); setStatusFilter('DONE'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${statusFilter === 'DONE' ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-emerald-50/50 text-emerald-600'}`}>مكتملة</button>
                                                <button onClick={(e) => { e.stopPropagation(); setStatusFilter('PENDING'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${statusFilter === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'hover:bg-amber-50/50 text-amber-600'}`}>معلقة</button>
                                                <button onClick={(e) => { e.stopPropagation(); setStatusFilter('PARTIAL_RETURN'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${statusFilter === 'PARTIAL_RETURN' ? 'bg-blue-50 text-blue-600' : 'hover:bg-blue-50/50 text-blue-600'}`}>استرجاع جزئي</button>
                                                <button onClick={(e) => { e.stopPropagation(); setStatusFilter('FULL_RETURN'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${statusFilter === 'FULL_RETURN' ? 'bg-rose-50 text-rose-600' : 'hover:bg-rose-50/50 text-rose-600'}`}>استرجاع كلي</button>
                                                <button onClick={(e) => { e.stopPropagation(); setStatusFilter('CANCELLED'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${statusFilter === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'hover:bg-gray-50 text-gray-500'}`}>ملغية</button>
                                            </>)}
                                            {typeFilter === 'PURCHASE' && (<>
                                                <button onClick={(e) => { e.stopPropagation(); setStatusFilter('DONE'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${statusFilter === 'DONE' ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-emerald-50/50 text-emerald-600'}`}>مكتملة</button>
                                                <button onClick={(e) => { e.stopPropagation(); setStatusFilter('PARTIAL_RETURN'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${statusFilter === 'PARTIAL_RETURN' ? 'bg-blue-50 text-blue-600' : 'hover:bg-blue-50/50 text-blue-600'}`}>استرجاع جزئي</button>
                                                <button onClick={(e) => { e.stopPropagation(); setStatusFilter('FULL_RETURN'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${statusFilter === 'FULL_RETURN' ? 'bg-rose-50 text-rose-600' : 'hover:bg-rose-50/50 text-rose-600'}`}>استرجاع كلي</button>
                                            </>)}
                                            {typeFilter === 'RETURN' && (<>
                                                <button onClick={(e) => { e.stopPropagation(); setStatusFilter('RETURN_SALE'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${statusFilter === 'RETURN_SALE' ? 'bg-blue-50 text-blue-600' : 'hover:bg-blue-50/50 text-blue-600'}`}>استرجاع بيع</button>
                                                <button onClick={(e) => { e.stopPropagation(); setStatusFilter('RETURN_PURCHASE'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${statusFilter === 'RETURN_PURCHASE' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-indigo-50/50 text-indigo-600'}`}>استرجاع شراء</button>
                                            </>)}
                                        </div>
                                    )}
                                </div>

                                {typeFilter === 'SALE' && (
                                    <div className="relative group min-w-[160px]">
                                        <button
                                            onClick={() => setActiveDropdown(activeDropdown === 'customer' ? null : 'customer')}
                                            className="w-full h-[52px] flex items-center gap-3 bg-[#fbb815] text-white border border-[#fbb815] rounded-2xl px-4 shadow-lg shadow-amber-100 hover:bg-[#f59e0b] transition-all text-right"
                                        >
                                            <div className="bg-white/20 p-1.5 rounded-lg text-white shadow-sm group-hover:scale-110 transition-transform">
                                                <Users size={14} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[9px] font-black text-amber-50 uppercase tracking-tighter leading-none">نوع العميل</p>
                                                <p className="text-[10px] font-black text-white mt-1">
                                                    {customerTypeFilter === 'ALL' ? 'الكل' : 
                                                     customerTypeFilter === 'FIDEL' ? 'مسجل' : 'عابر'}
                                                </p>
                                            </div>
                                            <ChevronDown size={14} className={`text-amber-50 transition-transform ${activeDropdown === 'customer' ? 'rotate-180' : ''}`} />
                                        </button>

                                        {activeDropdown === 'customer' && (
                                            <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 py-2 animate-in zoom-in-95 duration-200">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setCustomerTypeFilter('ALL'); setActiveDropdown(null); }} 
                                                    className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${customerTypeFilter === 'ALL' ? 'bg-amber-50 text-[#fbb815]' : 'hover:bg-gray-50 text-gray-700'}`}
                                                >
                                                    الكل
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setCustomerTypeFilter('FIDEL'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${customerTypeFilter === 'FIDEL' ? 'bg-blue-50 text-blue-600' : 'hover:bg-blue-50/50 text-blue-600'}`}>مسجل</button>
                                                <button onClick={(e) => { e.stopPropagation(); setCustomerTypeFilter('GUEST'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${customerTypeFilter === 'GUEST' ? 'bg-purple-50 text-purple-600' : 'hover:bg-purple-50/50 text-purple-600'}`}>عابر</button>
                                            </div>
                                        )}
                                    </div>
                                )}

                            {/* Date Filter (Last) */}
                            <DateRangePicker 
                                startDate={startDate}
                                endDate={endDate}
                                onChange={(start, end) => { setStartDate(start); setEndDate(end); }}
                            />
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
                                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                        {typeFilter === 'SALE' ? 'الزبون / المشروع' : 
                                         typeFilter === 'PURCHASE' ? 'المورد / الشريك' : 
                                         'الجهة / المرجع'}
                                    </th>
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
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white px-8 py-6 rounded-[2rem] border border-gray-100 shadow-sm print:hidden mt-4">
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center">
                                    <ShoppingBag size={14} className="text-blue-500" />
                                </div>
                            </div>
                            <p className="text-xs font-black text-gray-500">
                                عرض <span className="text-gray-900 font-sans">{(currentPage - 1) * itemsPerPage + 1}</span> إلى <span className="text-gray-900 font-sans">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> من أصل <span className="text-[#8b5cf6] font-sans">{filteredOrders.length}</span> طلبية
                            </p>
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100">
                            <button 
                                onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={currentPage === 1}
                                className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 rounded-xl disabled:opacity-30 transition-all border border-gray-100 shadow-sm disabled:cursor-not-allowed group"
                            >
                                <ChevronUp className="-rotate-90 group-active:scale-90 transition-transform" size={18} />
                            </button>
                            
                            <div className="flex items-center gap-1 px-4">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">الصفحة</span>
                                <span className="text-sm font-black text-[#8b5cf6] font-sans px-2">{currentPage}</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">من</span>
                                <span className="text-sm font-black text-gray-900 font-sans px-2">{Math.ceil(filteredOrders.length / itemsPerPage) || 1}</span>
                            </div>

                            <button 
                                onClick={() => { setCurrentPage(prev => prev + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={currentPage * itemsPerPage >= filteredOrders.length}
                                className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 rounded-xl disabled:opacity-30 transition-all border border-gray-100 shadow-sm disabled:cursor-not-allowed group"
                            >
                                <ChevronDown className="-rotate-90 group-active:scale-90 transition-transform" size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
