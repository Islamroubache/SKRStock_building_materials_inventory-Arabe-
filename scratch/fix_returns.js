const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInvoices() {
    console.log('Starting invoice synchronization...');
    
    // 1. Get all Sale Returns
    const returns = await prisma.order.findMany({
        where: { type: 'RETURN_SALE' }
    });
    
    console.log(`Found ${returns.length} sale returns.`);
    
    for (const ret of returns) {
        // Find the original order ID from the return order number (RET/ORD-XXX/...)
        const parts = ret.orderNumber.split('/');
        if (parts.length < 2) continue;
        const originalOrderNumber = parts[1];
        
        const originalOrder = await prisma.order.findUnique({
            where: { orderNumber: originalOrderNumber }
        });
        
        if (!originalOrder) continue;
        
        const invoice = await prisma.invoice.findUnique({
            where: { orderId: originalOrder.id }
        });
        
        if (invoice) {
            console.log(`Syncing Invoice ${invoice.invoiceNumber} for return ${ret.orderNumber} (Amount: ${ret.grandTotal})`);
            
            // We assume these past returns were NOT applied yet
            const newTotal = Math.max(0, invoice.total - ret.grandTotal);
            const newGrandTotal = Math.max(0, invoice.grandTotal - ret.grandTotal);
            const newRemaining = Math.max(0, invoice.remaining - ret.grandTotal);
            
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                    total: newTotal,
                    grandTotal: newGrandTotal,
                    remaining: newRemaining
                }
            });
        }
    }
    
    console.log('Finished synchronization.');
    process.exit(0);
}

fixInvoices().catch(err => {
    console.error(err);
    process.exit(1);
});
