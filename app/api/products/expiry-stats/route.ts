import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getExpiryStatus, getDaysRemaining } from '@/lib/product-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const batches = await prisma.productBatch.findMany({
            where: {
                remainingQty: { gt: 0 },
                expiryDate: { not: null }
            },
            include: {
                product: {
                    select: { name: true, code: true, quantity: true }
                },
                supplier: true
            }
        });

        const expiredProducts: any[] = [];
        const expiringSoonProducts: any[] = [];
        let expiringThisWeek = 0;

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        batches.forEach(batch => {
            if (!batch.expiryDate) return;

            const expiry = new Date(batch.expiryDate);
            const diffTime = expiry.getTime() - now.getTime();
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const batchData = {
                id: batch.id,
                productId: batch.productId,
                name: batch.product.name,
                code: batch.product.code,
                batchNumber: batch.batchNumber,
                quantity: batch.remainingQty,
                expiryDate: batch.expiryDate,
                supplierName: batch.supplier?.name || 'غير محدد',
                daysRemaining,
                unitCost: batch.unitCost
            };

            if (daysRemaining < 0 || batch.status === 'EXPIRED') {
                expiredProducts.push(batchData);
            } else if (daysRemaining <= 30) {
                expiringSoonProducts.push(batchData);
                if (daysRemaining <= 7) {
                    expiringThisWeek++;
                }
            }
        });

        // Sort by most urgent
        expiredProducts.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
        expiringSoonProducts.sort((a, b) => a.daysRemaining - b.daysRemaining);

        return NextResponse.json({
            expired: expiredProducts.length,
            expiringSoon: expiringSoonProducts.length,
            expiringThisWeek,
            expiredProducts,
            expiringSoonProducts
        });
    } catch (error) {
        console.error('Failed to fetch expiry stats:', error);
        return NextResponse.json({ error: 'Failed to fetch expiry stats' }, { status: 500 });
    }
}
