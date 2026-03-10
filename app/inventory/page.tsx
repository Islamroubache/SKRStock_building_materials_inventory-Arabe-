'use client';

import React, { useState, useEffect } from 'react';
import {
    Package, Search, AlertTriangle, Activity,
    ArrowDownRight, ArrowUpRight, CopyPlus, Filter,
    TrendingUp, Trash2, CheckCircle, RotateCcw,
    Calendar, User, FileText, DollarSign, PlusCircle, X
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Types
interface Product {
    id: number;
    code: string | null;
    name: string;
    category: string;
    quantity: number;
    minQuantity: number;
    unit: string;
    purchasePrice: number;
    avgPurchasePrice: number | null;
    sellPrice: number;
    expiryDate: string | null;
    hasExpiryDate: boolean;
    supplierId: number | null;
    supplier: { name: string } | null;
}

interface StockMovement {
    id: number;
    productId: number;
    movementType: string;
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
    unitCost: number | null;
    totalCost: number | null;
    reason: string | null;
    createdAt: string;
    product: { name: string; code: string | null; unit: string };
    supplierId: number | null;
    order: { orderNumber: string } | null;
}

interface DamagedProduct {
    id: number;
    productId: number;
    quantity: number;
    reason: string;
    damageType: string;
    unitCost: number;
    totalLoss: number;
    reportedBy: string | null;
    status: string;
    supplierRefund: boolean;
    refundAmount: number | null;
    supplierId: number | null;
    notes: string | null;
    createdAt: string;
    product: Product;
    supplier: { name: string } | null;
}

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<'movements' | 'overview' | 'cost' | 'damaged' | 'batches'>('overview');
    const [loading, setLoading] = useState(true);

    // Data states
    const [products, setProducts] = useState<Product[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [damaged, setDamaged] = useState<DamagedProduct[]>([]);
    const [batches, setBatches] = useState<any[]>([]);
    const [batchStats, setBatchStats] = useState<any>(null);
    const [damagedStats, setDamagedStats] = useState<any>(null);
    const [suppliers, setSuppliers] = useState<any[]>([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [moveTypeFilter, setMoveTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [supplierFilter, setSupplierFilter] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Modals
    const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [selectedDamageRecord, setSelectedDamageRecord] = useState<DamagedProduct | null>(null);

    // Form states
    const [newDamage, setNewDamage] = useState({
        productId: '',
        quantity: 0,
        reason: '',
        damageType: 'DAMAGED',
        supplierRefund: false,
        supplierId: '',
        refundAmount: 0,
        notes: ''
    });

    const [returnForm, setReturnForm] = useState({
        supplierId: '',
        refundAmount: 0,
        notes: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchTabContent();
    }, [activeTab, moveTypeFilter, statusFilter, typeFilter, supplierFilter, dateFrom, dateTo]);

    const fetchInitialData = async () => {
        try {
            const [pRes, sRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/suppliers')
            ]);
            if (pRes.ok) setProducts(await pRes.json());
            if (sRes.ok) setSuppliers(await sRes.json());
        } catch (e) {
            console.error(e);
        }
    };

    const fetchTabContent = async () => {
        setLoading(true);
        try {
            if (activeTab === 'movements' || activeTab === 'overview' || activeTab === 'cost') {
                const query = new URLSearchParams({
                    type: moveTypeFilter,
                    from: dateFrom,
                    to: dateTo,
                    supplierId: supplierFilter
                });
                const res = await fetch(`/api/inventory?${query.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (activeTab === 'overview' || activeTab === 'cost') setProducts(data.products);
                    if (activeTab === 'movements') setMovements(data.movements);
                }
            } else if (activeTab === 'damaged') {
                const query = new URLSearchParams({
                    status: statusFilter === 'ALL' ? '' : statusFilter,
                    damageType: typeFilter === 'ALL' ? '' : typeFilter,
                });
                const [dRes, sRes] = await Promise.all([
                    fetch(`/api/damaged?${query.toString()}`),
                    fetch('/api/damaged/stats')
                ]);
                if (dRes.ok) {
                    const data = await dRes.json();
                    setDamaged(data.records);
                }
                if (sRes.ok) setDamagedStats(await sRes.json());
            } else if (activeTab === 'batches') {
                const [bRes, sRes] = await Promise.all([
                    fetch('/api/batches/stats?list=true'),
                    fetch('/api/batches/stats')
                ]);
                if (bRes.ok) {
                    const bData = await bRes.json();
                    setBatches(bData.batches || []);
                }
                if (sRes.ok) setBatchStats(await sRes.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRecordDamage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDamage.productId || newDamage.quantity <= 0) return;

        const product = products.find(p => p.id === parseInt(newDamage.productId));
        if (!product) return;

        if (confirm(`⚠️ سيتم خصم ${newDamage.quantity} وحدة من المخزون\n الخسارة المسجّلة: ${(newDamage.quantity * (product.avgPurchasePrice || product.purchasePrice)).toLocaleString()} دج\n هل أنت متأكد؟`)) {
            try {
                const res = await fetch('/api/damaged', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newDamage)
                });
                if (res.ok) {
                    setIsDamageModalOpen(false);
                    setNewDamage({
                        productId: '', quantity: 0, reason: '', damageType: 'DAMAGED',
                        supplierRefund: false, supplierId: '', refundAmount: 0, notes: ''
                    });
                    fetchTabContent();
                    fetchInitialData();
                } else {
                    const err = await res.json();
                    alert(err.error);
                }
            } catch (e) {
                alert('حدث خطأ أثناء الحفظ');
            }
        }
    };

    const handleConfirmDamage = async (id: number) => {
        try {
            const res = await fetch(`/api/damaged/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CONFIRMED' })
            });
            if (res.ok) fetchTabContent();
        } catch (e) {
            console.error(e);
        }
    };

    const handleReturnToSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDamageRecord) return;

        try {
            const res = await fetch(`/api/damaged/${selectedDamageRecord.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'RETURNED_TO_SUPPLIER',
                    supplierId: returnForm.supplierId,
                    refundAmount: returnForm.refundAmount,
                    notes: returnForm.notes
                })
            });
            if (res.ok) {
                setIsReturnModalOpen(false);
                setSelectedDamageRecord(null);
                fetchTabContent();
            }
        } catch (e) {
            console.error(e);
        }
    };

    // UI Helpers
    const getDamageTypeBadge = (type: string) => {
        switch (type) {
            case 'DAMAGED': return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">تالف</span>;
            case 'EXPIRED': return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">منتهي</span>;
            case 'WITHDRAWN': return <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">مسحوب</span>;
            case 'LOST': return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">مفقود</span>;
            default: return null;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING': return <span className="flex items-center gap-1 text-amber-600 font-bold">⏳ قيد الانتظار</span>;
            case 'CONFIRMED': return <span className="flex items-center gap-1 text-blue-600 font-bold">✓ مؤكد</span>;
            case 'RETURNED_TO_SUPPLIER': return <span className="flex items-center gap-1 text-emerald-600 font-bold">↩️ مُرجع للمورد</span>;
            default: return null;
        }
    };

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-6 md:p-8 flex flex-col gap-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                    <Package className="text-emerald-600" /> إدارة المخزون
                </h1>

                <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm overflow-x-auto gap-1">
                    <button onClick={() => setActiveTab('overview')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>📦 المخزون الحالي</button>
                    <button onClick={() => setActiveTab('movements')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'movements' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>📊 حركة المخزون</button>
                    <button onClick={() => setActiveTab('batches')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'batches' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>🧱 نظام الدفعات</button>
                    <button onClick={() => setActiveTab('cost')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'cost' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>💰 تكلفة المخزون</button>
                    <button onClick={() => setActiveTab('damaged')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'damaged' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>⚠️ التالف والضياع</button>
                </div>
            </div>

            {/* Content Areas */}
            {activeTab === 'movements' && (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-white border border-gray-200 rounded-lg p-2 text-sm" />
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-white border border-gray-200 rounded-lg p-2 text-sm" />
                        <select value={moveTypeFilter} onChange={e => setMoveTypeFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg p-2 text-sm">
                            <option value="ALL">الكل</option>
                            <option value="IN">دخول 🟢</option>
                            <option value="OUT">خروج 🔴</option>
                            <option value="ADJUST">تعديل 🟡</option>
                        </select>
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="text" placeholder="بحث بالمنتج..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg pr-10 pl-3 py-2 text-sm" />
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 font-bold">التاريخ</th>
                                    <th className="px-4 py-3 font-bold">المنتج</th>
                                    <th className="px-4 py-3 font-bold">النوع</th>
                                    <th className="px-4 py-3 font-bold text-center">الكمية</th>
                                    <th className="px-4 py-3 font-bold text-center">سعر الوحدة</th>
                                    <th className="px-4 py-3 font-bold text-center">الإجمالي</th>
                                    <th className="px-4 py-3 font-bold text-center">رصيد بعد</th>
                                    <th className="px-4 py-3 font-bold">السبب/المستند</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (<tr><td colSpan={8} className="text-center py-10">جاري التحميل...</td></tr>) : movements.filter(m => m.product.name.includes(searchTerm)).map(m => (
                                    <tr key={m.id} className={`border-b border-gray-100 hover:bg-gray-50 ${m.movementType === 'IN' ? 'border-r-4 border-r-emerald-500' : m.movementType === 'OUT' ? 'border-r-4 border-r-red-500' : 'border-r-4 border-r-amber-500'}`}>
                                        <td className="px-4 py-4">{format(new Date(m.createdAt), 'yyyy-MM-dd HH:mm')}</td>
                                        <td className="px-4 py-4">
                                            <div className="font-bold">{m.product.name}</div>
                                            <div className="text-xs text-gray-500">{m.product.code}</div>
                                        </td>
                                        <td className="px-4 py-4 font-bold">
                                            {m.movementType === 'IN' ? <span className="text-emerald-600">دخول</span> : m.movementType === 'OUT' ? <span className="text-red-600">خروج</span> : 'تعديل'}
                                        </td>
                                        <td className="px-4 py-4 text-center font-bold text-lg">{m.quantity}</td>
                                        <td className="px-4 py-4 text-center">{(m.unitCost || 0).toLocaleString()} دج</td>
                                        <td className="px-4 py-4 text-center font-bold">{(m.totalCost || 0).toLocaleString()} دج</td>
                                        <td className="px-4 py-4 text-center font-bold text-blue-600">{m.quantityAfter}</td>
                                        <td className="px-4 py-4 text-gray-500">{m.order ? `طلب ${m.order.orderNumber}` : m.reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'overview' && (
                <div className="flex flex-col gap-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="بحث بالاسم أو الكود..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg pr-10 pl-3 py-2.5 text-sm" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-bold">الكود</th>
                                    <th className="px-4 py-3 font-bold">المنتج</th>
                                    <th className="px-4 py-3 font-bold">الفئة</th>
                                    <th className="px-4 py-3 font-bold text-center">الكمية</th>
                                    <th className="px-4 py-3 font-bold text-center">متوسط التكلفة</th>
                                    <th className="px-4 py-3 font-bold text-center">إجمالي القيمة</th>
                                    <th className="px-4 py-3 font-bold text-center">سعر البيع</th>
                                    <th className="px-4 py-3 font-bold text-center">الربح المتوقع</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.filter(p => p.name.includes(searchTerm) || (p.code && p.code.includes(searchTerm))).map(p => {
                                    const cost = p.avgPurchasePrice || p.purchasePrice;
                                    const profit = p.sellPrice - cost;
                                    const margin = (profit / cost) * 100;
                                    return (
                                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-4 text-gray-500">{p.code || '-'}</td>
                                            <td className="px-4 py-4 font-bold">{p.name}</td>
                                            <td className="px-4 py-4">{p.category}</td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`font-bold text-lg ${p.quantity <= p.minQuantity ? 'text-amber-600' : ''}`}>{p.quantity}</span> <span className="text-xs">{p.unit}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-blue-600">{cost.toLocaleString()} دج</td>
                                            <td className="px-4 py-4 text-center font-bold">{(cost * p.quantity).toLocaleString()} دج</td>
                                            <td className="px-4 py-4 text-center font-bold text-emerald-600">{p.sellPrice.toLocaleString()} دج</td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="font-bold text-emerald-700">{Math.round(margin)}%</div>
                                                <div className="text-[10px] text-gray-400">({(profit * p.quantity).toLocaleString()} دج)</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'cost' && (
                <div className="flex flex-col gap-6">
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex justify-between items-center">
                        <div>
                            <div className="text-sm text-emerald-700">إجمالي قيمة المستودع الحالية</div>
                            <div className="text-2xl font-black text-emerald-900">
                                {products.reduce((sum, p) => sum + (p.quantity * (p.avgPurchasePrice || p.purchasePrice)), 0).toLocaleString()} دج
                            </div>
                        </div>
                        <Activity className="text-emerald-500" size={32} />
                    </div>
                    {products.map(p => (
                        <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="p-4 flex justify-between items-center bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border">
                                        <Package className="text-gray-400" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{p.name}</h3>
                                        <p className="text-xs text-gray-500">متوسط سعر الشراء الحالي: <span className="font-bold text-blue-600">{(p.avgPurchasePrice || p.purchasePrice).toLocaleString()} دج</span></p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500">إجمالي قيمة الكمية المتوفرة ({p.quantity} {p.unit})</div>
                                    <div className="font-bold text-lg text-gray-900">{(p.quantity * (p.avgPurchasePrice || p.purchasePrice)).toLocaleString()} دج</div>
                                </div>
                            </div>
                            <div className="p-4 text-center text-gray-400 text-xs italic">
                                يتم احتساب التكلفة بناءً على طريقة المتوسط المرجح (Weighted Average) لكل عمليات التوريد.
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'batches' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Batch Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Package size={24} /></div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1">إجمالي الدفعات النشطة</p>
                                <h3 className="text-2xl font-black text-gray-900">{batchStats?.activeBatches || 0}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle size={24} /></div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1">دفعات تنتهي قريباً</p>
                                <h3 className="text-2xl font-black text-amber-600">{batchStats?.expiringSoon || 0}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Trash2 size={24} /></div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1">دفعات منتهية الصلاحية</p>
                                <h3 className="text-2xl font-black text-red-600">{batchStats?.expired || 0}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign size={24} /></div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1">قيمة المخزون المنتهي</p>
                                <h3 className="text-2xl font-black text-emerald-600">{batchStats?.totalLossValue?.toLocaleString() || 0} <span className="text-xs font-normal">دج</span></h3>
                            </div>
                        </div>
                    </div>

                    {/* Batches Table */}
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Activity size={18} className="text-blue-600" />
                                جميع دفعات المنتجات (FIFO)
                            </h3>
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    await fetch('/api/batches/expiry-check', { method: 'POST' });
                                    fetchTabContent();
                                }}
                                className="text-xs font-bold bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <RotateCcw size={14} /> تحديث حالة الصلاحية
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-50/50 text-gray-600 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">المنتج</th>
                                        <th className="px-6 py-4 font-bold">رقم الدفعة</th>
                                        <th className="px-6 py-4 font-bold">تاريخ الانتهاء</th>
                                        <th className="px-6 py-4 font-bold">الكمية المتبقية</th>
                                        <th className="px-6 py-4 font-bold text-center">التكلفة</th>
                                        <th className="px-6 py-4 font-bold text-center">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={6} className="text-center py-20 text-gray-400 font-bold">جاري التحميل...</td></tr>
                                    ) : batches.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold">لاتوجد دفعات مسجلة</td>
                                        </tr>
                                    ) : (
                                        batches.map((b: any) => {
                                            const isExpired = b.expiryDate && new Date(b.expiryDate) < new Date();
                                            const isExpiring = b.expiryDate && new Date(b.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                                            return (
                                                <tr key={b.id} className={`hover:bg-blue-50/30 transition-colors ${b.status === 'EXPIRED' || isExpired ? 'bg-red-50/30' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-900">{b.product?.name}</span>
                                                            <span className="text-[10px] text-gray-500 font-mono">{b.product?.code}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono font-bold text-blue-600">{b.batchNumber}</td>
                                                    <td className="px-6 py-4">
                                                        {b.expiryDate ? (
                                                            <div className="flex items-center gap-2">
                                                                <Calendar size={14} className={isExpired ? 'text-red-500' : isExpiring ? 'text-amber-500' : 'text-gray-400'} />
                                                                <span className={`font-bold ${isExpired ? 'text-red-600' : isExpiring ? 'text-amber-600' : 'text-gray-700'}`}>
                                                                    {format(new Date(b.expiryDate), 'dd/MM/yyyy')}
                                                                </span>
                                                            </div>
                                                        ) : '---'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-black text-gray-900 text-base">{b.remainingQty}</span>
                                                        <span className="text-[10px] text-gray-500 mr-1">{b.product?.unit}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-emerald-600">
                                                        {b.unitCost?.toLocaleString()} دج
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black tracking-tight border
                                                            ${b.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                b.status === 'DEPLETED' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                                                    'bg-red-100 text-red-700 border-red-200'}`}>
                                                            {b.status === 'ACTIVE' ? 'نشط' : b.status === 'DEPLETED' ? 'منتهي' : 'منتهي الصلاحية'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'damaged' && (
                <div className="flex flex-col gap-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border-r-4 border-r-red-500 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-red-50 rounded-lg"><TrendingUp className="text-red-500" size={20} /></div>
                                <span className="text-xs font-bold text-red-500">هذا الشهر</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-1">إجمالي الخسائر</div>
                            <div className="text-xl font-bold text-gray-900">{(damagedStats?.totalLossThisMonth || 0).toLocaleString()} دج</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border-r-4 border-r-red-600 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-red-50 rounded-lg"><Activity className="text-red-600" size={20} /></div>
                                <span className="text-xs font-bold text-red-600">هذا العام</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-1">إجمالي الخسائر السنوية</div>
                            <div className="text-xl font-bold text-gray-900">{(damagedStats?.totalLossThisYear || 0).toLocaleString()} دج</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border-r-4 border-r-emerald-500 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-emerald-50 rounded-lg"><DollarSign className="text-emerald-500" size={20} /></div>
                                <span className="text-xs font-bold text-emerald-500">المسترد</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-1">مبالغ مستردة من الموردين</div>
                            <div className="text-xl font-bold text-gray-900">{(damagedStats?.totalRecovered || 0).toLocaleString()} دج</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border-r-4 border-r-amber-500 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-amber-50 rounded-lg"><Calendar className="text-amber-500" size={20} /></div>
                                <span className="text-xs font-bold text-amber-500">قيد المعالجة</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-1">بانتظار القرار أو الإرجاع</div>
                            <div className="text-xl font-bold text-gray-900">{damaged.filter(d => d.status === 'PENDING').length} سجلات</div>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-white border rounded-lg p-2 text-sm flex-1 md:w-40">
                                <option value="ALL">كل أنواع المشاكل</option>
                                <option value="DAMAGED">تالف</option>
                                <option value="EXPIRED">منتهي الصلاحية</option>
                                <option value="WITHDRAWN">مسحوب</option>
                                <option value="LOST">مفقود</option>
                            </select>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border rounded-lg p-2 text-sm flex-1 md:w-40">
                                <option value="ALL">كل الحالات</option>
                                <option value="PENDING">قيد الانتظار</option>
                                <option value="CONFIRMED">مؤكد</option>
                                <option value="RETURNED_TO_SUPPLIER">مُرجع للمورد</option>
                            </select>
                        </div>
                        <button onClick={() => setIsDamageModalOpen(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-red-200 transition-all w-full md:w-auto justify-center">
                            <PlusCircle size={20} /> تسجيل تلف أو سحب
                        </button>
                    </div>

                    {/* Damaged List */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-bold">التاريخ</th>
                                    <th className="px-4 py-3 font-bold">المنتج</th>
                                    <th className="px-4 py-3 font-bold text-center">الكمية</th>
                                    <th className="px-4 py-3 font-bold text-center">التوع</th>
                                    <th className="px-4 py-3 font-bold text-center">الخسارة</th>
                                    <th className="px-4 py-3 font-bold text-center">المورد</th>
                                    <th className="px-4 py-3 font-bold text-center">الحالة</th>
                                    <th className="px-4 py-3 font-bold text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (<tr><td colSpan={8} className="text-center py-10">جاري التحميل...</td></tr>)}
                                {!loading && damaged.length === 0 && (<tr><td colSpan={8} className="text-center py-10 text-gray-400">لا توجد سجلات تالفة حالياً</td></tr>)}
                                {damaged.map(d => (
                                    <tr key={d.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-4">{format(new Date(d.createdAt), 'yyyy-MM-dd')}</td>
                                        <td className="px-4 py-4">
                                            <div className="font-bold">{d.product.name}</div>
                                            <div className="text-[10px] text-gray-400">{d.reason}</div>
                                        </td>
                                        <td className="px-4 py-4 text-center font-bold">{d.quantity} <span className="text-xs font-normal">{d.product.unit}</span></td>
                                        <td className="px-4 py-4 text-center">{getDamageTypeBadge(d.damageType)}</td>
                                        <td className="px-4 py-4 text-center font-bold text-red-600">{d.totalLoss.toLocaleString()} دج</td>
                                        <td className="px-4 py-4 text-center text-gray-500">{d.supplier?.name || '-'}</td>
                                        <td className="px-4 py-4 text-center">{getStatusBadge(d.status)}</td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {d.status === 'PENDING' && (
                                                    <button onClick={() => handleConfirmDamage(d.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="تأكيد">
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}
                                                {d.status === 'CONFIRMED' && d.supplierRefund && (
                                                    <button onClick={() => { setSelectedDamageRecord(d); setReturnForm({ supplierId: String(d.supplierId || ''), refundAmount: d.totalLoss, notes: '' }); setIsReturnModalOpen(true); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="إرجاع للمورد">
                                                        <RotateCcw size={18} />
                                                    </button>
                                                )}
                                                <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="تفاصيل">
                                                    <FileText size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Record Damage Modal */}
            {isDamageModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Trash2 className="text-red-500" /> تسجيل تلف أو سحب بضاعة</h2>
                            <button onClick={() => setIsDamageModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X /></button>
                        </div>
                        <form onSubmit={handleRecordDamage} className="p-6 flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-bold">المنتج*</label>
                                    <select required value={newDamage.productId} onChange={e => {
                                        const p = products.find(prod => prod.id === parseInt(e.target.value));
                                        setNewDamage({ ...newDamage, productId: e.target.value, supplierId: String(p?.supplierId || '') });
                                    }} className="bg-white border rounded-lg p-2.5 text-sm">
                                        <option value="">اختر المنتج...</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (متوفر: {p.quantity})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-bold">الكمية*</label>
                                    <input required type="number" value={newDamage.quantity} onChange={e => setNewDamage({ ...newDamage, quantity: parseInt(e.target.value) || 0 })} className="bg-white border rounded-lg p-2.5 text-sm" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-bold">التوع*</label>
                                    <select required value={newDamage.damageType} onChange={e => setNewDamage({ ...newDamage, damageType: e.target.value })} className="bg-white border rounded-lg p-2.5 text-sm">
                                        <option value="DAMAGED">🔴 تالف (فيزيائياً)</option>
                                        <option value="EXPIRED">🟠 منتهي الصلاحية</option>
                                        <option value="WITHDRAWN">🟡 مسحوب (بقرار)</option>
                                        <option value="LOST">⚫ مفقود / سرقة</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-bold">السبب*</label>
                                    <input required type="text" placeholder="مثلاً: كسر أثناء النقل" value={newDamage.reason} onChange={e => setNewDamage({ ...newDamage, reason: e.target.value })} className="bg-white border rounded-lg p-2.5 text-sm" />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-red-50 p-4 rounded-xl border border-red-100">
                                <DollarSign className="text-red-500" />
                                <div className="flex-1">
                                    <div className="text-xs text-red-600">الخسارة المحتملة</div>
                                    <div className="text-lg font-black text-red-700">
                                        {((newDamage.quantity || 0) * (products.find(p => p.id === parseInt(newDamage.productId))?.avgPurchasePrice || products.find(p => p.id === parseInt(newDamage.productId))?.purchasePrice || 0)).toLocaleString()} دج
                                    </div>
                                </div>
                                <div className="text-left text-[10px] text-red-400">بناءً على متوسط سعر الشراء</div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="refund" checked={newDamage.supplierRefund} onChange={e => setNewDamage({ ...newDamage, supplierRefund: e.target.checked })} className="w-4 h-4 accent-red-600" />
                                <label htmlFor="refund" className="text-sm font-bold">هل يمكن استرجاع القيمة من المورد؟</label>
                            </div>

                            {newDamage.supplierRefund && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-bold">المورد</label>
                                        <select value={newDamage.supplierId} onChange={e => setNewDamage({ ...newDamage, supplierId: e.target.value })} className="bg-white border rounded-lg p-2.5 text-sm">
                                            <option value="">اختر المورد...</option>
                                            {suppliers.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-bold">مبلغ الاسترداد المتوقع</label>
                                        <input type="number" value={newDamage.refundAmount} onChange={e => setNewDamage({ ...newDamage, refundAmount: parseFloat(e.target.value) || 0 })} className="bg-white border rounded-lg p-2.5 text-sm" />
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold">ملاحظات إضافية</label>
                                <textarea value={newDamage.notes} onChange={e => setNewDamage({ ...newDamage, notes: e.target.value })} className="bg-white border rounded-lg p-2.5 text-sm min-h-[80px]" />
                            </div>

                            <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-100 transition-all mt-2">
                                حفظ السجل وخصم المخزون
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Return to Supplier Modal */}
            {isReturnModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2"><RotateCcw className="text-emerald-500" /> إرجاع للمورد</h2>
                            <button onClick={() => setIsReturnModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X /></button>
                        </div>
                        <form onSubmit={handleReturnToSupplier} className="p-6 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold">المورد</label>
                                <select required value={returnForm.supplierId} onChange={e => setReturnForm({ ...returnForm, supplierId: e.target.value })} className="bg-white border rounded-lg p-2.5 text-sm">
                                    <option value="">اختر المورد...</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold">المبلغ المسترد</label>
                                <input required type="number" value={returnForm.refundAmount} onChange={e => setReturnForm({ ...returnForm, refundAmount: parseFloat(e.target.value) || 0 })} className="bg-white border rounded-lg p-2.5 text-sm" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold">ملاحظات</label>
                                <textarea value={returnForm.notes} onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })} className="bg-white border rounded-lg p-2.5 text-sm min-h-[80px]" />
                            </div>
                            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
                                تأكيد الإرجاع وتحديث حساب المورد
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
