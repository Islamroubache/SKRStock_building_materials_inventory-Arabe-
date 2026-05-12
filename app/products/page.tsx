'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Search, Plus, Edit, Activity, Trash2, X, AlertTriangle, CheckCircle, Package, AlertCircle, Printer, FileText, Table as TableIcon, Calendar, ChevronDown, Download, Archive } from 'lucide-react';
import { exportProductsToExcel } from '@/lib/export-products';
import { exportProductsToPDF } from '@/lib/export-products-pdf';
import { getExpiryStatus, getDaysRemaining } from '@/lib/product-helpers';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { printDocument } from '@/lib/print-helper';
import PageHeader from '@/components/PageHeader';
import SingleDatePicker from '@/components/SingleDatePicker';
import ModernDropdown from '@/components/ModernDropdown';

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
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Options
    const [categories, setCategories] = useState<string[]>(['مواد بناء', 'كهرباء', 'سباكة', 'دهانات', 'أخرى']);
    const [units, setUnits] = useState<string[]>(['كيس', 'قضيب', 'متر', 'لتر', 'كرتون', 'قطعة']);

    // Dialogs & Panel
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<Partial<Product>>({
        name: '', category: 'مواد بناء', purchasePrice: 0, sellPrice: 0,
        quantity: 0, minQuantity: 5, unit: 'قطعة', supplierId: undefined, code: '', expiryDate: null, hasBatches: true, hasExpiryDate: false
    });

    // UI specific states for the panel

    const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; product: Product | null }>({ isOpen: false, product: null });
    const [isManualCode, setIsManualCode] = useState(false);
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



    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                if (data.categories) {
                    const cats = data.categories.split(',');
                    setCategories(cats);
                    if (!editingProduct) setFormData(prev => ({ ...prev, category: cats[0] }));
                }
                if (data.units) {
                    const un = data.units.split(',');
                    setUnits(un);
                    if (!editingProduct) setFormData(prev => ({ ...prev, unit: un[0] }));
                }
            }
        } catch (e) {}
    };

    useEffect(() => {
        fetchProducts();
        fetchSettings();
        setCurrentPage(1);
    }, [viewArchived]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, expiryFilter]);

    useEffect(() => {
        if (urlFilter) {
            setExpiryFilter(urlFilter);
            // remove query param cleanly
            router.replace('/products');
        }
    }, [urlFilter, router]);

    // Derived Data & Filters
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = categoryFilter
            ? categoryFilter === 'أخرى'
                ? p.category === 'أخرى' || !categories.includes(p.category)
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
        printDocument();
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
        setIsManualCode(false);
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
    }; 
    
    const isCodeDuplicate = useMemo(() => {
        if (!formData.code) return false;
        return products.some(p => p.code === formData.code && p.id !== editingProduct?.id);
    }, [formData.code, products, editingProduct]);
    
    const isSaveDisabled = !formData.name?.trim() || 
        !formData.purchasePrice || 
        !formData.sellPrice || 
        (formData.sellPrice < formData.purchasePrice) || 
        (formData.minQuantity === undefined || formData.minQuantity === null) ||
        (formData.hasExpiryDate !== false && !formData.expiryDate) ||
        isCodeDuplicate;

    return (
        <div className="font-tajawal min-h-screen bg-white text-gray-900 flex flex-col gap-4 print:p-0 print:bg-white pb-12" dir="rtl">
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
                /* Hide number input spinners */
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                  -webkit-appearance: none; 
                  margin: 0; 
                }
                input[type=number] {
                  -moz-appearance: textfield;
                }
            `}} />

            {/* Toasts */}
            <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 print-hide">
                {toasts.map(t => (
                    <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 text-sm font-medium transition-all animate-in slide-in-from-top-2
            ${t.type === 'success' ? 'bg-white border-green-500 text-green-700' : 'bg-white border-red-500 text-red-700'}`}>
                        {t.type === 'success' ? <CheckCircle size={18} className="text-green-500" /> : <AlertTriangle size={18} className="text-red-500" />}
                        {t.msg}
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="print-hide px-4 md:px-6 pt-6 pb-0 flex flex-col lg:flex-row items-center justify-between gap-4">
                <PageHeader 
                    title="إدارة المنتجات" 
                    subtitle="إضافة وتعديل المنتجات ومراقبة المخزون" 
                    Icon={Package} 
                />
                
                <div className="flex gap-2 w-full lg:w-auto justify-end shrink-0">
                    <div className="relative group">
                        <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-black text-xs shadow-sm flex items-center gap-2 hover:bg-gray-50 transition-all">
                            <Download size={14} className="text-blue-600"/> تصدير
                        </button>
                        <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <button onClick={() => exportProductsToExcel(filteredProducts)} className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-xs font-bold text-gray-700 flex items-center gap-2 border-b border-gray-50 transition-colors">
                                <TableIcon size={14} className="text-emerald-600"/> Excel (.xlsx)
                            </button>
                            <button onClick={() => exportProductsToPDF(filteredProducts)} className="w-full text-right px-4 py-3 hover:bg-rose-50 text-xs font-bold text-gray-700 flex items-center gap-2 transition-colors">
                                <FileText size={14} className="text-rose-600"/> PDF (.pdf)
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={handlePrint}
                        className="bg-[#8b5cf6] text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-[#7c3aed] transition-all shadow-lg active:scale-95"
                    >
                        <Printer size={16} /> طباعة القائمة
                    </button>
                </div>
            </div>

            {/* Tabs Header */}
            <div className="flex items-center gap-6 no-print mb-[-8px] pb-1 px-4 md:px-6 pt-0">
                <button
                    onClick={() => setViewArchived(false)}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 ${!viewArchived ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    المنتجات النشطة
                </button>
                <button
                    onClick={() => setViewArchived(true)}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 ${viewArchived ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    الأرشيف
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-6 items-center justify-between print-hide mx-4 md:mx-6">
                {/* Search and Filters */}
                <div className="flex flex-col lg:flex-row gap-3 items-center w-full flex-1">
                    {/* Search Bar */}
                    <div className="relative flex-1 min-w-[300px] group">
                        <input
                            type="text"
                            placeholder="البحث بالاسم أو الكود..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-[52px] bg-white border border-gray-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10 rounded-2xl pr-14 pl-4 text-sm font-bold transition-all outline-none shadow-sm"
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-[#8b5cf6] rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none">
                            <Search size={20} strokeWidth={3} />
                        </div>
                    </div>


                    {(searchTerm || expiryFilter !== 'all') && (
                        <button onClick={resetFilters} className="h-[52px] w-[52px] flex items-center justify-center text-gray-400 hover:text-red-500 bg-white border border-gray-200 rounded-2xl hover:bg-red-50 transition-all shadow-sm" title="مسح الفلاتر">
                            <X size={20} />
                        </button>
                    )}

                    <button onClick={() => handleOpenPanel()} className="h-[52px] bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-black text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95 ml-auto shrink-0">
                        <Plus size={20} strokeWidth={3} /> منتج جديد
                    </button>
                </div>
            </div>



            {/* EXPIRY ALERT BANNERS (Specific to page) */}
            <div className="flex flex-col gap-4 print-hide mx-4 md:mx-8">
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
                    <div onClick={() => { setExpiryFilter('expiring'); setCurrentPage(1); }} className="cursor-pointer bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm hover:bg-amber-100 transition-colors">
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
            <div className="flex flex-col gap-6 px-4 md:px-8 mb-8">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">الكود</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">الاسم</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-center">الكمية</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-center bg-blue-50/20">متوسط الشراء</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-center bg-gray-50/30">آخر شراء</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">سعر البيع</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-center">الحالة</th>
                                    <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-center print-hide">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                                {loading ? (
                                    <tr><td colSpan={8} className="text-center py-20 text-gray-400 font-bold text-lg animate-pulse">جاري التحميل...</td></tr>
                                ) : filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-24">
                                            <div className="flex flex-col items-center justify-center opacity-40">
                                                <Package size={64} className="mb-4 text-gray-400" />
                                                <p className="text-xl font-black text-gray-500 tracking-tight">لا توجد منتجات مطابقة</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    (() => {
                                        const indexOfLastItem = currentPage * itemsPerPage;
                                        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                                        const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
                                        
                                        return currentProducts.map((p) => {
                                            const stockStatus = getStockStatus(p.quantity, p.minQuantity);
                                            const expiryStat = getExpiryStatus(p.expiryDate);

                                            // Row coloring based on urgency
                                            let rowClass = "hover:bg-blue-50/40 transition-all group ";
                                            if (expiryStat === 'expired') rowClass += "bg-red-50/20 print:bg-red-50";
                                            else if (expiryStat === 'expiring') rowClass += "bg-amber-50/20 print:bg-amber-50";

                                            return (
                                                <tr key={p.id} className={rowClass}>
                                                    <td className="px-8 py-6">
                                                        <span className="font-black text-gray-400 font-sans text-xs">{p.code || '---'}</span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="font-black text-gray-900">{p.name}</span>
                                                    </td>

                                                    <td className="px-8 py-6 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className={`font-black font-sans text-lg ${p.quantity <= p.minQuantity ? 'text-red-600' : 'text-gray-900'}`}>
                                                                {p.quantity.toLocaleString()}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 font-bold">{p.unit}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center bg-blue-50/10 font-black text-blue-700 font-sans">
                                                        {(p as any).avgPurchasePrice ? (p as any).avgPurchasePrice.toLocaleString() : p.purchasePrice.toLocaleString()} دج
                                                    </td>
                                                    <td className="px-8 py-6 text-center bg-gray-50/20 font-bold text-gray-500 font-sans">
                                                        {p.purchasePrice.toLocaleString()} دج
                                                    </td>
                                                    <td className="px-8 py-6 text-emerald-600 font-black text-base font-sans text-right">
                                                        {p.sellPrice.toLocaleString()} دج
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className={`px-3 py-1 rounded-full border-2 font-black text-[10px] ${stockStatus.color}`}>
                                                            {stockStatus.text}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 print-hide">
                                                        <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleOpenPanel(p)} className="text-gray-500 hover:text-blue-600 bg-white shadow-sm border p-1.5 rounded-xl hover:border-blue-200 transition-all active:scale-95" title="تعديل">
                                                                <Edit size={16} />
                                                            </button>

                                                            {viewArchived ? (
                                                                <button
                                                                    onClick={() => handleRestoreProduct(p)}
                                                                    className="text-emerald-500 hover:text-emerald-700 bg-white shadow-sm border p-1.5 rounded-xl hover:border-emerald-200 transition-all active:scale-95"
                                                                    title="استعادة المنتج"
                                                                >
                                                                    <CheckCircle size={16} />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleDeleteClick(p)}
                                                                    disabled={p.quantity > 0}
                                                                    className={`p-1.5 rounded-xl border transition-all active:scale-95 ${p.quantity > 0 
                                                                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50' 
                                                                        : 'bg-white text-gray-500 hover:text-amber-600 hover:border-amber-200 shadow-sm'
                                                                    }`}
                                                                    title={p.quantity > 0 ? "لا يمكن أرشفة منتج به كمية" : "أرشفة"}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {!loading && filteredProducts.length > itemsPerPage && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white px-8 py-6 rounded-[2rem] border border-gray-100 shadow-sm print:hidden">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100">
                                <Package size={18} className="text-[#8b5cf6]" />
                            </div>
                            <p className="text-xs font-black text-gray-400">
                                إظهار <span className="text-gray-900 font-sans">{(currentPage - 1) * itemsPerPage + 1}</span> إلى <span className="text-gray-900 font-sans">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> من أصل <span className="text-[#8b5cf6] font-sans">{filteredProducts.length}</span> منتج
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                السابق
                            </button>
                            <span className="px-4 py-2 bg-[#8b5cf6]/10 text-[#8b5cf6] text-xs font-black rounded-xl border border-[#8b5cf6]/20">
                                {currentPage} / {Math.ceil(filteredProducts.length / itemsPerPage)}
                            </span>
                            <button 
                                onClick={() => { setCurrentPage(p => Math.min(Math.ceil(filteredProducts.length / itemsPerPage), p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={currentPage === Math.ceil(filteredProducts.length / itemsPerPage)}
                                className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                التالي
                            </button>
                        </div>
                    </div>
                )}
            </div>


            {/* ADD/EDIT RIGHT PANEL */}
            {isPanelOpen && (
                <>
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity print-hide" onClick={closePanel} />
                    <div className="fixed top-0 bottom-0 right-0 w-full max-w-[550px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 print-hide">
                        <div className="p-8 w-full flex items-center justify-between bg-[#8b5cf6] text-white shadow-lg">
                            <div>
                                <h2 className="text-2xl font-black flex items-center gap-3">
                                    {editingProduct ? <Edit size={28} className="bg-white/20 p-1 rounded-lg" /> : <Plus size={28} className="bg-white/20 p-1 rounded-lg" />}
                                    {editingProduct ? 'تعديل بيانات المنتج' : 'تسجيل منتج جديد'}
                                </h2>
                                <p className="text-white/70 text-xs font-bold mt-1 tracking-tight uppercase">إضافة بيانات المنتج الجديد إلى قاعدة البيانات</p>
                            </div>
                            <button onClick={closePanel} className="bg-white/10 hover:bg-white/20 text-white rounded-2xl p-2 transition-all active:scale-90">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-gray-50/30 custom-scrollbar" onKeyDown={(e) => {
                            const form = e.currentTarget;
                            const focusableElements = Array.from(form.querySelectorAll('input:not([type="hidden"]), select, textarea, button[type="submit"]:not(:disabled)'));
                            const index = focusableElements.indexOf(e.target as any);

                            if (e.key === 'Enter' || e.key === 'ArrowRight') {
                                if (index > -1 && index < focusableElements.length - 1) {
                                    e.preventDefault();
                                    (focusableElements[index + 1] as HTMLElement).focus();
                                }
                            } else if (e.key === 'ArrowLeft') {
                                if (index > 0) {
                                    e.preventDefault();
                                    (focusableElements[index - 1] as HTMLElement).focus();
                                }
                            }
                        }}>
                            {/* Section 1: Basic Info - VIOLET */}
                            <div className="space-y-6 p-6 bg-white border-2 border-violet-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-violet-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-violet-500 rounded-full"></div>
                                    <h3 className="text-sm font-black text-violet-600 uppercase tracking-widest">المعلومات الأساسية</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-5">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mr-1">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter">كود المنتج (Barcode)</label>
                                            <button 
                                                type="button"
                                                onClick={() => setIsManualCode(!isManualCode)}
                                                className={`text-[10px] font-black px-2 py-1 rounded-lg border transition-all flex items-center gap-1
                                                    ${isManualCode ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                            >
                                                <Edit size={10} />
                                                {isManualCode ? 'إلغاء اليدوي' : 'تعديل يدوي'}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={!editingProduct && !isManualCode ? "سيتم التوليد تلقائياً (PRD-XXX)" : "أدخل الكود يدوياً..."}
                                            value={formData.code || ''}
                                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                                            disabled={!isManualCode}
                                            className={`w-full bg-gray-50/50 font-mono border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none transition-all
                                                ${isManualCode ? (isCodeDuplicate ? 'border-red-400 focus:ring-red-400/10' : 'border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white') : 'disabled:bg-gray-100 disabled:text-gray-400 border-transparent'}`}
                                        />
                                        {isCodeDuplicate && (
                                            <p className="text-[10px] text-red-500 font-black mt-1.5 animate-in slide-in-from-top-1">
                                                ⚠️ هذا الكود مستخدم بالفعل لمنتج آخر
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">اسم المنتج <span className="text-red-500">*</span></label>
                                        <input
                                            type="text" autoFocus
                                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="أدخل اسم المنتج هنا..."
                                            className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Pricing - BLUE */}
                            <div className="space-y-6 p-6 bg-white border-2 border-blue-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-blue-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">إعدادات التسعير</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">سعر الشراء <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={formData.purchasePrice || ''} onChange={e => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] pl-12 pr-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 focus:bg-white transition-all"
                                            />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-[10px] uppercase pt-1">دج</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">سعر البيع <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={formData.sellPrice || ''} onChange={e => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })}
                                                className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] pl-12 pr-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                    ${(formData.sellPrice !== undefined && formData.purchasePrice !== undefined && formData.sellPrice < formData.purchasePrice) ? 'border-red-200 bg-red-50/50 focus:border-red-400 focus:ring-red-400/10' : 'border-transparent focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 focus:bg-white transition-all'}`}
                                            />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-[10px] uppercase pt-1">دج</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Inventory - EMERALD */}
                            <div className="space-y-6 p-6 bg-white border-2 border-emerald-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-emerald-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                                    <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest">إدارة المخزون</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">الكمية {(editingProduct) ? 'الحالية' : 'الأولية'} <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            value={formData.quantity || ''} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-center text-gray-900 font-bold font-sans focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div className="space-y-0">
                                        <ModernDropdown 
                                            label="الوحدة"
                                            options={units}
                                            value={formData.unit || 'قطعة'}
                                            onChange={(val) => setFormData({ ...formData, unit: val })}
                                            theme="emerald"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">الحد الأدنى للتنبيه <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            value={formData.minQuantity || ''} onChange={e => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Expiry - AMBER */}
                            <div className="space-y-6 p-6 bg-white border-2 border-amber-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-amber-200">
                                <div className="flex items-center justify-between border-b border-amber-50 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
                                        <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest">تاريخ الصلاحية</h3>
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
                                            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500`}></div>
                                        </label>
                                    </div>
                                </div>

                                {formData.hasExpiryDate !== false ? (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                        <SingleDatePicker 
                                            selectedDate={formData.expiryDate || null}
                                            onChange={(date) => setFormData({ ...formData, expiryDate: date })}
                                            label={editingProduct && (editingProduct as any)._count?.batches > 0
                                                ? 'تاريخ الانتهاء الأقرب (تلقائي)'
                                                : 'تاريخ انتهاء الصلاحية'}
                                            disabled={!!(editingProduct && (editingProduct as any)._count?.batches > 0)}
                                            placeholder="اختر تاريخ الانتهاء..."
                                        />
                                        {editingProduct && (editingProduct as any)._count?.batches > 0 && (
                                            <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-[1.2rem] border border-amber-100 mt-3">
                                                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-amber-700 font-black leading-tight">
                                                    لا يمكن تعديل التاريخ يدوياً لوجود دفعات مسجلة. يتم التحديث تلقائياً.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 bg-gray-50/50 p-4 rounded-[1.2rem] border-2 border-dashed border-gray-100 opacity-60">
                                        <CheckCircle size={18} className="text-gray-400" />
                                        <p className="text-xs text-gray-500 font-black tracking-tight">لا يتطلب تتبع تاريخ انتهاء</p>
                                    </div>
                                )}
                            </div>



                        </div>

                        <div className="px-8 py-6 flex flex-col sm:flex-row gap-4 bg-white border-t border-gray-100 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
                            <button
                                onClick={handleSaveProduct}
                                disabled={isSaveDisabled}
                                className="flex-[2] bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black transition-all shadow-xl shadow-violet-100 hover:shadow-violet-200 hover:scale-[1.02] active:scale-95"
                            >
                                {editingProduct ? 'تحديث البيانات' : 'تسجيل المنتج'}
                            </button>
                            <button
                                onClick={closePanel}
                                className="flex-1 bg-white hover:bg-gray-50 text-gray-400 py-4 rounded-2xl border-2 border-gray-50 font-black transition-all hover:text-gray-600 active:scale-95 uppercase tracking-tight text-xs"
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
                                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg font-bold text-sm transition-colors shadow-md shadow-amber-600/20"
                            >
                                نعم، تأكيد الأرشفة
                            </button>
                            <button
                                onClick={() => setDeleteDialog({ isOpen: false, product: null })}
                                className="flex-[0.5] bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
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
                                <div className="p-2 bg-emerald-50 rounded-xl"><Activity size={22} className="text-emerald-600" /></div>
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
                        <div className="p-2 bg-blue-50 rounded-xl"><Package size={22} className="text-blue-600" /></div>
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
                    <button onClick={onClose} className="bg-white border border-gray-200 px-6 py-2 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">إغلاق</button>
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
