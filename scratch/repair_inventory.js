const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Inventory Resync ---');
    
    const products = await prisma.product.findMany({
        where: { hasExpiryDate: true },
        include: { batches: { where: { remainingQty: { gt: 0 } } } }
    });

    for (const p of products) {
        const batchTotal = p.batches.reduce((sum, b) => sum + b.remainingQty, 0);
        
        if (batchTotal !== p.quantity) {
            console.log(`Product "${p.name}" is out of sync. Main Stock: ${p.quantity}, Batch Total: ${batchTotal}`);
            
            if (batchTotal > p.quantity) {
                // We need to reduce batches to match main stock
                let diff = batchTotal - p.quantity;
                console.log(`Reducing batches by ${diff} pieces...`);
                
                // Sort batches by expiry date (oldest first) to reduce them
                const sortedBatches = [...p.batches].sort((a, b) => {
                    if (!a.expiryDate) return 1;
                    if (!b.expiryDate) return -1;
                    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
                });

                for (const b of sortedBatches) {
                    if (diff <= 0) break;
                    const reduction = Math.min(b.remainingQty, diff);
                    await prisma.productBatch.update({
                        where: { id: b.id },
                        data: { remainingQty: { decrement: reduction } }
                    });
                    diff -= reduction;
                    console.log(`  - Reduced Batch ${b.batchNumber} by ${reduction}. New remaining: ${b.remainingQty - reduction}`);
                }
            } else {
                // Main stock is higher than batches - this is rarer but can happen if batches were deleted
                console.log(`  - Warning: Main stock is higher. Usually indicates unbatched stock.`);
            }
        }
    }
    
    console.log('--- Resync Complete ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
