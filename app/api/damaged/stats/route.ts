import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const yearStart = startOfYear(now);
        const yearEnd = endOfYear(now);

        const monthRecords = await prisma.damagedProduct.findMany({
            where: { createdAt: { gte: monthStart, lte: monthEnd } }
        });

        const yearRecords = await prisma.damagedProduct.findMany({
            where: { createdAt: { gte: yearStart, lte: yearEnd } }
        });

        const totalLossThisMonth = monthRecords.reduce((sum: any, r: any) => sum + r.totalLoss, 0);
        const totalLossThisYear = yearRecords.reduce((sum: any, r: any) => sum + r.totalLoss, 0);

        // Recovered = total refund records where status is RETURNED_TO_SUPPLIER
        const recoveredRecords = await prisma.damagedProduct.findMany({
            where: {
                status: 'RETURNED_TO_SUPPLIER',
                supplierRefund: true
            }
        });
        const totalRecovered = recoveredRecords.reduce((sum: any, r: any) => sum + (r.refundAmount || 0), 0);

        // Top Damaged Products
        const allRecords = await prisma.damagedProduct.findMany({
            include: { product: true }
        });

        const pMap: Record<number, any> = {};
        allRecords.forEach((r: any) => {
            if (!pMap[r.productId]) {
                pMap[r.productId] = { name: r.product.name, code: r.product.code, totalQty: 0, totalLoss: 0 };
            }
            pMap[r.productId].totalQty += r.quantity;
            pMap[r.productId].totalLoss += r.totalLoss;
        });

        const topDamagedProducts = Object.values(pMap)
            .sort((a: any, b: any) => b.totalLoss - a.totalLoss)
            .slice(0, 10);

        // By Type
        const byType: Record<string, any> = {
            DAMAGED: { count: 0, loss: 0 },
            EXPIRED: { count: 0, loss: 0 },
            WITHDRAWN: { count: 0, loss: 0 },
            LOST: { count: 0, loss: 0 }
        };

        allRecords.forEach((r: any) => {
            if (byType[r.damageType]) {
                byType[r.damageType].count += 1;
                byType[r.damageType].loss += r.totalLoss;
            }
        });

        return NextResponse.json({
            totalLossThisMonth,
            totalLossThisYear,
            totalRecovered,
            topDamagedProducts,
            byType
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch damaged stats' }, { status: 500 });
    }
}
