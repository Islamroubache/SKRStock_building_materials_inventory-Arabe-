import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateNearestExpiry } from '@/lib/batch-helpers';

export async function POST() {
    try {
        const now = new Date();

        // Find matches that are newly expired
        const expiredBatches = await prisma.productBatch.findMany({
            where: {
                status: 'ACTIVE',
                remainingQty: { gt: 0 },
                expiryDate: { lte: now },
                product: { hasExpiryDate: true }
            },
            select: { id: true, productId: true }
        });

        if (expiredBatches.length > 0) {
            // Update status to EXPIRED
            await prisma.productBatch.updateMany({
                where: {
                    id: { in: expiredBatches.map(b => b.id) }
                },
                data: { status: 'EXPIRED' }
            });

            // Update nearest expiry for affected products
            const productIds = Array.from(new Set(expiredBatches.map(b => b.productId)));
            for (const productId of productIds) {
                await updateNearestExpiry(productId);
            }
        }

        return NextResponse.json({
            success: true,
            updatedCount: expiredBatches.length
        });
    } catch (error) {
        console.error('Error running expiry check:', error);
        return NextResponse.json({ error: 'فشل في تحديث حالة الصلاحية' }, { status: 500 });
    }
}
