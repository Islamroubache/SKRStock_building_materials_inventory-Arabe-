import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay } from 'date-fns';
import { calculateDemandStats, forecastNextPeriod, calculateEOQ } from '@/lib/ai-analytics';

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            include: {
                supplier: true,
                stockMovements: {
                    where: {
                        movementType: 'OUT',
                        createdAt: { gte: subDays(new Date(), 90) }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        const forecastData = products.map(product => {
            const stats = calculateDemandStats(product.stockMovements);

            // Collect daily values for regression
            const dailyMap: Record<string, number> = {};
            product.stockMovements.forEach(m => {
                const day = startOfDay(m.createdAt).toISOString();
                dailyMap[day] = (dailyMap[day] || 0) + m.quantity;
            });
            const history = Object.values(dailyMap);

            const forecast30Days = forecastNextPeriod(history, 30) * 30;
            const daysUntilStockout = stats.avgDailySales > 0 ? Math.floor(product.quantity / stats.avgDailySales) : null;

            // EOQ Constants (Assumed for this scale)
            const annualDemand = stats.avgDailySales * 365;
            const orderCost = 500; // Fixed cost per order
            const holdingCostPct = 15; // 15% annual holding cost
            const recommendedOrderQty = calculateEOQ(annualDemand, orderCost, holdingCostPct, product.purchasePrice);

            const reorderRecommended = (daysUntilStockout !== null && daysUntilStockout <= 14) || product.quantity <= product.minQuantity;

            return {
                productId: product.id,
                productName: product.name,
                currentStock: product.quantity,
                unit: product.unit,
                avgDailySales: stats.avgDailySales,
                forecast30Days: Math.round(forecast30Days),
                daysUntilStockout,
                reorderRecommended,
                recommendedOrderQty,
                lastSupplierName: product.supplier?.name || null
            };
        });

        // Sort by urgency: lowest daysUntilStockout first, then reorder recommended
        const sorted = forecastData.sort((a, b) => {
            if (a.daysUntilStockout === null && b.daysUntilStockout === null) return 0;
            if (a.daysUntilStockout === null) return 1;
            if (b.daysUntilStockout === null) return -1;
            return a.daysUntilStockout - b.daysUntilStockout;
        });

        return NextResponse.json(sorted);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch demand forecast' }, { status: 500 });
    }
}
