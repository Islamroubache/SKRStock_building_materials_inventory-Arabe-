import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subDays } from 'date-fns';
import { detectAnomalies } from '@/lib/ai-analytics';

export async function GET() {
    try {
        const last90Days = subDays(new Date(), 90);

        // Get all sale movements
        const movements = await prisma.stockMovement.findMany({
            where: {
                movementType: 'OUT',
                createdAt: { gte: last90Days },
                product: { isArchived: false }
            },
            include: {
                product: true,
                orderItem: {
                    include: {
                        order: {
                            include: { customer: true }
                        }
                    }
                }
            }
        });

        // Group by product to detect product-specific anomalies
        const productGroups: Record<number, any[]> = {};
        movements.forEach(m => {
            if (!productGroups[m.productId]) productGroups[m.productId] = [];
            productGroups[m.productId].push({
                id: m.id,
                date: m.createdAt,
                quantity: m.quantity,
                productName: m.product.name,
                customerName: m.orderItem?.order?.customer?.name || 'عميل نقدي',
                orderNumber: m.orderItem?.order?.orderNumber || '-'
            });
        });

        const anomalies: any[] = [];
        Object.values(productGroups).forEach(groupMovements => {
            const detected = detectAnomalies(groupMovements);
            anomalies.push(...detected);
        });

        // Sort by date desc
        const sortedAnomalies = anomalies.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);

        return NextResponse.json(sortedAnomalies);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
