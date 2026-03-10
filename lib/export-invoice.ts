import * as XLSX from 'xlsx';
import { formatDate } from '@/lib/utils';

interface InvoiceItem {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface ExportInvoiceData {
    invoiceNumber: string;
    date: string;
    customerName: string;
    projectName?: string;
    items: InvoiceItem[];
    grandTotal: number;
}

/**
 * Professional Excel Export using SheetJS
 */
export function exportInvoiceToExcel(data: ExportInvoiceData) {
    const { invoiceNumber, date, customerName, projectName, items, grandTotal } = data;

    // 1. Create Worksheet
    const ws = XLSX.utils.aoa_to_sheet([
        ["مخزوني — فاتورة مبيعات"], // Merged header
        [],
        ["رقم الفاتورة:", invoiceNumber],
        ["التاريخ:", formatDate(date)],
        ["العميل:", customerName],
        ["المشروع:", projectName || "-"],
        [],
        ["المنتج", "الكمية", "سعر الوحدة", "المجموع"], // Table Headers
    ]);

    // 2. Add Data Rows
    const startRow = 8;
    items.forEach((item, index) => {
        const rowIdx = startRow + index;
        XLSX.utils.sheet_add_aoa(ws, [[
            item.name,
            item.quantity,
            item.unitPrice,
            item.total
        ]], { origin: rowIdx });
    });

    // 3. Add Footer Total
    const footerRowIdx = startRow + items.length;
    XLSX.utils.sheet_add_aoa(ws, [[
        "الإجمالي الصافي",
        "",
        "",
        grandTotal
    ]], { origin: footerRowIdx });

    // 4. Formatting Properties (Note: xlsx community has limited styling support, 
    // but we can set column widths and basic structure)
    ws['!cols'] = [
        { wch: 30 }, // A
        { wch: 12 }, // B
        { wch: 15 }, // C
        { wch: 15 }, // D
    ];

    // Merges
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } } // Merge Row 1 A-D
    ];

    // 5. Create Workbook and Save
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "فاتورة");

    XLSX.writeFile(wb, `فاتورة-${invoiceNumber}.xlsx`);
}
