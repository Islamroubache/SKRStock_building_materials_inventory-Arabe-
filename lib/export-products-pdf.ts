import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getExpiryStatus } from './product-helpers';
import { formatDate } from '@/lib/utils';

// Extend jsPDF interface if needed to avoid typescript errors for autotable
interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: { finalY: number };
}

export function exportProductsToPDF(products: any[]) {
    // Create new PDF document
    const doc = new jsPDF('l', 'mm', 'a4') as jsPDFWithAutoTable;

    // Support Arabic by using a font if added, but standard jspdf might need custom fonts.
    // For basic support, we will just use helvetica/times, but note that Arabic script in jsPDF requires
    // custom VFS font to render properly connected. For simple requirements, we use default strings.

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const dateStr = formatDate(new Date()).replace(/\//g, '-');

    // Add title (Right aligned for RTL concept, using doc width)
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    doc.text(`قائمة المنتجات — مخزوني (${dateStr})`, pageWidth - 20, 20, { align: 'right' });

    // Format data for table
    const tableData = products.map(product => {
        const profitMargin = product.purchasePrice > 0
            ? Math.round(((product.sellPrice - product.purchasePrice) / product.purchasePrice) * 100) + '%'
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

        // Add a pseudo-property to store the raw status for row styling later
        return [
            statusText,
            expiryText,
            profitMargin,
            product.sellPrice.toString(),
            product.purchasePrice.toString(),
            product.unit,
            product.quantity.toString(),
            product.supplier?.name || '—',
            product.category,
            product.name,
            product.code || '—',
            status // the raw status, we will hide this column or use it in willDrawCell
        ];
    });

    const headers = [
        ['الحالة', 'تاريخ الانتهاء', 'هامش الربح', 'سعر البيع', 'سعر الشراء', 'الوحدة', 'الكمية', 'المورد', 'الفئة', 'الاسم', 'الكود']
    ];

    autoTable(doc, {
        head: headers,
        body: tableData,
        startY: 30,
        theme: 'grid',
        headStyles: {
            fillColor: [32, 184, 120], // Brand green: #20b878
            textColor: 255,
            halign: 'center'
        },
        styles: {
            halign: 'right', // RTL
            font: 'helvetica'
        },
        willDrawCell: function (data: any) {
            // Row styling based on expiry status
            if (data.row.section === 'body') {
                const status = data.row.raw[11]; // The raw status we appended
                if (status === 'expired') {
                    // Light red background
                    data.cell.styles.fillColor = [254, 226, 226];
                    data.cell.styles.textColor = [185, 28, 28];
                } else if (status === 'expiring') {
                    // Light amber background
                    data.cell.styles.fillColor = [254, 243, 199];
                    data.cell.styles.textColor = [180, 83, 9];
                }
            }
        },
        didParseCell: function (data: any) {
            // Don't draw the 12th column (the raw status)
            if (data.column.index === 11) {
                data.cell.width = 0;
            }
        }
    });

    // Add page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`صفحة ${i} من ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    // Use Blob download instead of doc.save() to avoid Arabic filename issues on Windows
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `products-${dateStr}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(pdfUrl);
}
