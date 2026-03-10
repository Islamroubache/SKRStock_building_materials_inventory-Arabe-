import * as XLSX from 'xlsx';
import { getExpiryStatus } from './product-helpers';
import { formatDate } from '@/lib/utils';

export function exportProductsToExcel(products: any[]) {
    // Format the data
    const data = products.map((product) => {
        const profitMargin = product.purchasePrice > 0
            ? (((product.sellPrice - product.purchasePrice) / product.purchasePrice) * 100).toFixed(1) + '%'
            : '100%';

        let expiryText = '—';
        if (product.expiryDate) {
            expiryText = formatDate(product.expiryDate);
        }

        const status = getExpiryStatus(product.expiryDate);
        let statusText = 'صالح';
        if (status === 'expired') statusText = 'منتهي الصلاحية';
        if (status === 'expiring') statusText = 'ينتهي قريباً';
        if (status === 'none') statusText = 'بدون تاريخ';

        return {
            'الكود': product.code || '—',
            'الاسم': product.name,
            'الفئة': product.category,
            'المورد': product.supplier?.name || 'غير محدد',
            'الكمية': product.quantity,
            'الوحدة': product.unit,
            'سعر الشراء': product.purchasePrice,
            'سعر البيع': product.sellPrice,
            'هامش الربح%': profitMargin,
            'تاريخ انتهاء الصلاحية': expiryText,
            'الحالة': statusText
        };
    });

    const totalStockValue = products.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);

    // Add summary row
    data.push({
        'الكود': 'الإجمالي',
        'الاسم': products.length.toString() + ' منتج',
        'الفئة': '',
        'المورد': '',
        'الكمية': '',
        'الوحدة': '',
        'سعر الشراء': totalStockValue,
        'سعر البيع': '',
        'هامش الربح%': '',
        'تاريخ انتهاء الصلاحية': '',
        'الحالة': ''
    } as any);

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto width adjustments
    const colWidths = [
        { wch: 15 }, // Code
        { wch: 30 }, // Name
        { wch: 15 }, // Category
        { wch: 20 }, // Supplier
        { wch: 10 }, // Quantity
        { wch: 10 }, // Unit
        { wch: 15 }, // Purchase
        { wch: 15 }, // Sell
        { wch: 15 }, // Margin
        { wch: 20 }, // Expiry
        { wch: 15 }, // Status
    ];
    worksheet['!cols'] = colWidths;

    // Create workbook and export
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'قائمة المنتجات');

    // Note: Applying cell colors requires xlsx-js-style or Pro version for pure XLSX.
    // For standard xlsx library, we just export the data with the text statuses.

    const dateStr = formatDate(new Date()).replace(/\//g, '-');
    // Use Blob download instead of XLSX.writeFile (more reliable in Next.js/Turbopack)
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${dateStr}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
