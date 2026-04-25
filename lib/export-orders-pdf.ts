import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '@/lib/utils';

interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: { finalY: number };
}

export function exportOrdersToPDF(orders: any[]) {
    // Create new PDF document in landscape
    const doc = new jsPDF('l', 'mm', 'a4') as jsPDFWithAutoTable;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const dateStr = formatDate(new Date()).replace(/\//g, '-');

    // Title in French (Left aligned for LTR)
    doc.text(`Liste des Commandes — MAKHZOUNI (${dateStr})`, 14, 20);

    // Format data for table
    const tableData = orders.map(o => {
        const typeText = o.type === 'SALE' ? 'Vente' : 
                         o.type === 'PURCHASE' ? 'Achat' : 
                         o.type === 'RETURN_SALE' ? 'Retour Vente' : 'Retour Achat';
        
        const entityName = o.type.includes('SALE') ? (o.customer?.name || 'Client Divers') : (o.supplier?.name || 'Fournisseur Divers');
        
        const finalBalance = o.grandTotal || o.total;
        
        // Translate payment method
        const method = o.invoice?.payments?.[0]?.paymentMethod || 'CASH';
        const methodMap: Record<string, string> = {
            'CASH': 'Espèces',
            'CHEQUE': 'Chèque',
            'BANK_TRANSFER': 'Virement',
            'CREDIT': 'Crédit'
        };
        const paymentMethod = methodMap[method] || method;
        
        const remainingDebt = o.invoice?.remaining !== undefined ? o.invoice.remaining : (finalBalance - (o.invoice?.paid || 0));
        
        const statusText = o.status === 'DONE' ? 'Terminé' : (o.status === 'PENDING' ? 'En attente' : 'Annulé');

        return [
            o.orderNumber,
            typeText,
            formatDate(o.orderDate),
            entityName,
            finalBalance.toLocaleString() + ' DZD',
            paymentMethod,
            remainingDebt.toLocaleString() + ' DZD',
            statusText
        ];
    });

    const headers = [
        ['N° Commande', 'Type', 'Date', 'Client / Fournisseur', 'Total Global', 'Paiement', 'Reste à Payer', 'Statut']
    ];

    autoTable(doc, {
        head: headers,
        body: tableData,
        startY: 30,
        theme: 'grid',
        headStyles: {
            fillColor: [37, 99, 235], // Blue 600
            textColor: 255,
            halign: 'left'
        },
        styles: {
            halign: 'left',
            font: 'helvetica',
            fontSize: 9
        },
        columnStyles: {
            4: { halign: 'right' }, // Total
            6: { halign: 'right' }, // Remaining
            7: { halign: 'center' } // Status
        }
    });

    // Add page numbers
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Page ${i} sur ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `commandes-${dateStr}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(pdfUrl);
}
