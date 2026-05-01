'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Search, Plus, Edit, Activity, Trash2, X, AlertTriangle, CheckCircle, Package, AlertCircle, Printer, FileText, Table as TableIcon, Calendar, ChevronDown, Download, Archive } from 'lucide-react';
import { exportProductsToExcel } from '@/lib/export-products';
import { exportProductsToPDF } from '@/lib/export-products-pdf';
import { getExpiryStatus, getDaysRemaining } from '@/lib/product-helpers';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

interface Supplier {
    id: number;
    name: string;
}

interface Product {
    id: number;
    code: string | null;
    name: string;
    category: string;
    purchasePrice: number;
    sellPrice: number;
    quantity: number;
    minQuantity: number;
    unit: string;
    supplierId: number | null;
    supplier?: Supplier;
    expiryDate: string | null;
    hasBatches?: boolean;
    nearestExpiryDate?: string | null;
    hasExpiryDate?: boolean;
    _count?: {
        batches: number;
    };
}

interface StockMovement {
    id: number;
    movementType: string;
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
    reason: string;
    createdAt: string;
}

function ProductsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlFilter = searchParams.get('filter');

    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const [expiryFilter, setExpiryFilter] = useState('all'); // all, week, month, expired, none, custom
    const [customExpiryDays, setCustomExpiryDays] = useState(14);
    const [viewArchived, setViewArchived] = useState(false);

    // Options
    const categories = ['مواد بناء', 'كهرباء', 'سباكة', 'دهانات', 'أخرى'];
    const units = ['كيس', 'قضيب', 'متر', 'لتر', 'كرتون', 'قطعة'];

    // Dialogs & Panel
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<Partial<Product>>({
        name: '', category: 'مواد بناء', purchasePrice: 0, sellPrice: 0,
        quantity: 0, minQuantity: 5, unit: 'قطعة', supplierId: undefined, code: '', expiryDate: null, hasBatches: true, hasExpiryDate: false
    });

    // UI specific states for the panel
    const [enableCodeEdit, setEnableCodeEdit] = useState(false);

    const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; product: Product | null }>({ isOpen: false, product: null });
    const [historyDialog, setHistoryDialog] = useState<{ isOpen: boolean; movements: StockMovement[], loading: boolean }>({ isOpen: false, movements: [], loading: false });
    const [batchesDialog, setBatchesDialog] = useState<{ isOpen: boolean; product: Product | null }>({ isOpen: false, product: null });
    const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' }[]>([]);

    const printRef = useRef(null);

    const showToast = (msg: string, type: 'success' | 'error') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/products?archived=${viewArchived}`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (e) {
            showToast('❌ تعذر جلب المنتجات', 'error');
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        fetchProducts();
    }, [viewArchived]);

    useEffect(() => {
        if (urlFilter) {
            setExpiryFilter(urlFilter);
            // remove query param cleanly
            router.replace('/products');
        }
    }, [urlFilter, router]);

    // Derived Data & Filters
    const knownCategories = ['مواد بناء', 'كهرباء', 'سباكة', 'دهانات', 'أخرى'];

    const filteredProducts = products.filter(p => {
        // Search by name or code
        const matchesSearch = p.name.includes(searchTerm) || (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = categoryFilter
            ? categoryFilter === 'أخرى'
                ? p.category === 'أخرى' || !knownCategories.includes(p.category)
                : p.category === categoryFilter
            : true;

        let matchesExpiry = true;
        if (expiryFilter !== 'all') {
            const days = getDaysRemaining(p.nearestExpiryDate || p.expiryDate);
            if (expiryFilter === 'expired') {
                matchesExpiry = days !== null && days < 0;
            } else if (expiryFilter === 'none') {
                matchesExpiry = days === null;
            } else if (expiryFilter === 'week') {
                matchesExpiry = days !== null && days >= 0 && days <= 7;
            } else if (expiryFilter === 'month') {
                matchesExpiry = days !== null && days >= 0 && days <= 30;
            } else if (expiryFilter === 'custom') {
                matchesExpiry = days !== null && days >= 0 && days <= customExpiryDays;
            }
        }

        return matchesSearch && matchesCategory && matchesExpiry;
    });

    // Expiry counts for alerts
    const expiringThisWeekCount = products.filter(p => {
        if (p.hasExpiryDate === false) return false;
        if (getExpiryStatus(p.expiryDate) !== 'expiring') return false;
        const days = getDaysRemaining(p.expiryDate);
        return days !== null && days <= 7;
    }).length;

    const productsWithExpiry = products.filter(p => p.hasExpiryDate !== false);
    const expiredCount = productsWithExpiry.filter(p => getExpiryStatus(p.expiryDate) === 'expired').length;
    const expiringSoonCount = productsWithExpiry.filter(p => getExpiryStatus(p.expiryDate) === 'expiring').length;

    const resetFilters = () => {
        setSearchTerm('');
        setCategoryFilter('');
        setExpiryFilter('all');
        setCustomExpiryDays(14);
    };

    // Exports
    const handlePrint = () => {
        window.print();
    };

    // Form Handlers
    const handleOpenPanel = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                category: product.category,
                purchasePrice: product.purchasePrice,
                sellPrice: product.sellPrice,
                quantity: product.quantity,
                minQuantity: product.minQuantity,
                unit: product.unit,
                supplierId: product.supplierId || undefined,
                code: product.code || '',
                expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : null,
                hasBatches: true,
                hasExpiryDate: product.hasExpiryDate !== false
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '', category: 'مواد بناء', purchasePrice: 0, sellPrice: 0,
                quantity: 0, minQuantity: 5, unit: 'قطعة', supplierId: undefined, code: '', expiryDate: null, hasBatches: true, hasExpiryDate: false
            });
        }
        setEnableCodeEdit(false);
        setIsPanelOpen(true);
    };

    const closePanel = () => setIsPanelOpen(false);

    const handleSaveProduct = async () => {
        const isEditing = !!editingProduct;
        const url = isEditing ? `/api/products/${editingProduct.id}` : `/api/products`;
        const method = isEditing ? 'PUT' : 'POST';

        // Prepare data
        const payload = {
            ...formData,
            hasBatches: true,
            code: formData.code || undefined,
            expiryDate: formData.expiryDate || null
        };

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'حدث خطأ غير متوقع');

            showToast(`✅ تم ${isEditing ? 'تعديل' : 'إضافة'} المنتج بنجاح`, 'success');
            fetchProducts();
            closePanel();
        } catch (e) {
            const err = e as Error;
            showToast(`❌ ${err.message}`, 'error');
        }
    };

    const handleRestoreProduct = async (product: Product) => {
        try {
            const res = await fetch(`/api/products/${product.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isArchived: false })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'فشل استعادة المنتج');

            showToast('✅ تم استعادة المنتج بنجاح', 'success');
            fetchProducts();
        } catch (e) {
            const err = e as Error;
            showToast(`❌ ${err.message}`, 'error');
        }
    };

    const handleDeleteClick = (product: Product) => {
        if (product.quantity > 0) {
            showToast(`❌ لا يمكن أرشفة المنتج. لا تزال هناك كمية في المخزون (${product.quantity} ${product.unit}). يجب تصفية المخزون أولاً.`, 'error');
            return;
        }
        setDeleteDialog({ isOpen: true, product });
    };
    const confirmDelete = async () => {
        if (!deleteDialog.product) return;
        try {
            const res = await fetch(`/api/products/${deleteDialog.product.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'فشل الحذف');

            showToast('✅ تم أرشفة المنتج بنجاح', 'success');
            setProducts(products.filter(p => p.id !== deleteDialog.product!.id));
            setDeleteDialog({ isOpen: false, product: null });
        } catch (e) {
            const err = e as Error;
            showToast(`❌ ${err.message}`, 'error');
        }
    };

    const openHistory = async (product: Product) => {
        setHistoryDialog({ isOpen: true, loading: true, movements: [] });
        try {
            const res = await fetch(`/api/products/${product.id}`);
            if (res.ok) {
                const data = await res.json();
                setHistoryDialog({ isOpen: true, loading: false, movements: data.stockMovements || [] });
            } else {
                throw new Error();
            }
        } catch (e) {
            showToast('❌ تعذر جلب الحركات', 'error');
            setHistoryDialog({ isOpen: false, loading: false, movements: [] });
        }
    };

    // Render Helpers
    const getProfitBadge = (buy: number, sell: number) => {
        if (buy === 0) return { text: '100%', color: 'text-green-600' };
        const profitPerc = Math.round(((sell - buy) / buy) * 100);
        return { text: `${profitPerc}%`, color: profitPerc >= 20 ? 'text-green-600' : profitPerc >= 10 ? 'text-amber-600' : 'text-red-600' };
    };

    const getStockStatus = (q: number, minQ: number) => {
        if (q <= 0) return { text: 'نفد', color: 'text-red-700 bg-red-100 border-red-200' };
        if (q <= minQ) return { text: 'منخفض', color: 'text-amber-700 bg-amber-100 border-amber-200' };
        return { text: 'متوفر', color: 'text-green-700 bg-green-100 border-green-200' };
    };

    const renderExpiryInfo = (date: string | null, product?: Product) => {
        if (!date) return <span className="text-gray-300">-</span>;
        const status = getExpiryStatus(date);
        const days = getDaysRemaining(date);

        const colors: any = {
            'expired': 'bg-red-50 text-red-600 border-red-100',
            'expiring': 'bg-amber-50 text-amber-600 border-amber-100',
            'near': 'bg-blue-50 text-blue-600 border-blue-100',
            'valid': 'bg-green-50 text-green-600 border-green-100'
        };

        return (
            <div className="flex flex-col gap-1">
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${colors[status] || colors.valid} whitespace-nowrap`}>
                    {formatDate(date)}
                </span>
                <span className="text-[9px] font-bold opacity-70">
                    {status === 'expired' ? 'منتهي الصلاحية' : `${days} يوم متبقي`}
                </span>
                {product?._count?.batches && product._count.batches > 0 && (
                    <span className="text-[10px] font-black text-blue-600 flex items-center gap-1">
                        <Activity size={10} /> {product._count.batches} دفعات
                    </span>
                )}
            </div>
        );
    }; const isSaveDisabled = !formData.name || (formData.sellPrice !== undefined && formData.purchasePrice !== undefined && formData.sellPrice < formData.purchasePrice);

    return (
        <div className="font-tajawal min-h-screen bg-transparent text-gray-900 flex flex-col gap-4 print:p-0 print:bg-white" dir="rtl">
            {/* Custom Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: landscape; margin: 1cm; }
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; direction: rtl; }
                    .print-hide { display: none !important; }
                    .print-table { width: 100%; border-collapse: collapse; }
                    .print-table th, .print-table td { border: 1px solid #ccc; padding: 8px; text-align: right; }
                    .print-table th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; color: #000; }
                }
            `}} />

            {/* Toasts */}
            <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 print-hide">
                {toasts.map(t => (
                    <div key={t.id} className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2 text-sm font-medium transition-all animate-in slide-in-from-top-2
            ${t.type === 'success' ? 'bg-white border-green-500 text-green-700' : 'bg-white border-red-500 text-red-700'}`}>
                        {t.type === 'success' ? <CheckCircle size={18} className="text-green-500" /> : <AlertTriangle size={18} className="text-red-500" />}
                        {t.msg}
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-4 items-center justify-between print-hide">
                {/* Search and Filters */}
                <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto flex-1">
                    <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="البحث بالاسم أو الكود..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-10 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                        />
                    </div>

                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 cursor-pointer min-w-[120px]"
                    >
                        <option value="">الفئة: الكل</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>



                    {/* Expiry Filter */}
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-500 pl-1">الصلاحية:</span>
                        {[
                            { val: 'all', label: 'الكل' },
                            { val: 'week', label: 'أسبوع ' },
                            { val: 'month', label: 'شهر ' },
                            { val: 'expired', label: 'منتهية ' },
                            { val: 'none', label: 'بدون تاريخ' },
                            { val: 'custom', label: 'مخصص' },
                        ].map(opt => (
                            <button
                                key={opt.val}
                                onClick={() => setExpiryFilter(opt.val)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${expiryFilter === opt.val
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                        {expiryFilter === 'custom' && (
                            <div className="flex items-center gap-1 mr-1">
                                <input
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={customExpiryDays}
                                    onChange={e => setCustomExpiryDays(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-16 text-center border border-blue-300 rounded-md px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                                />
                                <span className="text-xs text-gray-500 font-medium">يوم</span>
                            </div>
                        )}
                    </div>

                    {(searchTerm || categoryFilter || expiryFilter !== 'all') && (
                        <button onClick={resetFilters} className="text-gray-500 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors" title="مسح الفلاتر">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end relative">
                    <button onClick={handlePrint} className="bg-gray-900 text-white px-5 py-2.5 rounded-2xl font-black text-xs transition-all hover:bg-gray-800 shadow-lg flex items-center gap-2">
                        <Printer size={16} /> طباعة
                    </button>

                    {/* Export Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setExportMenuOpen(!exportMenuOpen)}
                            className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-2xl font-black text-xs transition-all hover:bg-gray-50 shadow-sm flex items-center gap-2"
                        >
                            <Download size={16} className="text-blue-600" /> تصدير <ChevronDown size={14} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {exportMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => { exportProductsToExcel(filteredProducts); setExportMenuOpen(false); }}
                                    className="w-full text-right flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-b border-gray-50"
                                >
                                    <TableIcon size={16} className="text-emerald-600" /> Excel (.xlsx)
                                </button>
                                <button
                                    onClick={() => { exportProductsToPDF(filteredProducts); setExportMenuOpen(false); }}
                                    className="w-full text-right flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                >
                                    <FileText size={16} className="text-rose-600" /> PDF (.pdf)
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-8 bg-gray-200 mx-1 hidden sm:block"></div>

                    <button
                        onClick={() => setViewArchived(!viewArchived)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs transition-all shadow-sm border ${viewArchived
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                            }`}
                        title={viewArchived ? "العودة للمنتجات النشطة" : "عرض المنتجات المؤرشفة"}
                    >
                        <Archive size={16} className={viewArchived ? "text-amber-600" : "text-gray-400"} />
                        {viewArchived ? "عرض النشطة" : "الأرشيف"}
                    </button>

                    <button onClick={() => handleOpenPanel()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                        <Plus size={18} /> منتج جديد
                    </button>
                </div>
            </div>

            {/* EXPIRY ALERT BANNERS (Specific to page) */}
            <div className="flex flex-col gap-2 print-hide">
                {expiredCount > 0 && (
                    <div onClick={() => setExpiryFilter('expired')} className="cursor-pointer bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm hover:bg-red-100 transition-colors">
                        <div className="flex items-center gap-3">
                            <AlertCircle size={20} className="text-red-500 shrink-0" />
                            <span className="font-bold text-base">🔴 يوجد {expiredCount} منتجات منتهية الصلاحية — يجب سحبها فوراً</span>
                        </div>
                        <span className="text-sm font-bold text-red-600 underline">عرض المنتجات</span>
                    </div>
                )}
                {expiringSoonCount > 0 && (
                    <div onClick={() => setExpiryFilter('expiring')} className="cursor-pointer bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm hover:bg-amber-100 transition-colors">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                            <span className="font-bold text-base">🟡 يوجد {expiringSoonCount} منتجات تنتهي صلاحيتها قريباً
                                {expiringThisWeekCount > 0 && ` (منها ${expiringThisWeekCount} منتجات خلال هذا الأسبوع)`}
                            </span>
                        </div>
                        <span className="text-sm font-bold text-amber-600 underline">عرض المنتجات</span>
                    </div>
                )}
            </div>

            {/* PRODUCTS TABLE */}
            <div className="bg-white border flex-1 border-gray-200 rounded-2xl shadow-sm flex flex-col print-area">
                <div className="hidden print:block mb-6 pt-4 border-b pb-4">
                    <h1 className="text-2xl font-bold flex items-center justify-between text-gray-900">
                        قائمة المنتجات
                        <span className="text-sm text-gray-500 font-normal">تاريخ الطباعة: {formatDate(new Date())}</span>
                    </h1>
                </div>

                <div className="overflow-x-auto flex-1 p-1">
                    <table className="w-full text-right text-sm print-table">
                        <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                                <th className="px-4 py-3.5 font-bold">الكود</th>
                                <th className="px-4 py-3.5 font-bold">الاسم</th>
                                <th className="px-4 py-3.5 font-bold">الفئة</th>

                                <th className="px-4 py-3.5 font-bold text-center">الكمية</th>
                                <th className="px-4 py-3.5 font-bold text-center bg-blue-50/50">متوسط الشراء</th>
                                <th className="px-4 py-3.5 font-bold text-center bg-gray-50">آخر شراء</th>
                                <th className="px-4 py-3.5 font-bold">سعر البيع</th>
                                <th className="px-4 py-3.5 font-bold text-center">الربح%</th>
                                <th className="px-4 py-3.5 font-bold">الصلاحية</th>
                                <th className="px-4 py-3.5 font-bold text-center">الحالة</th>
                                <th className="px-4 py-3.5 font-bold text-center print-hide">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
                            {loading ? (
                                <tr><td colSpan={11} className="text-center py-16 text-gray-400 font-bold text-lg animate-pulse">جاري التحميل...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="text-center py-20">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                            <Package size={64} className="mb-4 text-gray-400" />
                                            <p className="text-xl font-bold text-gray-500">لا توجد منتجات مطابقة</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((p) => {
                                    const profit = getProfitBadge(p.purchasePrice, p.sellPrice);
                                    const stockStatus = getStockStatus(p.quantity, p.minQuantity);
                                    const expiryStat = getExpiryStatus(p.expiryDate);

                                    // Row coloring based on urgency
                                    let rowClass = "hover:bg-blue-50/30 transition-colors group ";
                                    if (expiryStat === 'expired') rowClass += "bg-red-50/40 print:bg-red-50";
                                    else if (expiryStat === 'expiring') rowClass += "bg-amber-50/40 print:bg-amber-50";

                                    return (
                                        <tr key={p.id} className={rowClass}>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.code || '—'}</td>
                                            <td className="px-4 py-3 font-bold text-gray-900">{p.name}</td>
                                            <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md border">{p.category}</span></td>

                                            <td className="px-4 py-3 text-center">
                                                <span className={`font-bold ${p.quantity <= p.minQuantity ? 'text-red-600' : 'text-gray-900'} text-base`}>
                                                    {p.quantity} <span className="text-xs font-normal text-gray-500">{p.unit}</span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center bg-blue-50/30 font-bold text-blue-700">{(p as any).avgPurchasePrice ? (p as any).avgPurchasePrice.toLocaleString() : p.purchasePrice.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-center bg-gray-50/30 text-gray-600">{p.purchasePrice.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-emerald-600 font-bold text-base">{p.sellPrice.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`font-bold ${profit.color} bg-white px-2 py-1 rounded shadow-sm border text-xs`}>{profit.text}</span>
                                            </td>
                                            <td className="px-4 py-3 text-xs w-40">{renderExpiryInfo(p.nearestExpiryDate || p.expiryDate, p)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-md border font-bold text-xs ${stockStatus.color}`}>{stockStatus.text}</span>
                                            </td>
                                            <td className="px-4 py-3 print-hide w-[140px]">
                                                <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenPanel(p)} className="text-gray-500 hover:text-blue-600 bg-white shadow-sm border p-1 rounded-md hover:border-blue-200" title="تعديل">
                                                        <Edit size={14} />
                                                    </button>

                                                    {viewArchived ? (
                                                        <button
                                                            onClick={() => handleRestoreProduct(p)}
                                                            className="text-emerald-500 hover:text-emerald-700 bg-white shadow-sm border p-1 rounded-md hover:border-emerald-200"
                                                            title="استعادة المنتج"
                                                        >
                                                            <CheckCircle size={14} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDeleteClick(p)}
                                                            className="text-gray-500 hover:text-amber-600 bg-white shadow-sm border p-1 rounded-md hover:border-amber-200"
                                                            title="أرشفة"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && filteredProducts.length > 0 && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-sm font-bold text-gray-600 flex justify-between print-hide rounded-b-xl text-left">
                        <span>العدد: {filteredProducts.length} منتج</span>
                        <span className="text-blue-600 font-mono">
                            الإجمالي: {filteredProducts.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0).toLocaleString()} دج
                        </span>
                    </div>
                )}
            </div>

            {/* ADD/EDIT RIGHT PANEL */}
            {isPanelOpen && (
                <>
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity print-hide" onClick={closePanel} />
                    <div className="fixed top-0 bottom-0 right-0 w-full max-w-[500px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 print-hide">
                        <div className="px-6 py-5 w-full flex items-center justify-between border-b border-gray-100 bg-gray-50/80">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                {editingProduct ? <Edit size={22} className="text-blue-600" /> : <Plus size={22} className="text-blue-600" />}
                                {editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
                            </h2>
                            <button onClick={closePanel} className="text-gray-400 hover:text-red-500 bg-white border shadow-sm hover:border-red-200 rounded-full p-2 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar bg-white">
                            {/* Code Field */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-gray-700">كود المنتج (Barcode)</label>
                                    <button
                                        onClick={() => setEnableCodeEdit(!enableCodeEdit)}
                                        className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                                    >
                                        <Edit size={12} /> {enableCodeEdit ? 'قفل' : 'تعديل يدوي'}
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder={!editingProduct ? "سيتم التوليد تلقائياً (PRD-XXX)" : ""}
                                    value={formData.code || ''}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    disabled={!enableCodeEdit}
                                    className="w-full bg-white disabled:bg-gray-100 disabled:text-gray-500 font-mono font-bold border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">اسم المنتج <span className="text-red-500">*</span></label>
                                <input
                                    type="text" autoFocus
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">الفئة <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-sans shadow-sm"
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">سعر الشراء <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.purchasePrice || ''} onChange={e => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 font-bold font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs uppercase pt-1">دج</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">سعر البيع <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.sellPrice || ''} onChange={e => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })}
                                            className={`w-full bg-white border rounded-xl pl-10 pr-4 py-2.5 font-bold font-sans focus:outline-none shadow-sm
                        ${(formData.sellPrice !== undefined && formData.purchasePrice !== undefined && formData.sellPrice < formData.purchasePrice) ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500/50'}`}
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs uppercase pt-1">دج</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quantity Block */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                                <h3 className="font-bold text-sm text-gray-800 border-b pb-2">إعدادات المخزون</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600">الكمية {(editingProduct) ? 'الحالية' : 'الأولية'}</label>
                                        <input
                                            type="number"
                                            value={formData.quantity || ''} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-center font-bold font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600">الوحدة</label>
                                        <select
                                            value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        >
                                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-xs font-bold text-gray-600">الحد الأدنى للتنبيه</label>
                                        <input
                                            type="number"
                                            value={formData.minQuantity || ''} onChange={e => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 font-bold font-sans focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Expiry & Batch Toggle Block */}
                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={18} className="text-blue-600" />
                                        <span className="text-sm font-bold text-blue-800">تتبع تاريخ الصلاحية</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <label className={`relative inline-flex items-center ${editingProduct ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={formData.hasExpiryDate !== false}
                                                onChange={e => setFormData({ ...formData, hasExpiryDate: e.target.checked })}
                                                disabled={!!editingProduct}
                                            />
                                            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${editingProduct ? 'peer-checked:bg-blue-400' : 'peer-checked:bg-blue-600'}`}></div>
                                        </label>
                                        {editingProduct && (
                                            <span className="text-[10px] text-gray-500 mt-1 font-bold">هذا الخيار يُحدد عند الإنشاء فقط</span>
                                        )}
                                    </div>
                                </div>

                                {formData.hasExpiryDate !== false ? (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-blue-700">
                                                {editingProduct && (editingProduct as any)._count?.batches > 0
                                                    ? 'تاريخ الانتهاء الأقرب (تلقائي)'
                                                    : 'تاريخ انتهاء الصلاحية للدفعة الأولى'}
                                            </span>
                                            <span className="text-[10px] text-blue-500 font-medium">(اختياري)</span>
                                        </div>
                                        <div className="space-y-2">
                                            <input
                                                type="date"
                                                value={formData.expiryDate || ''}
                                                onChange={e => setFormData({ ...formData, expiryDate: e.target.value || null })}
                                                disabled={!!(editingProduct && (editingProduct as any)._count?.batches > 0)}
                                                className="w-full bg-white disabled:bg-gray-100 disabled:text-gray-500 border border-blue-200 rounded-xl px-4 py-2.5 font-bold font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            />
                                            {editingProduct && (editingProduct as any)._count?.batches > 0 ? (
                                                <div className="flex items-start gap-2 bg-blue-100/50 p-2 rounded-xl border border-blue-200">
                                                    <AlertCircle size={14} className="text-blue-600 shrink-0 mt-0.5" />
                                                    <p className="text-[10px] text-blue-700 font-bold leading-tight">
                                                        لا يمكن تعديل التاريخ يدوياً لأن المنتج يحتوي على {editingProduct._count?.batches} دفعات مسجلة.
                                                        يتم تحديث التاريخ تلقائياً بناءً على نظام الدفعات.
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-blue-500 font-medium font-tajawal">
                                                    سيتم استخدام نظام FIFO لتتبع تواريخ الصلاحية لكل دفعة شراء جديدة.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 bg-gray-100 p-3 rounded-xl border border-gray-200">
                                        <CheckCircle size={16} className="text-gray-500" />
                                        <p className="text-xs text-gray-600 font-bold">هذا المنتج لا يتطلب تتبع تاريخ انتهاء الصلاحية.</p>
                                    </div>
                                )}
                            </div>


                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">المورد المفضل</label>
                                <select
                                    value={formData.supplierId || ''} onChange={e => setFormData({ ...formData, supplierId: e.target.value ? parseInt(e.target.value) : undefined })}
                                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                                >
                                    <option value="">-- بدون مورد --</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="px-6 py-4 flex flex-col sm:flex-row gap-3 bg-white border-t border-gray-100">
                            <button
                                onClick={handleSaveProduct}
                                disabled={isSaveDisabled}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
                            >
                                حفظ بيانات المنتج
                            </button>
                            <button
                                onClick={closePanel}
                                className="flex-[0.5] bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-xl border border-gray-200 font-bold transition-colors shadow-sm"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* DELETE CONFIRM DIALOG - (Keep unchanged mostly) */}
            {deleteDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print-hide">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setDeleteDialog({ isOpen: false, product: null })} />
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-10 w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="p-3 bg-red-100 rounded-full border border-red-200 shadow-sm">
                                <AlertTriangle size={28} className="text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">أرشفة المنتج</h2>
                        </div>
                        <p className="text-gray-600 mb-6 leading-relaxed font-medium">
                            هل أنت متأكد من أرشفة المنتج <span className="font-bold text-gray-900 bg-gray-100 px-1 rounded">[{deleteDialog.product?.name}]</span>؟
                            <br />سيتم إخفاء المنتج من القائمة النشطة، ولكن سيبقى مسجلاً في الفواتير والتقارير التاريخية.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={confirmDelete}
                                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl font-bold text-sm transition-colors shadow-md shadow-amber-600/20"
                            >
                                نعم، تأكيد الأرشفة
                            </button>
                            <button
                                onClick={() => setDeleteDialog({ isOpen: false, product: null })}
                                className="flex-[0.5] bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HISTORY DIALOG (Keep Unchanged) */}
            {historyDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print-hide">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setHistoryDialog({ ...historyDialog, isOpen: false })} />
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-10 w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-2xl">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-2xl"><Activity size={22} className="text-emerald-600" /></div>
                                سجل حركة المخزون
                            </h2>
                            <button onClick={() => setHistoryDialog({ ...historyDialog, isOpen: false })} className="text-gray-400 hover:text-gray-900 transition-colors bg-white border hover:bg-gray-50 rounded-full p-1.5 shadow-sm">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                            {historyDialog.loading ? (
                                <div className="p-16 text-center text-gray-500 font-bold text-lg animate-pulse">جاري التحميل...</div>
                            ) : historyDialog.movements.length === 0 ? (
                                <div className="p-20 text-center text-gray-400 flex flex-col items-center">
                                    <Activity size={56} className="mb-4 text-gray-200" />
                                    <p className="font-bold text-xl text-gray-400">لا توجد حركات مخزون بعد</p>
                                </div>
                            ) : (
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-gray-50 text-gray-600 sticky top-0 border-b">
                                        <tr>
                                            <th className="px-6 py-4 font-bold border-b border-gray-200">التاريخ والوقت</th>
                                            <th className="px-6 py-4 font-bold border-b border-gray-200">النوع</th>
                                            <th className="px-6 py-4 font-bold border-b border-gray-200">الكمية</th>
                                            <th className="px-6 py-4 font-bold border-b border-gray-200">قبل</th>
                                            <th className="px-6 py-4 font-bold border-b border-gray-200">بعد</th>
                                            <th className="px-6 py-4 font-bold border-b border-gray-200">السبب</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
                                        {historyDialog.movements.map((m: StockMovement) => (
                                            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-xs text-gray-500" dir="rtl">{new Date(m.createdAt).toLocaleString('ar-DZ')}</td>
                                                <td className="px-6 py-4">
                                                    {m.movementType === 'IN' && <span className="text-emerald-700 font-bold flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />دخول</span>}
                                                    {m.movementType === 'OUT' && <span className="text-red-700 font-bold flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />خروج</span>}
                                                    {m.movementType === 'ADJUST' && <span className="text-amber-700 font-bold flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />تعديل</span>}
                                                </td>
                                                <td className="px-6 py-4 font-bold font-sans text-gray-900 text-base" dir="ltr">{m.movementType === 'IN' ? '+' : '-'}{m.quantity}</td>
                                                <td className="px-6 py-4 text-gray-500 font-medium">{m.quantityBefore}</td>
                                                <td className="px-6 py-4 text-blue-600 font-bold text-base">{m.quantityAfter}</td>
                                                <td className="px-6 py-4 max-w-[200px] truncate font-medium text-gray-600" title={m.reason}>{m.reason || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* BATCH MANAGEMENT DIALOG */}
            {batchesDialog.isOpen && batchesDialog.product && (
                <BatchManagementModal
                    product={batchesDialog.product}
                    isOpen={batchesDialog.isOpen}
                    onClose={() => setBatchesDialog({ isOpen: false, product: null })}
                    refreshProducts={fetchProducts}
                />
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
        </div>
    );
}

// BATCH MANAGEMENT MODAL COMPONENT
function BatchManagementModal({ product, isOpen, onClose, refreshProducts }: { product: Product; isOpen: boolean; onClose: () => void; refreshProducts: () => void }) {
    const [batches, setBatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/products/${product.id}/batches`);
            if (res.ok) {
                const data = await res.json();
                setBatches(data);
            }
        } catch (e) {
            console.error('Failed to fetch batches', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchBatches();
    }, [isOpen, product.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-10 w-full max-w-3xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-2xl"><Package size={22} className="text-blue-600" /></div>
                        <div className="flex flex-col">
                            <h2 className="text-xl font-bold text-gray-900">تسيير دفعات المنتج</h2>
                            <p className="text-xs text-gray-500 font-bold">{product.name} ({product.code})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors bg-white border hover:bg-gray-50 rounded-full p-1.5 shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="p-16 text-center text-gray-500 font-bold text-lg animate-pulse">جاري التحميل...</div>
                    ) : batches.length === 0 ? (
                        <div className="p-20 text-center text-gray-400 flex flex-col items-center">
                            <Package size={56} className="mb-4 text-gray-200" />
                            <p className="font-bold text-xl text-gray-400">لا توجد دفعات مسجلة لهذا المنتج</p>
                            <p className="text-sm font-medium">يتم إنشاء الدفعات تلقائياً عند طلبات الشراء</p>
                        </div>
                    ) : (
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-600 sticky top-0 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-bold border-b border-gray-200">رقم الدفعة</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-200">تاريخ الانتهاء</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-200">الكمية الأولية</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-200">المتبقي</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-200">سعر الوحدة</th>
                                    <th className="px-6 py-4 font-bold border-b border-gray-200">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
                                {batches.map((b) => {
                                    const status = b.status;
                                    const expiryDate = b.expiryDate ? new Date(b.expiryDate) : null;
                                    const isExpired = expiryDate && expiryDate < new Date();

                                    return (
                                        <tr key={b.id} className={`hover:bg-gray-50 transition-colors ${status === 'EXPIRED' || isExpired ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-6 py-4 font-mono font-bold text-blue-600">{b.batchNumber}</td>
                                            <td className="px-6 py-4 font-medium">
                                                {formatDate(b.expiryDate)}
                                                {isExpired && <span className="mr-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black">منتهي</span>}
                                            </td>
                                            <td className="px-6 py-4 font-medium">{b.initialQty}</td>
                                            <td className="px-6 py-4 font-black text-gray-900">{b.remainingQty}</td>
                                            <td className="px-6 py-4 font-bold text-emerald-600">{b.unitCost?.toLocaleString()} دج</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black
                                                    ${status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                        status === 'DEPLETED' ? 'bg-gray-100 text-gray-600' :
                                                            'bg-red-100 text-red-700'}`}>
                                                    {status === 'ACTIVE' ? 'نشط' : status === 'DEPLETED' ? 'منتهي' : 'منتهي الصلاحية'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-b-2xl">
                    <span className="text-xs font-bold text-gray-500">إجمالي الدفعات: {batches.length}</span>
                    <button onClick={onClose} className="bg-white border border-gray-200 px-6 py-2 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">إغلاق</button>
                </div>
            </div>
        </div>
    );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500 font-bold animate-pulse">جاري التحميل...</div>}>
            <ProductsContent />
        </Suspense>
    );
}
