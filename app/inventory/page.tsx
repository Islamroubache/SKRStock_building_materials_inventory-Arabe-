'use client';

import { useSearchParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import {
    Package, Search, AlertTriangle, Activity,
    ArrowDownRight, ArrowUpRight, CopyPlus, Filter,
    TrendingUp, Trash2, CheckCircle, RotateCcw,
    Calendar, User, FileText, DollarSign, PlusCircle, X,
    Download, Printer, ChevronDown, ArrowUpAZ, ArrowDownZA, FileSpreadsheet
} from 'lucide-react';
import { printDocument } from '@/lib/print-helper';
import PageHeader from '@/components/PageHeader';
import DateRangePicker from '@/components/DateRangePicker';
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
    const [showDamageConfirm, setShowDamageConfirm] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [isBatchDetailModalOpen, setIsBatchDetailModalOpen] = useState(false);
    const [selectedDamageRecord, setSelectedDamageRecord] = useState<DamagedProduct | null>(null);
    const [selectedProductForBatches, setSelectedProductForBatches] = useState<Product | null>(null);

    const [expiryStatusFilter, setExpiryStatusFilter] = useState('ALL');
    const [alertFilter, setAlertFilter] = useState<'ALL' | 'BELOW_MIN' | 'ABOVE_MIN'>('ALL');
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const [isOverviewExportDropdownOpen, setIsOverviewExportDropdownOpen] = useState(false);
    const [isDamagedExportDropdownOpen, setIsDamagedExportDropdownOpen] = useState(false);
    const [sortBy, setSortBy] = useState<string>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

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

    const searchParams = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get('tab');
        const filter = searchParams.get('filter');

        if (tab === 'overview' || tab === 'damaged' || tab === 'batches') {
            setActiveTab(tab);
        }

        if (filter === 'BELOW_MIN') {
            setAlertFilter('BELOW_MIN');
        } else if (filter === 'EXPIRED') {
            setExpiryStatusFilter('EXPIRED');
        }
    }, [searchParams]);

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

    const handleRecordDamage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDamage.productId || newDamage.quantity <= 0) return;

        const product = products.find(p => p.id === parseInt(newDamage.productId));
        if (!product) return;

        if (newDamage.quantity > (newDamage.damageType === 'EXPIRED' ? 
            (product.batches || []).filter((b: any) => b.expiryDate && new Date(b.expiryDate) < new Date()).reduce((sum: number, b: any) => sum + b.remainingQty, 0) 
            : product.quantity)) {
            alert('خطأ: الكمية المدخلة أكبر من المتوفر');
            return;
        }

        setShowDamageConfirm(true);
    };

    const executeRecordDamage = async () => {
        const product = products.find(p => p.id === parseInt(newDamage.productId));
        if (!product) return;

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
                setShowDamageConfirm(false);
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
        <div className="font-tajawal min-h-screen bg-white text-gray-900 flex flex-col gap-4 print:p-0 print:bg-white" dir="rtl">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 print:hidden p-4 md:p-6 pb-0">
                <PageHeader 
                    title="إدارة المخزون" 
                    subtitle="مراقبة حركة المخزون، التحويلات، والجرد الدوري" 
                    Icon={Package} 
                />
                <div className="flex gap-2 w-full lg:w-auto justify-end shrink-0">
                    <div className="relative group">
                        <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-black text-xs shadow-sm flex items-center gap-2 hover:bg-gray-50">
                            <Download size={14} className="text-blue-600"/> تصدير
                        </button>
                        <div className="absolute top-full left-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100]">
                            <button 
                                onClick={() => {
                                    if (activeTab === 'overview') handleExportOverviewExcel();
                                    else if (activeTab === 'batches') handleExportExpiryExcel();
                                    else if (activeTab === 'damaged') handleExportDamagedExcel();
                                }} 
                                className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-xs font-bold text-gray-700 flex items-center gap-2 border-b border-gray-50 transition-colors"
                            >
                                <FileSpreadsheet size={14} className="text-emerald-600"/> Excel (.xlsx)
                            </button>
                            <button 
                                onClick={() => {
                                    if (activeTab === 'overview') handlePrintOverviewTable();
                                    else if (activeTab === 'batches') handlePrintExpiryTable();
                                    else if (activeTab === 'damaged') handlePrintDamagedTable();
                                }} 
                                className="w-full text-right px-4 py-3 hover:bg-rose-50 text-xs font-bold text-gray-700 flex items-center gap-2 transition-colors"
                            >
                                <FileText size={14} className="text-rose-600"/> تقرير PDF
                            </button>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            if (activeTab === 'overview') handlePrintOverviewTable();
                            else if (activeTab === 'batches') handlePrintExpiryTable();
                            else if (activeTab === 'damaged') handlePrintDamagedTable();
                        }}
                        className="bg-[#8b5cf6] text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-[#7c3aed] transition-all shadow-lg active:scale-95"
                    >
                        <Printer size={16} /> طباعة القائمة
                    </button>
                </div>
            </div>

            {/* Subpages Tabs - Redesigned to match Fawatir style */}
            <div className="flex items-center gap-6 no-print mb-2 pb-1 px-4 md:px-6 pt-0 mt-[-8px]">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 ${activeTab === 'overview' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    المخزون الحالي
                </button>
                <button
                    onClick={() => setActiveTab('batches')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 ${activeTab === 'batches' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    دفعات بصلاحية
                </button>
                <button
                    onClick={() => setActiveTab('damaged')}
                    className={`px-4 py-3 text-sm font-black transition-all border-b-2 ${activeTab === 'damaged' ? 'text-[#8b5cf6] border-[#8b5cf6]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                    التالف والضياع
                </button>
            </div>

            {/* Unified Filters Box - Redesigned to match Fawatir style */}
            <div className="bg-white border border-gray-200 rounded-[2rem] p-4 shadow-sm flex flex-col gap-4 print:hidden mx-4 md:mx-6">
                <div className="flex flex-col lg:flex-row gap-3 items-center">
                    {/* Search Field */}
                    <div className="relative flex-1 min-w-[300px] group">
                        <input 
                            type="text" 
                            placeholder={activeTab === 'overview' ? "بحث بالاسم، الكود..." : activeTab === 'batches' ? "بحث بالمنتج أو الدفعة..." : "بحث بالمنتج، السبب..."}
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full h-[52px] bg-white border border-gray-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10 rounded-2xl pr-14 pl-4 text-sm font-bold transition-all outline-none shadow-sm"
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-[#8b5cf6] rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none">
                            <Search size={20} strokeWidth={3} />
                        </div>
                    </div>

                    {/* Tab Specific Filters */}
                    {activeTab === 'overview' && (
                        <>
                            {/* Sort By */}
                            <div className="relative group min-w-[160px]">
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
                                    className="w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                                >
                                    <div className="bg-[#8b5cf6]/10 p-1.5 rounded-lg text-[#8b5cf6]">
                                        <ArrowUpAZ size={14} />
                                    </div>
                                    <div className="flex-1 text-right">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">ترتيب حسب</p>
                                        <p className="text-[10px] font-black text-gray-900 mt-1">
                                            {sortBy === 'name' ? 'الاسم' : sortBy === 'code' ? 'الكود' : sortBy === 'quantity' ? 'الكمية' : sortBy === 'totalValue' ? 'إجمالي القيمة' : 'أخرى'}
                                        </p>
                                    </div>
                                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${activeDropdown === 'sort' ? 'rotate-180' : ''}`} />
                                </button>
                                {activeDropdown === 'sort' && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <button onClick={() => { setSortBy('name'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-violet-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">الاسم</button>
                                        <button onClick={() => { setSortBy('code'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-violet-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">الكود</button>
                                        <button onClick={() => { setSortBy('quantity'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-violet-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">الكمية</button>
                                        <button onClick={() => { setSortBy('totalValue'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-violet-50 text-[10px] font-black text-gray-700 transition-colors">إجمالي القيمة</button>
                                    </div>
                                )}
                            </div>

                            {/* Sort Order Toggle */}
                            <button 
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="h-[52px] w-[52px] bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md transition-all text-gray-500"
                                title={sortOrder === 'asc' ? 'ترتيب تصاعدي' : 'ترتيب تنازلي'}
                            >
                                {sortOrder === 'asc' ? <ArrowUpAZ size={20} /> : <ArrowDownZA size={20} />}
                            </button>

                            {/* Stock Filter */}
                            <div className="relative group min-w-[160px]">
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'stock' ? null : 'stock')}
                                    className="w-full h-[52px] flex items-center gap-3 bg-[#fbb815] border border-[#f59e0b] rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                                >
                                    <div className="bg-white/20 p-1.5 rounded-lg text-white">
                                        <Filter size={14} />
                                    </div>
                                    <div className="flex-1 text-right">
                                        <p className="text-[9px] font-black text-white/80 uppercase tracking-tighter leading-none">تصفية المخزون</p>
                                        <p className="text-[10px] font-black text-white mt-1">
                                            {alertFilter === 'ALL' ? 'الكل' : alertFilter === 'BELOW_MIN' ? 'أقل من الحد الأدنى' : 'كمية كافية'}
                                        </p>
                                    </div>
                                    <ChevronDown size={14} className={`text-white/60 transition-transform ${activeDropdown === 'stock' ? 'rotate-180' : ''}`} />
                                </button>
                                {activeDropdown === 'stock' && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <button onClick={() => { setAlertFilter('ALL'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-violet-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">الكل</button>
                                        <button onClick={() => { setAlertFilter('BELOW_MIN'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-amber-50 text-[10px] font-black text-amber-600 border-b border-gray-50 transition-colors">⚠️ أقل من الحد الأدنى</button>
                                        <button onClick={() => { setAlertFilter('ABOVE_MIN'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-[10px] font-black text-emerald-600 transition-colors">✅ كمية كافية</button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'batches' && (
                        <div className="relative group min-w-[160px]">
                            <button
                                onClick={() => setActiveDropdown(activeDropdown === 'expiry' ? null : 'expiry')}
                                className="w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                            >
                                <div className="bg-[#8b5cf6]/10 p-1.5 rounded-lg text-[#8b5cf6]">
                                    <Calendar size={14} />
                                </div>
                                <div className="flex-1 text-right">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">حالة الصلاحية</p>
                                    <p className="text-[10px] font-black text-gray-900 mt-1">
                                        {expiryStatusFilter === 'ALL' ? 'الكل' : expiryStatusFilter === 'EXPIRED' ? 'منتهي' : expiryStatusFilter === 'EXPIRING' ? 'ينتهي قريباً' : 'صالح'}
                                    </p>
                                </div>
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${activeDropdown === 'expiry' ? 'rotate-180' : ''}`} />
                            </button>
                            {activeDropdown === 'expiry' && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button onClick={() => { setExpiryStatusFilter('ALL'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-violet-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">الكل</button>
                                    <button onClick={() => { setExpiryStatusFilter('EXPIRED'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-red-50 text-[10px] font-black text-red-600 border-b border-gray-50 transition-colors">🔴 منتهي</button>
                                    <button onClick={() => { setExpiryStatusFilter('EXPIRING'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-amber-50 text-[10px] font-black text-amber-600 border-b border-gray-50 transition-colors">⚠️ ينتهي قريباً</button>
                                    <button onClick={() => { setExpiryStatusFilter('VALID'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-[10px] font-black text-emerald-600 transition-colors">✅ صالح</button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'damaged' && (
                        <div className="relative group min-w-[160px]">
                            <button
                                onClick={() => setActiveDropdown(activeDropdown === 'damageType' ? null : 'damageType')}
                                className="w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                            >
                                <div className="bg-[#8b5cf6]/10 p-1.5 rounded-lg text-[#8b5cf6]">
                                    <Trash2 size={14} />
                                </div>
                                <div className="flex-1 text-right">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">نوع الخسارة</p>
                                    <p className="text-[10px] font-black text-gray-900 mt-1">
                                        {typeFilter === 'ALL' ? 'الكل' : typeFilter === 'DAMAGED' ? 'تالف' : typeFilter === 'EXPIRED' ? 'منتهي' : 'أخرى'}
                                    </p>
                                </div>
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${activeDropdown === 'damageType' ? 'rotate-180' : ''}`} />
                            </button>
                            {activeDropdown === 'damageType' && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button onClick={() => { setTypeFilter('ALL'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-violet-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">الكل</button>
                                    <button onClick={() => { setTypeFilter('DAMAGED'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-red-50 text-[10px] font-black text-red-600 border-b border-gray-50 transition-colors">تالف</button>
                                    <button onClick={() => { setTypeFilter('EXPIRED'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-red-50 text-[10px] font-black text-red-600 border-b border-gray-50 transition-colors">منتهي الصلاحية</button>
                                    <button onClick={() => { setTypeFilter('WITHDRAWN'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-amber-50 text-[10px] font-black text-amber-600 border-b border-gray-50 transition-colors">مسحوب</button>
                                    <button onClick={() => { setTypeFilter('LOST'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-gray-100 text-[10px] font-black text-gray-700 transition-colors">مفقود</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Areas */}

            {activeTab === 'overview' && (() => {
                const filteredProducts = products
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
                    });

                const totalItems = filteredProducts.length;
                const indexOfLastItem = currentPage * itemsPerPage;
                const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

                return (
                    <div className="flex flex-col gap-6 px-4 md:px-6">
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">الكود</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">المنتج</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">الكمية</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">متوسط التكلفة</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">إجمالي القيمة</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">سعر البيع</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">الربح المتوقع</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {currentProducts.map(p => {
                                            const cost = p.avgPurchasePrice || p.purchasePrice;
                                            const profit = p.sellPrice - cost;
                                            const margin = cost > 0 ? (profit / cost) * 100 : 0;
                                            const isLowStock = p.quantity <= p.minQuantity;
                                            return (
                                                <tr key={p.id} className={`hover:bg-blue-50/30 transition-all group ${isLowStock ? 'bg-amber-50/10' : ''}`}>
                                                    <td className="px-8 py-6">
                                                        <span className="font-black text-gray-400 font-sans text-xs">{p.code || '---'}</span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-gray-900 leading-none mb-1">{p.name}</span>
                                                            <span className="text-[10px] font-black text-[#8b5cf6] uppercase tracking-tighter">{p.category || 'بدون فئة'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className={`font-black font-sans text-lg ${isLowStock ? 'text-amber-600' : 'text-gray-900'}`}>{p.quantity.toLocaleString()}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold">{p.unit}</span>
                                                            {isLowStock && <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full mt-1 font-black">تحت الحد: {p.minQuantity}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center font-black text-blue-600 font-sans">{cost.toLocaleString()} دج</td>
                                                    <td className="px-8 py-6 text-center font-black text-gray-900 font-sans">{(cost * p.quantity).toLocaleString()} دج</td>
                                                    <td className="px-8 py-6 text-center font-black text-emerald-600 font-sans">{p.sellPrice.toLocaleString()} دج</td>
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-black text-emerald-700 font-sans">{Math.round(margin)}%</span>
                                                            <span className="text-[10px] text-gray-400 font-bold">({(profit * p.quantity).toLocaleString()} دج)</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex justify-center gap-2">

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
                                                                className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm" 
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

                        {/* Pagination for Overview */}
                        {totalItems > itemsPerPage && (
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white px-8 py-6 rounded-[2rem] border border-gray-100 shadow-sm print:hidden mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100">
                                        <Package size={18} className="text-[#8b5cf6]" />
                                    </div>
                                    <p className="text-xs font-black text-gray-400">
                                        إظهار <span className="text-gray-900 font-sans">{(currentPage - 1) * itemsPerPage + 1}</span> إلى <span className="text-gray-900 font-sans">{Math.min(currentPage * itemsPerPage, totalItems)}</span> من أصل <span className="text-[#8b5cf6] font-sans">{totalItems}</span> منتج
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
                                        {currentPage} / {Math.ceil(totalItems / itemsPerPage)}
                                    </span>
                                    <button 
                                        onClick={() => { setCurrentPage(p => Math.min(Math.ceil(totalItems / itemsPerPage), p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
                                        className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        التالي
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

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

                const indexOfLastItemB = currentPage * itemsPerPage;
                const indexOfFirstItemB = indexOfLastItemB - itemsPerPage;
                const currentExpiryProducts = filteredExpiryProducts.slice(indexOfFirstItemB, indexOfLastItemB);
                const totalItemsB = filteredExpiryProducts.length;

                return (
                    <div className="space-y-6 animate-in fade-in duration-500 px-4 md:px-6">
                        {/* Batch Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Package size={24} /></div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">إجمالي المنتجات المراقبة</p>
                                    <h3 className="text-2xl font-black text-gray-900">{products.filter(p => p.hasExpiryDate).length}</h3>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle size={24} /></div>
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
                                <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Trash2 size={24} /></div>
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
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign size={24} /></div>
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
                        <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden min-h-[400px]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">الكود</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">المنتج</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">الكمية الإجمالية</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center text-emerald-600">الكمية الصالحة</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center text-red-600">الكمية المنتهية</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">أقرب انتهاء</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">الحالة</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading ? (
                                            <tr><td colSpan={8} className="px-8 py-20 text-center text-gray-400 font-black">جاري التحميل...</td></tr>
                                        ) : currentExpiryProducts.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-8 py-20 text-center text-gray-400 font-black italic bg-gray-50/30">
                                                    لا توجد منتجات تطابق هذا الفلتر حالياً.
                                                </td>
                                            </tr>
                                        ) : (
                                            currentExpiryProducts.map((p: any) => {
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
                                                    <tr key={p.id} className={`hover:bg-blue-50/30 transition-all group ${isExpired ? 'bg-red-50/10' : isExpiring ? 'bg-amber-50/10' : ''}`}>
                                                        <td className="px-8 py-6 font-black text-gray-400 font-sans text-xs">{p.code || '---'}</td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-gray-900 leading-none mb-1">{p.name}</span>
                                                                <span className="text-[10px] font-black text-[#8b5cf6] uppercase tracking-tighter">{p.category}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="font-black text-gray-900 text-lg font-sans">{p.quantity}</span>
                                                                <span className="text-[10px] text-gray-400 font-bold">{p.unit}</span>
                                                                {hasUnbatchedStock && (
                                                                    <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full mt-1 font-black">مخزون غير مجدول</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <span className="font-black text-emerald-600 text-lg font-sans">{finalValidQty}</span>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <span className={`font-black text-lg font-sans ${expiredQty > 0 ? 'text-red-600' : 'text-gray-300'}`}>{expiredQty}</span>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            {nearestBatchExpiry ? (
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <Calendar size={14} className={isExpired ? 'text-red-500' : isExpiring ? 'text-amber-500' : 'text-gray-400'} />
                                                                        <span className={`font-black font-sans ${isExpired ? 'text-red-600' : isExpiring ? 'text-amber-600' : 'text-gray-700'}`}>
                                                                            {format(nearestBatchExpiry, 'dd/MM/yyyy')}
                                                                        </span>
                                                                    </div>
                                                                    {(() => {
                                                                        const diffTime = nearestBatchExpiry.getTime() - new Date().getTime();
                                                                        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                                        return (
                                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                                                                days < 0 ? 'bg-red-100 text-red-700 border-red-200' : 
                                                                                days <= 30 ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                                                                'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                            }`}>
                                                                                {days < 0 ? `منتهي (${Math.abs(days)})` : `${days} يوم متبقي`}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-300 italic text-xs font-black">لا يوجد تاريخ</span>
                                                            )}
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest
                                                                ${isExpired ? 'bg-red-100 text-red-700 border-red-200' :
                                                                    isExpiring ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                        'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                                                                {isExpired ? 'بضاعة منتهية' : isExpiring ? 'تنتهي قريباً' : 'صالح'}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex justify-center gap-2">
                                                                <button 
                                                                    onClick={() => {
                                                                        setSelectedProductForBatches(p);
                                                                        setIsBatchDetailModalOpen(true);
                                                                    }}
                                                                    className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm" 
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
                                                                        className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm" 
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

                        {/* Pagination for Batches */}
                        {totalItemsB > itemsPerPage && (
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white px-8 py-6 rounded-[2rem] border border-gray-100 shadow-sm print:hidden mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100">
                                        <Calendar size={18} className="text-[#8b5cf6]" />
                                    </div>
                                    <p className="text-xs font-black text-gray-400">
                                        إظهار <span className="text-gray-900 font-sans">{(currentPage - 1) * itemsPerPage + 1}</span> إلى <span className="text-gray-900 font-sans">{Math.min(currentPage * itemsPerPage, totalItemsB)}</span> من أصل <span className="text-[#8b5cf6] font-sans">{totalItemsB}</span> منتج
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
                                        {currentPage} / {Math.ceil(totalItemsB / itemsPerPage)}
                                    </span>
                                    <button 
                                        onClick={() => { setCurrentPage(p => Math.min(Math.ceil(totalItemsB / itemsPerPage), p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        disabled={currentPage === Math.ceil(totalItemsB / itemsPerPage)}
                                        className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        التالي
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {activeTab === 'damaged' && (() => {
                const indexOfLastItemD = currentPage * itemsPerPage;
                const indexOfFirstItemD = indexOfLastItemD - itemsPerPage;
                const currentDamaged = damaged.slice(indexOfFirstItemD, indexOfLastItemD);
                const totalItemsD = damaged.length;

                return (
                    <div className="flex flex-col gap-6 px-4 md:px-6">
                        {/* Damaged List */}
                        <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">التاريخ</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right">المنتج والسبب</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">الكمية</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">النوع</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">إجمالي الخسارة</th>
                                            <th className="px-8 py-6 font-black text-gray-400 text-xs uppercase tracking-widest text-right text-center">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading ? (
                                            <tr><td colSpan={6} className="px-8 py-20 text-center text-gray-400 font-black">جاري التحميل...</td></tr>
                                        ) : currentDamaged.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-8 py-20 text-center text-gray-400 font-black italic bg-gray-50/30">
                                                    لا توجد سجلات تالفة حالياً.
                                                </td>
                                            </tr>
                                        ) : (
                                            currentDamaged.map(d => (
                                                <tr key={d.id} className="hover:bg-blue-50/30 transition-all group">
                                                    <td className="px-8 py-6">
                                                        <span className="font-black text-gray-900 font-sans tracking-tight">{format(new Date(d.createdAt), 'yyyy-MM-dd')}</span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-gray-900 leading-none mb-1">{d.product.name}</span>
                                                            <span className="text-[10px] font-black text-[#8b5cf6] uppercase tracking-tighter opacity-80">{d.reason}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-black text-gray-900 text-lg font-sans">{d.quantity.toLocaleString()}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold">{d.product.unit}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        {getDamageTypeBadge(d.damageType)}
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className="font-black text-red-600 font-sans text-lg">{d.totalLoss.toLocaleString()} دج</span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex justify-center">
                                                            <button 
                                                                onClick={() => handlePrintDamageReceipt(d)}
                                                                className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm flex items-center gap-2 text-xs font-black" 
                                                                title="طباعة الوصل"
                                                            >
                                                                <Printer size={16} /> طباعة الوصل
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination for Damaged */}
                        {totalItemsD > itemsPerPage && (
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white px-8 py-6 rounded-[2rem] border border-gray-100 shadow-sm print:hidden mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100">
                                        <Trash2 size={18} className="text-[#8b5cf6]" />
                                    </div>
                                    <p className="text-xs font-black text-gray-400">
                                        إظهار <span className="text-gray-900 font-sans">{(currentPage - 1) * itemsPerPage + 1}</span> إلى <span className="text-gray-900 font-sans">{Math.min(currentPage * itemsPerPage, totalItemsD)}</span> من أصل <span className="text-[#8b5cf6] font-sans">{totalItemsD}</span> سجل
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
                                        {currentPage} / {Math.ceil(totalItemsD / itemsPerPage)}
                                    </span>
                                    <button 
                                        onClick={() => { setCurrentPage(p => Math.min(Math.ceil(totalItemsD / itemsPerPage), p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        disabled={currentPage === Math.ceil(totalItemsD / itemsPerPage)}
                                        className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        التالي
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Record Damage Modal */}
            {isDamageModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex justify-between items-center bg-[#8b5cf6] text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl text-white">
                                    <Trash2 size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black">تسجيل تلف أو سحب بضاعة</h2>
                                    <p className="text-xs font-bold text-white/80 mt-0.5">
                                        {newDamage.damageType === 'EXPIRED' ? '📋 تقرير آلي (سحب منتهي)' : '✍️ تقرير يدوي'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsDamageModalOpen(false)} className="p-2 text-white/80 hover:text-white bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all">
                                <X />
                            </button>
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
                                                <div className="bg-gray-100 border rounded-lg p-2.5 text-sm font-bold text-gray-700">
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
                                                    value={newDamage.quantity || ''} 
                                                    onFocus={() => setNewDamage({ ...newDamage, quantity: '' as any })}
                                                    onChange={e => setNewDamage({ ...newDamage, quantity: parseInt(e.target.value) || 0 })} 
                                                    className={`bg-white border rounded-xl p-3 text-sm font-black focus:ring-4 focus:ring-violet-500/10 transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${newDamage.damageType === 'EXPIRED' ? 'bg-gray-100 text-gray-500' : 'text-gray-900 border-gray-200 focus:border-violet-300'} ${isOverLimit ? 'border-red-500 bg-red-50' : ''}`} 
                                                />

                                                {isOverLimit && (
                                                    <p className="text-[10px] text-red-600 font-bold animate-pulse">يرجى إدخال رقم أصغر من {newDamage.damageType === 'EXPIRED' ? 'الكمية المنتهية' : 'المتوفر في المخزون'}</p>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <div className="relative group">
                                                    <button
                                                        type="button"
                                                        disabled={newDamage.damageType === 'EXPIRED'}
                                                        onClick={() => setActiveDropdown(activeDropdown === 'damageType' ? null : 'damageType')}
                                                        className={`w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right ${newDamage.damageType === 'EXPIRED' ? 'bg-gray-100 opacity-100 cursor-not-allowed' : 'focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10'}`}
                                                    >
                                                        <div className="bg-[#8b5cf6]/10 p-1.5 rounded-lg text-[#8b5cf6]">
                                                            <Filter size={14} />
                                                        </div>
                                                        <div className="flex-1 text-right">
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">النوع</p>
                                                            <p className="text-[10px] font-black text-gray-900 mt-1">
                                                                {newDamage.damageType === 'DAMAGED' ? 'تالف (فيزيائياً)' : 
                                                                 newDamage.damageType === 'WITHDRAWN' ? 'مسحوب (بقرار)' : 
                                                                 newDamage.damageType === 'LOST' ? 'مفقود / سرقة' : 'منتهي الصلاحية'}
                                                            </p>
                                                        </div>
                                                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${activeDropdown === 'damageType' ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {activeDropdown === 'damageType' && (
                                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <button type="button" onClick={() => { setNewDamage({...newDamage, damageType: 'DAMAGED'}); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-violet-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">تالف (فيزيائياً)</button>
                                                            <button type="button" onClick={() => { setNewDamage({...newDamage, damageType: 'WITHDRAWN'}); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-violet-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">مسحوب (بقرار)</button>
                                                            <button type="button" onClick={() => { setNewDamage({...newDamage, damageType: 'LOST'}); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-violet-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">مفقود / سرقة</button>
                                                            <button type="button" onClick={() => { setNewDamage({...newDamage, damageType: 'EXPIRED'}); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-violet-50 text-[10px] font-black text-gray-700 transition-colors">منتهي الصلاحية</button>
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        </div>



                                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex justify-between items-center mt-2">
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
                                            className={`font-bold py-3 rounded-xl shadow-lg transition-all mt-2 text-white ${isOverLimit ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}
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
            {/* Custom Damage Confirmation Modal */}
            {showDamageConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-red-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-red-600">
                                <AlertTriangle size={40} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">تأكيد خصم المخزون</h3>
                            <div className="space-y-4 text-gray-500">
                                <p className="text-sm font-bold leading-relaxed">
                                    سيتم خصم <span className="text-gray-900 font-black font-sans">{newDamage.quantity}</span> وحدة من المخزون.
                                </p>
                                {(() => {
                                    const product = products.find(p => p.id === parseInt(newDamage.productId));
                                    const loss = (newDamage.quantity || 0) * (product?.avgPurchasePrice || product?.purchasePrice || 0);
                                    return (
                                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">الخسارة المسجّلة</p>
                                            <p className="text-lg font-black text-red-600 font-sans">{loss.toLocaleString()} دج</p>
                                        </div>
                                    );
                                })()}
                                <p className="text-xs font-bold">هل أنت متأكد من هذه العملية؟</p>
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 bg-gray-50/50 border-t border-gray-100">
                            <button 
                                onClick={executeRecordDamage}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-200 active:scale-95"
                            >
                                تأكيد الخصم
                            </button>
                            <button 
                                onClick={() => setShowDamageConfirm(false)}
                                className="flex-1 bg-white border border-gray-200 text-gray-700 font-black py-4 rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                            >
                                إلغاء
                            </button>
                        </div>
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
                                    className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-gray-800 transition-all shadow-md"
                                >
                                    <Printer size={16} /> طباعة التقرير
                                </button>
                                <button onClick={() => setIsBatchDetailModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 bg-white border rounded-xl hover:shadow-sm transition-all"><X /></button>
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
