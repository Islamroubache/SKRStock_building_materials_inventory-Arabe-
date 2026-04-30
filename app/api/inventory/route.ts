import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'ALL';

        // Fetch products for stock overview
        // Fetch products for stock overview with active batches
        const rawProducts = await prisma.product.findMany({
            where: { isArchived: false },
            include: { 
                supplier: true,
                batches: {
                    where: { remainingQty: { gt: 0 } },
                    include: { supplier: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Calculate current average cost based on active batches
        const products = rawProducts.map(p => {
            if (p.batches.length > 0) {
                const totalQty = p.batches.reduce((sum, b) => sum + b.remainingQty, 0);
                const totalValue = p.batches.reduce((sum, b) => sum + (b.remainingQty * b.unitCost), 0);
                
                // If we have batches with stock, use weighted average of these batches
                if (totalQty > 0) {
                    return {
                        ...p,
                        avgPurchasePrice: totalValue / totalQty
                    };
                }
            }
            // Fallback to stored avgPurchasePrice or purchasePrice if no active batches
            return p;
        });

        const productId = searchParams.get('productId');

        // Build movement query based on filter
        let movementWhere: any = {};
        if (type !== 'ALL') {
            movementWhere.movementType = type;
        }
        if (productId) {
            movementWhere.productId = parseInt(productId);
        }

        // Fetch recent stock movements
        const movements = await prisma.stockMovement.findMany({
            where: movementWhere,
            orderBy: { createdAt: 'desc' },
            take: productId ? undefined : 50,
            include: {
                product: { 
                    select: { 
                        name: true, 
                        unit: true, 
                        code: true,
                        batches: {
                            select: {
                                id: true,
                                purchaseOrderId: true,
                                remainingQty: true,
                                initialQty: true
                            }
                        }
                    } 
                },
                order: { select: { orderNumber: true } }
            }
        });

        // Enrich movements with batch remaining quantity if it's an "IN" movement
        const enrichedMovements = movements.map(m => {
            let batchRemainingQty = null;

            if (m.movementType === 'IN') {
                // Try to find matching batch
                const batches = m.product?.batches || [];
                const batch = batches.find(b => {
                    // Match by order ID (most reliable for purchases)
                    if (m.orderId && b.purchaseOrderId === m.orderId) return true;
                    
                    // Match opening stock or manual entries without orderId
                    if (!m.orderId) {
                        const isOpening = m.reason?.includes('أرصدة افتتاحية');
                        // Match by initial quantity if it's unique-ish
                        if (isOpening && b.initialQty === m.quantity) return true;
                        // Fallback: if there's only one batch and it's a manual IN
                        if (batches.length === 1 && b.initialQty === m.quantity) return true;
                    }
                    return false;
                });

                if (batch) {
                    batchRemainingQty = batch.remainingQty;
                }
            }

            return {
                ...m,
                batchRemainingQty
            };
        });

        return NextResponse.json({
            products,
            movements: enrichedMovements
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
