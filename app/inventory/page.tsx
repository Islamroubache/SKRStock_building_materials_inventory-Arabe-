'use client';

import React, { useState, useEffect } from 'react';
import {
    Package, Search, AlertTriangle, Activity,
    ArrowDownRight, ArrowUpRight, CopyPlus, Filter,
    TrendingUp, Trash2, CheckCircle, RotateCcw,
    Calendar, User, FileText, DollarSign, PlusCircle, X,
    Download, Printer, ChevronDown, ArrowUpAZ, ArrowDownZA
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
    batches: { id: number, remainingQty: number, expiryDate: string | null, unitCost: number }[];
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
    const [activeTab, setActiveTab] = useState<'overview' | 'damaged' | 'batches'>('overview');
    const [loading, setLoading] = useState(true);

    // Data states
    const [products, setProducts] = useState<Product[]>([]);
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
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isBatchDetailModalOpen, setIsBatchDetailModalOpen] = useState(false);
    const [selectedDamageRecord, setSelectedDamageRecord] = useState<DamagedProduct | null>(null);
    const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
    const [selectedProductForBatches, setSelectedProductForBatches] = useState<Product | null>(null);
    const [productHistory, setProductHistory] = useState<StockMovement[]>([]);
    const [historyFilters, setHistoryFilters] = useState({ type: 'ALL', from: '', to: '' });
    const [expiryStatusFilter, setExpiryStatusFilter] = useState('ALL');
    const [alertFilter, setAlertFilter] = useState<'ALL' | 'BELOW_MIN' | 'ABOVE_MIN'>('ALL');
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const [isOverviewExportDropdownOpen, setIsOverviewExportDropdownOpen] = useState(false);
    const [isDamagedExportDropdownOpen, setIsDamagedExportDropdownOpen] = useState(false);
    const [sortBy, setSortBy] = useState<string>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Form states
    const [newDamage, setNewDamage] = useState({
        productId: '',
        batchId: '',
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

    const handlePrintDamagedTable = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const filtered = damaged.filter(d => typeFilter === 'ALL' || d.damageType === typeFilter);
        const tableRows = filtered.map(d => `
            <tr>
                <td>${format(new Date(d.createdAt), 'yyyy/MM/dd')}</td>
                <td>${d.product.name}</td>
                <td style="text-align:center">${d.quantity}</td>
                <td style="text-align:center">${d.damageType}</td>
                <td style="text-align:center">${d.totalLoss.toLocaleString()} دج</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>تقرير التالف والضياع - ${format(new Date(), 'dd/MM/yyyy')}</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; direction: rtl; padding: 30px; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ef4444; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; }
                        th { background: #fef2f2; padding: 10px; border: 1px solid #fee2e2; text-align: right; }
                        td { padding: 8px; border: 1px solid #fee2e2; }
                    </style>
                </head>
                <body>
                    <div class="header"><h1>تقرير التالف والضياع والمفقودات</h1></div>
                    <table>
                        <thead><tr><th>التاريخ</th><th>المنتج</th><th>الكمية</th><th>النوع</th><th>الخسارة</th></tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleExportDamagedExcel = () => {
        const filtered = damaged.filter(d => typeFilter === 'ALL' || d.damageType === typeFilter);
        const data = filtered.map(d => ({
            'التاريخ': format(new Date(d.createdAt), 'yyyy/MM/dd'),
            'المنتج': d.product.name,
            'الكمية': d.quantity,
            'النوع': d.damageType,
            'الخسارة': d.totalLoss,
            'السبب': d.reason
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Damaged Report");
        XLSX.writeFile(wb, `Damaged_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const handlePrintDamageReceipt = (record: DamagedProduct) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>وصل تسجيل تلف - ${record.id}</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; direction: rtl; padding: 40px; }
                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                        .content { margin-bottom: 30px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                        .label { font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>وصل تسجيل تلف / سحب بضاعة</h1>
                        <p>رقم السجل: ${record.id} | التاريخ: ${format(new Date(record.createdAt), 'yyyy/MM/dd HH:mm')}</p>
                    </div>
                    <div class="content">
                        <div class="row"><span class="label">المنتج:</span> <span>${record.product.name}</span></div>
                        <div class="row"><span class="label">الكمية:</span> <span>${record.quantity} ${record.product.unit}</span></div>
                        <div class="row"><span class="label">النوع:</span> <span>${record.damageType}</span></div>
                        <div class="row"><span class="label">السبب:</span> <span>${record.reason || '-'}</span></div>
                        <div class="row"><span class="label">إجمالي الخسارة:</span> <span>${record.totalLoss.toLocaleString()} دج</span></div>
                    </div>
                    <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                        <span>توقيع المستلم: .....................</span>
                        <span>توقيع الإدارة: .....................</span>
                    </div>
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handlePrintOverviewTable = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const filtered = products
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())))
            .filter(p => {
                if (alertFilter === 'BELOW_MIN') return p.quantity <= p.minQuantity;
                if (alertFilter === 'ABOVE_MIN') return p.quantity > p.minQuantity;
                return true;
            });
        const tableRows = filtered.map(p => `
            <tr>
                <td>${p.code || '-'}</td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td style="text-align:center">${p.quantity} ${p.unit}</td>
                <td style="text-align:center">${(p.avgPurchasePrice || p.purchasePrice).toLocaleString()} دج</td>
                <td style="text-align:center">${((p.avgPurchasePrice || p.purchasePrice) * p.quantity).toLocaleString()} دج</td>
                <td style="text-align:center">${p.sellPrice.toLocaleString()} دج</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>جرد المخزون - ${format(new Date(), 'dd/MM/yyyy')}</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; direction: rtl; padding: 30px; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; }
                        th { background: #f0fdf4; padding: 10px; border: 1px solid #d1fae5; text-align: right; }
                        td { padding: 8px; border: 1px solid #d1fae5; }
                    </style>
                </head>
                <body>
                    <div class="header"><h1>تقرير جرد المخزون الحالي</h1></div>
                    <table>
                        <thead><tr><th>الكود</th><th>المنتج</th><th>الفئة</th><th>الكمية</th><th>التكلفة</th><th>إجمالي القيمة</th><th>سعر البيع</th></tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleExportOverviewExcel = () => {
        const filtered = products
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())))
            .filter(p => {
                if (alertFilter === 'BELOW_MIN') return p.quantity <= p.minQuantity;
                if (alertFilter === 'ABOVE_MIN') return p.quantity > p.minQuantity;
                return true;
            });
        const data = filtered.map(p => ({
            'الكود': p.code || '-',
            'المنتج': p.name,
            'الفئة': p.category,
            'الكمية': p.quantity,
            'الوحدة': p.unit,
            'سعر التكلفة': p.avgPurchasePrice || p.purchasePrice,
            'إجمالي القيمة': (p.avgPurchasePrice || p.purchasePrice) * p.quantity,
            'سعر البيع': p.sellPrice
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, `Inventory_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

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

    const handlePrintExpiryTable = () => {
        const productsToExport = products.filter(p => {
            if (!p.hasExpiryDate) return false;
            const activeBatches = p.batches || [];
            const batchExpiries = activeBatches.filter((b: any) => b.expiryDate).map((b: any) => new Date(b.expiryDate).getTime());
            const nearest = batchExpiries.length > 0 ? new Date(Math.min(...batchExpiries)) : (p.expiryDate ? new Date(p.expiryDate) : null);
            const isExpired = nearest && nearest < new Date();
            const isExpiring = nearest && nearest > new Date() && nearest < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            if (expiryStatusFilter === 'EXPIRED') return isExpired;
            if (expiryStatusFilter === 'EXPIRING') return isExpiring;
            if (expiryStatusFilter === 'VALID') return !isExpired && !isExpiring;
            return true;
        });

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const tableRows = productsToExport.map(p => {
            const activeBatches = p.batches || [];
            const batchExpiries = activeBatches.filter((b: any) => b.expiryDate).map((b: any) => new Date(b.expiryDate).getTime());
            const nearest = batchExpiries.length > 0 ? new Date(Math.min(...batchExpiries)) : (p.expiryDate ? new Date(p.expiryDate) : null);
            const isExpired = nearest && nearest < new Date();
            const isExpiring = nearest && nearest > new Date() && nearest < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            const expiredQty = activeBatches.filter((b: any) => b.expiryDate && new Date(b.expiryDate) < new Date()).reduce((sum: number, b: any) => sum + b.remainingQty, 0);
            const validQty = activeBatches.filter((b: any) => !b.expiryDate || new Date(b.expiryDate) >= new Date()).reduce((sum: number, b: any) => sum + b.remainingQty, 0);

            return `
                <tr>
                    <td>${p.code || '-'}</td>
                    <td>${p.name}</td>
                    <td style="text-align:center">${p.quantity}</td>
                    <td style="text-align:center;color:green">${validQty}</td>
                    <td style="text-align:center;color:red">${expiredQty}</td>
                    <td style="text-align:center">${activeBatches.length}</td>
                    <td style="text-align:center">${nearest ? format(nearest, 'dd/MM/yyyy') : '-'}</td>
                    <td style="text-align:center">${isExpired ? 'منتهية' : isExpiring ? 'قريبة' : 'صالحة'}</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>تقرير الصلاحية - ${format(new Date(), 'dd/MM/yyyy')}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 40px; color: #333; }
                        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1e40af; padding-bottom: 20px; }
                        h1 { color: #1e40af; margin: 0; font-size: 28px; }
                        .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                        th { background-color: #f1f5f9; color: #1e40af; padding: 12px; border: 1px solid #cbd5e1; text-align: right; }
                        td { padding: 10px; border: 1px solid #cbd5e1; text-align: right; }
                        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                        @media print {
                            body { padding: 20px; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>تقرير متابعة صلاحية المنتجات</h1>
                        <p>نظام إدارة المخزون الذكي</p>
                    </div>
                    <div class="info">
                        <span>تاريخ الاستخراج: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: ar })}</span>
                        <span>إجمالي المنتجات في التقرير: ${productsToExport.length}</span>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>الكود</th>
                                <th>اسم المنتج</th>
                                <th>الكمية</th>
                                <th>الصالحة</th>
                                <th>المنتهية</th>
                                <th>الدفعات</th>
                                <th>أقرب انتهاء</th>
                                <th>الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                    <div class="footer">
                        طبع بواسطة: الإدارة | جميع الحقوق محفوظة لشركة SKR Stock
                    </div>
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleExportExpiryExcel = () => {
        const productsToExport = products.filter(p => {
            if (!p.hasExpiryDate) return false;
            const activeBatches = p.batches || [];
            const batchExpiries = activeBatches.filter((b: any) => b.expiryDate).map((b: any) => new Date(b.expiryDate).getTime());
            const nearest = batchExpiries.length > 0 ? new Date(Math.min(...batchExpiries)) : (p.expiryDate ? new Date(p.expiryDate) : null);
            const isExpired = nearest && nearest < new Date();
            const isExpiring = nearest && nearest > new Date() && nearest < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            if (expiryStatusFilter === 'EXPIRED') return isExpired;
            if (expiryStatusFilter === 'EXPIRING') return isExpiring;
            if (expiryStatusFilter === 'VALID') return !isExpired && !isExpiring;
            return true;
        }).map(p => {
            const activeBatches = p.batches || [];
            const batchExpiries = activeBatches.filter((b: any) => b.expiryDate).map((b: any) => new Date(b.expiryDate).getTime());
            const nearest = batchExpiries.length > 0 ? new Date(Math.min(...batchExpiries)) : (p.expiryDate ? new Date(p.expiryDate) : null);
            const isExpired = nearest && nearest < new Date();
            const isExpiring = nearest && nearest > new Date() && nearest < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            const expiredQty = activeBatches.filter((b: any) => b.expiryDate && new Date(b.expiryDate) < new Date()).reduce((sum: number, b: any) => sum + b.remainingQty, 0);
            const validQty = activeBatches.filter((b: any) => !b.expiryDate || new Date(b.expiryDate) >= new Date()).reduce((sum: number, b: any) => sum + b.remainingQty, 0);

            return {
                'الكود': p.code || '-',
                'اسم المنتج': p.name,
                'التصنيف': p.category,
                'الكمية الإجمالية': p.quantity,
                'الكمية الصالحة': validQty,
                'الكمية المنتهية': expiredQty,
                'عدد الدفعات': activeBatches.length,
                'أقرب تاريخ انتهاء': nearest ? format(nearest, 'dd/MM/yyyy') : '-',
                'الحالة': isExpired ? 'منتهية الصلاحية' : isExpiring ? 'تنتهي قريباً' : 'صالح'
            };
        });

        const ws = XLSX.utils.json_to_sheet(productsToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Expiration Report");
        XLSX.writeFile(wb, `Expiry_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        setIsExportDropdownOpen(false);
    };

    const fetchTabContent = async () => {
        setLoading(true);
        try {
            if (activeTab === 'overview' || activeTab === 'cost' || activeTab === 'batches') {
                const query = new URLSearchParams({
                    type: moveTypeFilter,
                    from: dateFrom,
                    to: dateTo,
                    supplierId: supplierFilter
                });
                const res = await fetch(`/api/inventory?${query.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data.products);
                }
            } else if (activeTab === 'damaged') {
                const query = new URLSearchParams({
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

    const openProductHistory = async (product: Product) => {
        setSelectedProductForHistory(product);
        setIsHistoryModalOpen(true);
        setLoading(true);
        try {
            const query = new URLSearchParams({ productId: String(product.id) });
            const res = await fetch(`/api/inventory?${query.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setProductHistory(data.movements || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePrintHistory = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const tableContent = document.getElementById('history-table-print')?.innerHTML;
        printWindow.document.write(`
            <html>
                <head>
                    <title>سجل حركة المنتج</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; direction: rtl; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h2>سجل حركة المنتج: ${selectedProductForHistory?.name}</h2>
                    ${tableContent}
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handlePrintBatches = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const tableContent = document.getElementById('batches-table-print')?.innerHTML;
        printWindow.document.write(`
            <html>
                <head>
                    <title>تقرير دفعات المنتج</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; direction: rtl; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h2>تقرير دفعات المنتج: ${selectedProductForBatches?.name}</h2>
                    ${tableContent}
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleRecordDamage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDamage.productId || newDamage.quantity <= 0) return;

        const product = products.find(p => p.id === parseInt(newDamage.productId));
        if (!product) return;

        if (newDamage.quantity > product.quantity) {
            alert('خطأ: لا يمكن تسجيل كمية تالف أكبر من الكمية المتوفرة في المخزون');
            return;
        }

        if (confirm(`⚠️ سيتم خصم ${newDamage.quantity} وحدة من المخزون\n الخسارة المسجّلة: ${(newDamage.quantity * (product.avgPurchasePrice || product.purchasePrice)).toLocaleString()} دج\n هل أنت متأكد؟`)) {
            try {
                const typeLabels: any = {
                    'DAMAGED': 'تالف (فيزيائياً)',
                    'WITHDRAWN': 'مسحوب (بقرار)',
                    'LOST': 'مفقود / سرقة',
                    'EXPIRED': 'منتهي الصلاحية'
                };
                const finalReason = newDamage.reason || typeLabels[newDamage.damageType] || 'تسجيل تلف/سحب';

                const res = await fetch('/api/damaged', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...newDamage,
                        status: 'CONFIRMED',
                        reason: finalReason
                    })
                });
                if (res.ok) {
                    setIsDamageModalOpen(false);
                    setNewDamage({
                        productId: '', batchId: '', quantity: 0, reason: '', damageType: 'DAMAGED',
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

                <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm overflow-x-auto gap-1">
                    <button onClick={() => setActiveTab('overview')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>📦 المخزون الحالي</button>
                    <button onClick={() => setActiveTab('batches')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'batches' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>📦 دفعات بصلاحية</button>
                    <button onClick={() => setActiveTab('damaged')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'damaged' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>⚠️ التالف والضياع</button>
                </div>
            </div>

            {/* Content Areas */}


            {activeTab === 'overview' && (
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Summary Card for Inventory Value */}
                        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600">
                                    <DollarSign size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-700 mb-1">إجمالي قيمة المستودع الحالية</p>
                                    <h2 className="text-2xl lg:text-3xl font-black text-emerald-900">
                                        {products.reduce((sum, p) => sum + (p.quantity * (p.avgPurchasePrice || p.purchasePrice)), 0).toLocaleString()} دج
                                    </h2>
                                </div>
                            </div>
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded-full border border-emerald-200">محتسب بالمتوسط المرجح</span>
                            </div>
                        </div>

                        {/* Summary Card for Low Stock Alert */}
                        <div className={`p-6 rounded-2xl flex justify-between items-center shadow-sm border ${products.filter(p => p.quantity <= p.minQuantity).length > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 bg-white rounded-2xl shadow-sm ${products.filter(p => p.quantity <= p.minQuantity).length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-700 mb-1">منتجات وصلت للحد الأدنى</p>
                                    <h2 className={`text-2xl lg:text-3xl font-black ${products.filter(p => p.quantity <= p.minQuantity).length > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                                        {products.filter(p => p.quantity <= p.minQuantity).length} منتج
                                    </h2>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between no-print">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="text" placeholder="بحث بالاسم أو الكود..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-3 py-2.5 text-sm" />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button 
                                    onClick={() => setIsOverviewExportDropdownOpen(!isOverviewExportDropdownOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all text-xs font-bold border border-blue-200"
                                >
                                    <Download size={14} />
                                    تصدير
                                    <ChevronDown size={14} className={`transition-transform ${isOverviewExportDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {isOverviewExportDropdownOpen && (
                                    <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in duration-200 overflow-hidden">
                                        <button 
                                            onClick={() => { handleExportOverviewExcel(); setIsOverviewExportDropdownOpen(false); }}
                                            className="w-full text-right px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                                        >
                                            <FileText size={14} className="text-emerald-600" />
                                            Excel (.xlsx)
                                        </button>
                                        <button 
                                            onClick={() => { handlePrintOverviewTable(); setIsOverviewExportDropdownOpen(false); }}
                                            className="w-full text-right px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <FileText size={14} className="text-rose-600" />
                                            تقرير PDF
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={handlePrintOverviewTable}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-xs font-bold border border-gray-200"
                            >
                                <Printer size={14} /> طباعة
                            </button>

                            <div className="w-px h-6 bg-gray-200 mx-1"></div>



                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500">ترتيب:</span>
                                <select 
                                    value={sortBy} 
                                    onChange={e => setSortBy(e.target.value)}
                                    className="text-xs font-bold bg-white border border-gray-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                >
                                    <option value="name">🔤 الاسم</option>
                                    <option value="code">🔢 الكود</option>
                                    <option value="quantity">📦 الكمية</option>
                                    <option value="cost">💰 التكلفة</option>
                                    <option value="totalValue">📈 القيمة</option>
                                    <option value="sellPrice">🏷️ سعر البيع</option>
                                    <option value="profit">💵 الربح</option>
                                </select>
                                <button 
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="p-1.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500"
                                    title={sortOrder === 'asc' ? 'ترتيب تصاعدي' : 'ترتيب تنازلي'}
                                >
                                    {sortOrder === 'asc' ? <ArrowUpAZ size={14} /> : <ArrowDownZA size={14} />}
                                </button>
                            </div>

                            <div className="w-px h-6 bg-gray-200 mx-1"></div>

                            <span className="text-xs font-bold text-gray-500">تصفية:</span>
                            <select value={alertFilter} onChange={e => setAlertFilter(e.target.value as any)} className="text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm min-w-[120px]">
                                <option value="ALL">الكل</option>
                                <option value="BELOW_MIN">⚠️ أقل من الحد الأدنى</option>
                                <option value="ABOVE_MIN">✅ كمية كافية</option>
                            </select>
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-bold">الكود</th>
                                    <th className="px-4 py-3 font-bold">المنتج</th>
                                    <th className="px-4 py-3 font-bold">الفئة</th>
                                    <th className="px-4 py-3 font-bold text-center">الكمية</th>
                                    <th className="px-4 py-3 font-bold text-center text-amber-600">الحد الأدنى</th>
                                    <th className="px-4 py-3 font-bold text-center">متوسط التكلفة</th>
                                    <th className="px-4 py-3 font-bold text-center">إجمالي القيمة</th>
                                    <th className="px-4 py-3 font-bold text-center">سعر البيع</th>
                                    <th className="px-4 py-3 font-bold text-center">الربح المتوقع</th>
                                    <th className="px-4 py-3 font-bold text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products
                                    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())))
                                    .filter(p => {
                                        if (alertFilter === 'BELOW_MIN') return p.quantity <= p.minQuantity;
                                        if (alertFilter === 'ABOVE_MIN') return p.quantity > p.minQuantity;
                                        return true;
                                    })
                                    .sort((a, b) => {
                                        let valA: any, valB: any;
                                        const costA = a.avgPurchasePrice || a.purchasePrice;
                                        const costB = b.avgPurchasePrice || b.purchasePrice;

                                        switch(sortBy) {
                                            case 'code': valA = a.code || ''; valB = b.code || ''; break;
                                            case 'quantity': valA = a.quantity; valB = b.quantity; break;
                                            case 'cost': valA = costA; valB = costB; break;
                                            case 'totalValue': valA = costA * a.quantity; valB = costB * b.quantity; break;
                                            case 'sellPrice': valA = a.sellPrice; valB = b.sellPrice; break;
                                            case 'profit': valA = (a.sellPrice - costA); valB = (b.sellPrice - costB); break;
                                            default: valA = a.name; valB = b.name;
                                        }
                                        
                                        if (sortOrder === 'asc') {
                                            return valA > valB ? 1 : -1;
                                        } else {
                                            return valA < valB ? 1 : -1;
                                        }
                                    })
                                    .map(p => {
                                        const cost = p.avgPurchasePrice || p.purchasePrice;
                                        const profit = p.sellPrice - cost;
                                        const margin = (profit / cost) * 100;
                                        const isLowStock = p.quantity <= p.minQuantity;
                                        return (
                                            <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isLowStock ? 'bg-amber-50/20' : ''}`}>
                                                <td className="px-4 py-4 text-gray-500">{p.code || '-'}</td>
                                                <td className="px-4 py-4 font-bold">{p.name}</td>
                                                <td className="px-4 py-4">{p.category}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`font-bold text-lg ${isLowStock ? 'text-amber-600' : ''}`}>{p.quantity}</span> <span className="text-xs">{p.unit}</span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`font-bold px-2 py-1 rounded-xl border ${isLowStock ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                        {p.minQuantity}
                                                    </span>
                                                </td>
                                            <td className="px-4 py-4 text-center font-bold text-blue-600">{cost.toLocaleString()} دج</td>
                                            <td className="px-4 py-4 text-center font-bold">{(cost * p.quantity).toLocaleString()} دج</td>
                                            <td className="px-4 py-4 text-center font-bold text-emerald-600">{p.sellPrice.toLocaleString()} دج</td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="font-bold text-emerald-700">{Math.round(margin)}%</div>
                                                <div className="text-[10px] text-gray-400">({(profit * p.quantity).toLocaleString()} دج)</div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">

                                                    <button 
                                                        onClick={() => openProductHistory(p)}
                                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" 
                                                        title="عرض تفاصيل الحركة"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setNewDamage({ 
                                                                ...newDamage, 
                                                                productId: String(p.id), 
                                                                quantity: 0,
                                                                damageType: 'DAMAGED',
                                                                reason: '',
                                                                supplierId: String(p.supplierId || '') 
                                                            });
                                                            setIsDamageModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl transition-all" 
                                                        title="تسجيل تلف"
                                                    >
                                                        <AlertTriangle size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}



            {activeTab === 'batches' && (() => {
                const filteredExpiryProducts = products.filter(p => {
                    if (!p.hasExpiryDate) return false;
                    
                    const activeBatches = p.batches || [];
                    const batchExpiries = activeBatches
                        .filter((b: any) => b.expiryDate)
                        .map((b: any) => new Date(b.expiryDate).getTime());
                    
                    const nearest = batchExpiries.length > 0 
                        ? new Date(Math.min(...batchExpiries)) 
                        : (p.expiryDate ? new Date(p.expiryDate) : null);

                    const isExpired = nearest && nearest < new Date();
                    const isExpiring = nearest && nearest > new Date() && nearest < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    if (expiryStatusFilter === 'EXPIRED') return isExpired;
                    if (expiryStatusFilter === 'EXPIRING') return isExpiring;
                    if (expiryStatusFilter === 'VALID') return !isExpired && !isExpiring;
                    
                    return true;
                });

                return (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Batch Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Package size={24} /></div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">إجمالي المنتجات المراقبة</p>
                                    <h3 className="text-2xl font-black text-gray-900">{products.filter(p => p.hasExpiryDate).length}</h3>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><AlertTriangle size={24} /></div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">منتجات تنتهي قريباً</p>
                                    <h3 className="text-2xl font-black text-amber-600">
                                        {products.filter(p => {
                                            if (!p.hasExpiryDate) return false;
                                            const expiries = (p.batches || []).filter(b => b.expiryDate).map(b => new Date(b.expiryDate).getTime());
                                            const nearest = expiries.length > 0 ? Math.min(...expiries) : (p.expiryDate ? new Date(p.expiryDate).getTime() : null);
                                            return nearest && nearest > Date.now() && nearest < Date.now() + 30 * 24 * 60 * 60 * 1000;
                                        }).length}
                                    </h3>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><Trash2 size={24} /></div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">منتجات منتهية الصلاحية</p>
                                    <h3 className="text-2xl font-black text-red-600">
                                        {products.filter(p => {
                                            if (!p.hasExpiryDate) return false;
                                            const expiries = (p.batches || []).filter(b => b.expiryDate).map(b => new Date(b.expiryDate).getTime());
                                            const nearest = expiries.length > 0 ? Math.min(...expiries) : (p.expiryDate ? new Date(p.expiryDate).getTime() : null);
                                            return nearest && nearest < Date.now();
                                        }).length}
                                    </h3>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={24} /></div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">إجمالي القطع المنتهية</p>
                                    <h3 className="text-2xl font-black text-emerald-600">
                                        {products.filter(p => p.hasExpiryDate).reduce((total, p) => {
                                            const expiredSum = (p.batches || [])
                                                .filter(b => b.expiryDate && new Date(b.expiryDate) < new Date())
                                                .reduce((s, b) => s + b.remainingQty, 0);
                                            return total + expiredSum;
                                        }, 0).toLocaleString()}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {/* Products with Expiry Table */}
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Activity size={18} className="text-blue-600" />
                                    متابعة المنتجات ذات تاريخ الصلاحية
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <button 
                                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all text-xs font-bold border border-blue-200"
                                        >
                                            <Download size={14} />
                                            تصدير
                                            <ChevronDown size={14} className={`transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {isExportDropdownOpen && (
                                            <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in duration-200 overflow-hidden">
                                                <button 
                                                    onClick={handleExportExpiryExcel}
                                                    className="w-full text-right px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                                                >
                                                    <FileText size={14} className="text-emerald-600" />
                                                    تصدير Excel (.xlsx)
                                                </button>
                                                <button 
                                                    onClick={handlePrintExpiryTable}
                                                    className="w-full text-right px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                    <FileText size={14} className="text-rose-600" />
                                                    تصدير PDF
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={handlePrintExpiryTable}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-xs font-bold border border-gray-200"
                                    >
                                        <Printer size={14} />
                                        طباعة
                                    </button>

                                    <div className="w-px h-6 bg-gray-200 mx-1"></div>

                                    <span className="text-xs font-bold text-gray-500">تصفية:</span>
                                    <select 
                                        value={expiryStatusFilter}
                                        onChange={(e) => setExpiryStatusFilter(e.target.value)}
                                        className="text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm min-w-[120px]"
                                    >
                                        <option value="ALL">الكل</option>
                                        <option value="EXPIRED" className="text-red-600 font-bold">🔴 منتهي</option>
                                        <option value="EXPIRING" className="text-amber-600 font-bold">⚠️ قريباً</option>
                                        <option value="VALID" className="text-emerald-600 font-bold">✅ صالح</option>
                                    </select>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-gray-50/50 text-gray-600 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">كود المنتج</th>
                                            <th className="px-6 py-4 font-bold">المنتج</th>
                                            <th className="px-6 py-4 font-bold text-center">الكمية الإجمالية</th>
                                            <th className="px-6 py-4 font-bold text-center text-emerald-600">الكمية الصالحة</th>
                                            <th className="px-6 py-4 font-bold text-center text-red-600">الكمية المنتهية</th>
                                            <th className="px-6 py-4 font-bold text-center">عدد الدفعات</th>
                                            <th className="px-6 py-4 font-bold text-center">أقرب تاريخ انتهاء</th>
                                            <th className="px-6 py-4 font-bold text-center">الأيام المتبقية</th>
                                            <th className="px-6 py-4 font-bold text-center">الحالة</th>
                                            <th className="px-6 py-4 font-bold text-center">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            <tr><td colSpan={9} className="text-center py-20 text-gray-400 font-bold">جاري التحميل...</td></tr>
                                        ) : filteredExpiryProducts.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="px-6 py-20 text-center text-gray-400 font-bold italic bg-gray-50/30">
                                                    لا توجد منتجات تطابق هذا الفلتر حالياً.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredExpiryProducts.map((p: any) => {
                                                const activeBatches = p.batches || [];
                                                const batchExpiries = activeBatches
                                                    .filter((b: any) => b.expiryDate)
                                                    .map((b: any) => new Date(b.expiryDate).getTime());
                                                
                                                const nearestBatchExpiry = batchExpiries.length > 0 
                                                    ? new Date(Math.min(...batchExpiries)) 
                                                    : (p.expiryDate ? new Date(p.expiryDate) : null);

                                                const isExpired = nearestBatchExpiry && nearestBatchExpiry < new Date();
                                                const isExpiring = nearestBatchExpiry && nearestBatchExpiry > new Date() && nearestBatchExpiry < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                                                const hasUnbatchedStock = p.quantity > 0 && activeBatches.length === 0;

                                                const expiredQty = activeBatches
                                                    .filter((b: any) => b.expiryDate && new Date(b.expiryDate) < new Date())
                                                    .reduce((sum: number, b: any) => sum + b.remainingQty, 0);
                                                
                                                const validQty = activeBatches
                                                    .filter((b: any) => !b.expiryDate || new Date(b.expiryDate) >= new Date())
                                                    .reduce((sum: number, b: any) => sum + b.remainingQty, 0);
                                                
                                                const finalValidQty = hasUnbatchedStock ? p.quantity : validQty;

                                                return (
                                                    <tr key={p.id} className={`hover:bg-blue-50/30 transition-colors ${isExpired ? 'bg-red-50/10' : isExpiring ? 'bg-amber-50/10' : ''}`}>
                                                        <td className="px-6 py-4 font-mono text-gray-500">{p.code || '-'}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-gray-900">{p.name}</span>
                                                                <span className="text-[10px] text-gray-500">{p.category}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-black text-gray-900 text-base">{p.quantity}</span>
                                                                    <span className="text-[10px] text-gray-500">{p.unit}</span>
                                                                </div>
                                                                {hasUnbatchedStock && (
                                                                    <span className="text-[9px] bg-rose-100 text-rose-600 px-1 rounded font-bold" title="الكمية موجودة ولكن لم يتم تقسيمها لدفعات بصلاحية">مخزون غير مجدول</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="font-bold text-emerald-600 text-base">{finalValidQty}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`font-bold text-base ${expiredQty > 0 ? 'text-red-600' : 'text-gray-300'}`}>{expiredQty}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${activeBatches.length > 0 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                                                                {activeBatches.length} دفعات
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {nearestBatchExpiry ? (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <Calendar size={14} className={isExpired ? 'text-red-500' : isExpiring ? 'text-amber-500' : 'text-gray-400'} />
                                                                    <span className={`font-bold ${isExpired ? 'text-red-600' : isExpiring ? 'text-amber-600' : 'text-gray-700'}`}>
                                                                        {format(nearestBatchExpiry, 'dd/MM/yyyy')}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-300 italic text-xs">لا يوجد تاريخ</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {nearestBatchExpiry ? (() => {
                                                                const diffTime = nearestBatchExpiry.getTime() - new Date().getTime();
                                                                const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                                return (
                                                                    <span className={`font-black font-sans px-2 py-0.5 rounded-xl border ${
                                                                        days < 0 ? 'bg-red-100 text-red-700 border-red-200' : 
                                                                        days <= 30 ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                                                        'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                    }`}>
                                                                        {days < 0 ? `منتهي (${Math.abs(days)})` : `${days} يوم`}
                                                                    </span>
                                                                );
                                                            })() : (
                                                                <span className="text-gray-300">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2 py-1 rounded-md text-[10px] font-black tracking-tight border
                                                                ${isExpired ? 'bg-red-100 text-red-700 border-red-200' :
                                                                    isExpiring ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                        'bg-green-100 text-green-700 border-green-200'}`}>
                                                                {isExpired ? 'بضاعة منتهية' : isExpiring ? 'تنتهي قريباً' : 'صالح'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button 
                                                                    onClick={() => {
                                                                        setSelectedProductForBatches(p);
                                                                        setIsBatchDetailModalOpen(true);
                                                                    }}
                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" 
                                                                    title="عرض تفاصيل الدفعات"
                                                                >
                                                                        <Package size={18} />
                                                                </button>
                                                                {expiredQty > 0 && (
                                                                    <button 
                                                                        onClick={() => {
                                                                            setNewDamage({
                                                                                ...newDamage,
                                                                                productId: String(p.id),
                                                                                quantity: expiredQty,
                                                                                damageType: 'EXPIRED',
                                                                                reason: 'سحب بضاعة منتهية الصلاحية (آلي)',
                                                                                supplierId: String(p.supplierId || '')
                                                                            });
                                                                            setIsDamageModalOpen(true);
                                                                        }}
                                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl transition-all" 
                                                                        title="تسجيل تلف للمنتهي"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                )}
                                                            </div>
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
                );
            })()}

            {activeTab === 'damaged' && (
                <div className="flex flex-col gap-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border-r-4 border-r-red-500 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-red-50 rounded-xl"><TrendingUp className="text-red-500" size={20} /></div>
                                <span className="text-xs font-bold text-red-500">هذا الشهر</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-1">إجمالي الخسائر</div>
                            <div className="text-xl font-bold text-gray-900">{(damagedStats?.totalLossThisMonth || 0).toLocaleString()} دج</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border-r-4 border-r-red-600 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-red-50 rounded-xl"><Activity className="text-red-600" size={20} /></div>
                                <span className="text-xs font-bold text-red-600">هذا العام</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-1">إجمالي الخسائر السنوية</div>
                            <div className="text-xl font-bold text-gray-900">{(damagedStats?.totalLossThisYear || 0).toLocaleString()} دج</div>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between no-print">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-white border rounded-xl p-2 text-sm flex-1 md:w-40">
                                <option value="ALL">كل أنواع المشاكل</option>
                                <option value="DAMAGED">تالف</option>
                                <option value="EXPIRED">منتهي الصلاحية</option>
                                <option value="WITHDRAWN">مسحوب</option>
                                <option value="LOST">مفقود</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button 
                                    onClick={() => setIsDamagedExportDropdownOpen(!isDamagedExportDropdownOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all text-xs font-bold border border-red-200"
                                >
                                    <Download size={14} />
                                    تصدير
                                    <ChevronDown size={14} className={`transition-transform ${isDamagedExportDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {isDamagedExportDropdownOpen && (
                                    <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in duration-200 overflow-hidden">
                                        <button 
                                            onClick={() => { handleExportDamagedExcel(); setIsDamagedExportDropdownOpen(false); }}
                                            className="w-full text-right px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                                        >
                                            <FileText size={14} className="text-emerald-600" />
                                            Excel (.xlsx)
                                        </button>
                                        <button 
                                            onClick={() => { handlePrintDamagedTable(); setIsDamagedExportDropdownOpen(false); }}
                                            className="w-full text-right px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <FileText size={14} className="text-rose-600" />
                                            تقرير PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={handlePrintDamagedTable}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-xs font-bold border border-gray-200"
                            >
                                <Printer size={14} /> طباعة
                            </button>
                        </div>
                    </div>

                    {/* Damaged List */}
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-bold">التاريخ</th>
                                    <th className="px-4 py-3 font-bold">المنتج</th>
                                    <th className="px-4 py-3 font-bold text-center">الكمية</th>
                                    <th className="px-4 py-3 font-bold text-center">النوع</th>
                                    <th className="px-4 py-3 font-bold text-center">الخسارة</th>
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
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handlePrintDamageReceipt(d)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl flex items-center gap-1 text-xs font-bold" 
                                                    title="طباعة الوصل"
                                                >
                                                    <Printer size={16} /> وصل
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
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Trash2 className="text-red-500" /> تسجيل تلف أو سحب بضاعة</h2>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${newDamage.damageType === 'EXPIRED' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                    {newDamage.damageType === 'EXPIRED' ? '📋 تقرير آلي (سحب منتهي)' : '✍️ تقرير يدوي'}
                                </span>
                            </div>
                            <button onClick={() => setIsDamageModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X /></button>
                        </div>
                        <form onSubmit={handleRecordDamage} className="p-6 flex flex-col gap-4">
                            {(() => {
                                const selectedProduct = products.find(p => String(p.id) === newDamage.productId);
                                
                                // Calculate expired qty specifically for this product
                                const expiredQty = (selectedProduct?.batches || [])
                                    .filter((b: any) => b.expiryDate && new Date(b.expiryDate) < new Date())
                                    .reduce((sum: number, b: any) => sum + b.remainingQty, 0);

                                const maxAllowed = newDamage.damageType === 'EXPIRED' ? expiredQty : (selectedProduct?.quantity || 0);
                                const isOverLimit = newDamage.quantity > maxAllowed;

                                return (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-bold">المنتج*</label>
                                                <div className="bg-gray-100 border rounded-xl p-2.5 text-sm font-bold text-gray-700">
                                                    {selectedProduct?.name || 'لم يتم اختيار منتج'} 
                                                    {selectedProduct && (
                                                        <span className="text-blue-600 mr-2">
                                                            ({newDamage.damageType === 'EXPIRED' ? `المنتهي المتوفر: ${expiredQty}` : `متوفر: ${selectedProduct.quantity}`})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-bold">الكمية*</label>
                                                <input 
                                                    required 
                                                    type="number" 
                                                    readOnly={newDamage.damageType === 'EXPIRED'}
                                                    value={newDamage.quantity} 
                                                    onChange={e => setNewDamage({ ...newDamage, quantity: parseInt(e.target.value) || 0 })} 
                                                    className={`bg-white border rounded-xl p-2.5 text-sm ${newDamage.damageType === 'EXPIRED' ? 'bg-gray-100 font-bold' : ''} ${isOverLimit ? 'border-red-500 focus:ring-red-500 bg-red-50' : ''}`} 
                                                />
                                                {isOverLimit && (
                                                    <p className="text-[10px] text-red-600 font-bold animate-pulse">يرجى إدخال رقم أصغر من {newDamage.damageType === 'EXPIRED' ? 'الكمية المنتهية' : 'المتوفر في المخزون'}</p>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-bold">النوع*</label>
                                                <select 
                                                    required 
                                                    disabled={newDamage.damageType === 'EXPIRED'}
                                                    value={newDamage.damageType} 
                                                    onChange={e => setNewDamage({ ...newDamage, damageType: e.target.value })} 
                                                    className={`bg-white border rounded-xl p-2.5 text-sm ${newDamage.damageType === 'EXPIRED' ? 'bg-gray-100 font-bold opacity-100' : ''}`}
                                                >
                                                    <option value="DAMAGED">🔴 تالف (فيزيائياً)</option>
                                                    <option value="WITHDRAWN">🟡 مسحوب (بقرار)</option>
                                                    <option value="LOST">⚫ مفقود / سرقة</option>
                                                    <option value="EXPIRED">🚫 منتهي الصلاحية</option>
                                                </select>
                                            </div>
                                        </div>



                                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex justify-between items-center mt-2">
                                            <div className="flex-1">
                                                <div className="text-xs text-red-600 font-bold">الخسارة المحتملة</div>
                                                <div className="text-xl font-black text-red-700">
                                                    {((newDamage.quantity || 0) * (selectedProduct?.avgPurchasePrice || selectedProduct?.purchasePrice || 0)).toLocaleString()} دج
                                                </div>
                                            </div>
                                            <div className="text-left text-[10px] text-red-400 font-bold">بناءً على متوسط سعر الشراء</div>
                                        </div>

                                        <button 
                                            type="submit" 
                                            disabled={isOverLimit}
                                            className={`font-bold py-3 rounded-2xl shadow-lg transition-all mt-2 text-white ${isOverLimit ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}
                                        >
                                            {isOverLimit ? (newDamage.damageType === 'EXPIRED' ? 'تجاوزت الكمية المنتهية' : 'الكمية غير متوفرة') : 'حفظ السجل وخصم المخزون'}
                                        </button>
                                    </>
                                );
                            })()}
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
                                <select required value={returnForm.supplierId} onChange={e => setReturnForm({ ...returnForm, supplierId: e.target.value })} className="bg-white border rounded-xl p-2.5 text-sm">
                                    <option value="">اختر المورد...</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold">المبلغ المسترد</label>
                                <input required type="number" value={returnForm.refundAmount} onChange={e => setReturnForm({ ...returnForm, refundAmount: parseFloat(e.target.value) || 0 })} className="bg-white border rounded-xl p-2.5 text-sm" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold">ملاحظات</label>
                                <textarea value={returnForm.notes} onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })} className="bg-white border rounded-xl p-2.5 text-sm min-h-[80px]" />
                            </div>
                            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl shadow-lg transition-all">
                                تأكيد الإرجاع وتحديث حساب المورد
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Product History Modal */}
            {isHistoryModalOpen && selectedProductForHistory && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50/80">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">سجل حركة المنتج: {selectedProductForHistory.name}</h2>
                                    <p className="text-xs font-bold text-gray-500 mt-0.5">{selectedProductForHistory.code || 'بدون كود'} | الكمية الحالية: {selectedProductForHistory.quantity} {selectedProductForHistory.unit}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handlePrintHistory}
                                    className="bg-gray-900 text-white px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-gray-800 transition-all shadow-md"
                                >
                                    <Printer size={16} /> طباعة السجل
                                </button>
                                <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 bg-white border rounded-2xl hover:shadow-sm transition-all"><X /></button>
                            </div>
                        </div>

                        <div className="p-6 border-b bg-white flex flex-wrap gap-4 items-center no-print">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500">من:</span>
                                <input type="date" value={historyFilters.from} onChange={e => setHistoryFilters({...historyFilters, from: e.target.value})} className="border rounded-2xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500">إلى:</span>
                                <input type="date" value={historyFilters.to} onChange={e => setHistoryFilters({...historyFilters, to: e.target.value})} className="border rounded-2xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500">النوع:</span>
                                <select value={historyFilters.type} onChange={e => setHistoryFilters({...historyFilters, type: e.target.value})} className="border rounded-2xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20">
                                    <option value="ALL">الكل</option>
                                    <option value="IN">دخول 🟢</option>
                                    <option value="OUT">خروج 🔴</option>
                                    <option value="ADJUST">تعديل 🟡</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                            <div id="history-table-print" className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-right text-sm border-collapse">
                                    <thead className="bg-gray-100 text-gray-600 border-b">
                                        <tr>
                                            <th className="px-4 py-4 font-black">التاريخ</th>
                                            <th className="px-4 py-4 font-black">النوع</th>
                                            <th className="px-4 py-4 font-black text-center">الكمية</th>
                                            <th className="px-4 py-4 font-black text-center">سعر الوحدة</th>
                                            <th className="px-4 py-4 font-black text-center">الإجمالي</th>
                                            <th className="px-4 py-4 font-black text-center">رصيد بعد</th>
                                            <th className="px-4 py-4 font-black text-center">متبقي من الدفعة</th>
                                            <th className="px-4 py-4 font-black">السبب/المستند</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            <tr><td colSpan={7} className="text-center py-20 font-bold text-gray-400">جاري تحميل البيانات...</td></tr>
                                        ) : productHistory.filter(m => {
                                            const matchesType = historyFilters.type === 'ALL' || m.movementType === historyFilters.type;
                                            const matchesFrom = !historyFilters.from || new Date(m.createdAt) >= new Date(historyFilters.from);
                                            const matchesTo = !historyFilters.to || new Date(m.createdAt) <= new Date(historyFilters.to + 'T23:59:59');
                                            return matchesType && matchesFrom && matchesTo;
                                        }).length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-20 font-bold text-gray-400">لا توجد حركات مطابقة للفلاتر</td></tr>
                                        ) : productHistory.filter(m => {
                                            const matchesType = historyFilters.type === 'ALL' || m.movementType === historyFilters.type;
                                            const matchesFrom = !historyFilters.from || new Date(m.createdAt) >= new Date(historyFilters.from);
                                            const matchesTo = !historyFilters.to || new Date(m.createdAt) <= new Date(historyFilters.to + 'T23:59:59');
                                            return matchesType && matchesFrom && matchesTo;
                                        }).map(m => (
                                            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-4 font-bold text-gray-600">{format(new Date(m.createdAt), 'yyyy/MM/dd HH:mm')}</td>
                                                <td className="px-4 py-4 font-black">
                                                    {m.movementType === 'IN' ? <span className="text-emerald-600">دخول 🟢</span> : m.movementType === 'OUT' ? <span className="text-red-600">خروج 🔴</span> : <span className="text-amber-600">تعديل 🟡</span>}
                                                </td>
                                                <td className="px-4 py-4 text-center font-black text-base">{m.quantity}</td>
                                                <td className="px-4 py-4 text-center font-bold">{(m.unitCost || 0).toLocaleString()} دج</td>
                                                <td className="px-4 py-4 text-center font-black">{(m.totalCost || 0).toLocaleString()} دج</td>
                                                <td className="px-4 py-4 text-center font-black text-indigo-600 bg-indigo-50/30">{m.quantityAfter}</td>
                                                <td className="px-4 py-4 text-center font-bold text-emerald-700">
                                                    {(m as any).batchRemainingQty != null ? `${(m as any).batchRemainingQty}` : '-'}
                                                </td>
                                                <td className="px-4 py-4 text-xs font-bold text-gray-500">{m.order ? `طلب ${m.order.orderNumber}` : m.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Batch Detail Modal */}
            {isBatchDetailModalOpen && selectedProductForBatches && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50/80">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                                    <Package size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">تفاصيل دفعات المنتج: {selectedProductForBatches.name}</h2>
                                    <p className="text-xs font-bold text-gray-500 mt-0.5">الكود: {selectedProductForBatches.code || '-'} | إجمالي الكمية: {selectedProductForBatches.quantity} {selectedProductForBatches.unit}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handlePrintBatches}
                                    className="bg-gray-900 text-white px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-gray-800 transition-all shadow-md"
                                >
                                    <Printer size={16} /> طباعة التقرير
                                </button>
                                <button onClick={() => setIsBatchDetailModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 bg-white border rounded-2xl hover:shadow-sm transition-all"><X /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6" id="batches-table-print">
                            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-4 font-bold text-gray-600">تاريخ الاستلام</th>
                                            <th className="px-6 py-4 font-bold text-gray-600">المورد</th>
                                            <th className="px-6 py-4 font-bold text-gray-600 text-center">الكمية المتبقية</th>
                                            <th className="px-6 py-4 font-bold text-gray-600 text-center">تاريخ الانتهاء</th>
                                            <th className="px-6 py-4 font-bold text-gray-600 text-center">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedProductForBatches.batches && selectedProductForBatches.batches.length > 0 ? (
                                            selectedProductForBatches.batches.map((b: any) => {
                                                const expiryDate = b.expiryDate ? new Date(b.expiryDate) : null;
                                                const isExpired = expiryDate && expiryDate < new Date();
                                                const isExpiring = expiryDate && !isExpired && expiryDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                                                return (
                                                    <tr key={b.id} className={`border-b last:border-0 hover:bg-gray-50/50 ${isExpired ? 'bg-red-50/30' : ''}`}>
                                                        <td className="px-6 py-4 text-gray-500">
                                                            {b.purchaseDate ? format(new Date(b.purchaseDate), 'dd/MM/yyyy') : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-gray-700">
                                                            {b.supplier?.name || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="font-black text-gray-900">{b.remainingQty}</span>
                                                            <span className="text-[10px] text-gray-400 mr-1">{selectedProductForBatches.unit}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {b.expiryDate ? (
                                                                <span className={`font-bold ${isExpired ? 'text-red-600' : isExpiring ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                                    {format(new Date(b.expiryDate), 'dd/MM/yyyy')}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2 py-1 rounded-md text-[10px] font-black border
                                                                ${isExpired ? 'bg-red-100 text-red-700 border-red-200' :
                                                                    isExpiring ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                        'bg-green-100 text-green-700 border-green-200'}`}>
                                                                {isExpired ? 'منتهية الصلاحية' : isExpiring ? 'تنتهي قريباً' : 'صالحة'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                                                    لا توجد بيانات دفعات مفصلة لهذا المنتج حالياً.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>


                    </div>
                </div>
            )}
        </div>
    );
}
