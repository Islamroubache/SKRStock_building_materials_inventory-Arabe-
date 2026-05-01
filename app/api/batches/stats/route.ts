import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const listAll = searchParams.get('list') === 'true';

        // Get basic stats
        const activeBatchesCount = await prisma.productBatch.count({
            where: {
                status: 'ACTIVE',
                remainingQty: { gt: 0 },
                product: { hasExpiryDate: true }
            }
        });

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const expiringSoonCount = await prisma.productBatch.count({
            where: {
                status: 'ACTIVE',
                remainingQty: { gt: 0 },
                product: { hasExpiryDate: true },
                expiryDate: {
                    gt: now,
                    lte: thirtyDaysFromNow
                }
            }
        });

        const expiredCount = await prisma.productBatch.count({
            where: {
                product: { hasExpiryDate: true },
                OR: [
                    { status: 'EXPIRED' },
                    {
                        status: 'ACTIVE',
                        remainingQty: { gt: 0 },
                        expiryDate: { lte: now }
                    }
                ]
            }
        });

        // Calculate loss value from expired stock
        const expiredBatches = await prisma.productBatch.findMany({
            where: {
                product: { hasExpiryDate: true },
                OR: [
                    { status: 'EXPIRED' },
                    {
                        status: 'ACTIVE',
                        remainingQty: { gt: 0 },
                        expiryDate: { lte: now }
                    }
                ]
            }
        });

        const totalLossValue = expiredBatches.reduce((sum: any, b: any) => sum + (b.remainingQty * b.unitCost), 0);

        const stats = {
            activeBatches: activeBatchesCount,
            expiringSoon: expiringSoonCount,
            expired: expiredCount,
            totalLossValue
        };

        if (listAll) {
            const allBatches = await prisma.productBatch.findMany({
                where: { remainingQty: { gt: 0 } },
                include: {
                    product: {
                        select: { name: true, code: true, unit: true }
                    }
                },
                orderBy: [
                    { expiryDate: 'asc' },
                    { purchaseDate: 'desc' }
                ]
            });
            return NextResponse.json({ stats, batches: allBatches });
        }

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching batch stats:', error);
        return NextResponse.json({ error: 'فشل في جلب إحصائيات الدفعات' }, { status: 500 });
    }
}
