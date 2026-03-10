import { prisma as globalPrisma } from './prisma';

/**
 * Generates a batch number in the format BAT-XXXX
 */
export async function generateBatchNumber(tx: any = globalPrisma): Promise<string> {
    const lastBatch = await tx.productBatch.findFirst({
        orderBy: { id: 'desc' }
    });

    const lastId = lastBatch ? lastBatch.id : 0;
    const nextId = lastId + 1;
    return `BAT-${nextId.toString().padStart(4, '0')}`;
}

/**
 * Updates the nearest expiry date for a product based on its active batches
 */
export async function updateNearestExpiry(productId: number, tx: any = globalPrisma) {
    const activeBatches = await tx.productBatch.findMany({
        where: {
            productId,
            remainingQty: { gt: 0 },
            expiryDate: { not: null }
        },
        orderBy: { expiryDate: 'asc' }
    });

    const nearestExpiry = activeBatches.length > 0 ? activeBatches[0].expiryDate : null;

    await tx.product.update({
        where: { id: productId },
        data: { nearestExpiryDate: nearestExpiry }
    });
}

/**
 * Allocates quantity from active batches using FIFO (First-In, First-Out)
 * Returns an array of batch allocations: { batchId, quantity, unitCost }
 */
export async function getFIFOBatches(productId: number, totalQty: number, tx: any = globalPrisma) {
    const batches = await tx.productBatch.findMany({
        where: {
            productId,
            remainingQty: { gt: 0 }
        },
        orderBy: [
            { expiryDate: { sort: 'asc', nulls: 'last' } },
            { purchaseDate: 'asc' }
        ]
    });

    let remainingToAllocate = totalQty;
    const allocations = [];

    for (const batch of batches) {
        if (remainingToAllocate <= 0) break;

        const allocationQty = Math.min(batch.remainingQty, remainingToAllocate);
        allocations.push({
            batchId: batch.id,
            quantity: allocationQty,
            unitCost: batch.unitCost
        });

        remainingToAllocate -= allocationQty;
    }

    if (remainingToAllocate > 0) {
        throw new Error(`Insufficient stock in batches for product ID ${productId}. Missing: ${remainingToAllocate}`);
    }

    return allocations;
}
