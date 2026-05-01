import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'monthly';
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    let start = startOfDay(new Date());
    let end = endOfDay(new Date());

    if (fromStr && toStr) {
        start = startOfDay(new Date(fromStr));
        end = endOfDay(new Date(toStr));
    } else {
        if (type === 'daily') { start = startOfDay(new Date()); end = endOfDay(new Date()); }
        else if (type === 'weekly') { start = startOfWeek(new Date(), { weekStartsOn: 6 }); end = endOfWeek(new Date(), { weekStartsOn: 6 }); }
        else if (type === 'monthly') { start = startOfMonth(new Date()); end = endOfMonth(new Date()); }
        else if (type === 'yearly') { start = startOfYear(new Date()); end = endOfYear(new Date()); }
        else {
            // Default to last 30 days if no type
            start = startOfDay(subDays(new Date(), 29));
            end = endOfDay(new Date());
        }
    }

    try {
        const orders = await prisma.order.findMany({
            where: { 
                orderDate: { gte: start, lte: end },
                status: { in: ['COMPLETED', 'DONE', 'PENDING'] }
            },
            include: {
                items: {
                    include: {
                        product: true,
                        batchAllocations: true
                    }
                }
            }
        });

        const chartDataMap: Record<string, { sales: number; purchases: number; profit: number }> = {};

        let curr = new Date(start);
        while (curr <= end) {
            const dateStr = format(curr, 'yyyy-MM-dd');
            chartDataMap[dateStr] = { sales: 0, purchases: 0, profit: 0 };
            curr.setDate(curr.getDate() + 1);
        }

        orders.forEach((order) => {
            const dateStr = format(order.orderDate, 'yyyy-MM-dd');
            if (chartDataMap[dateStr]) {
                if (order.type === 'SALE') {
                    chartDataMap[dateStr].sales += order.total;
                    
                    // Calculate profit for this order
                    order.items.forEach((item: any) => {
                        let cost = 0;
                        if (item.batchAllocations && item.batchAllocations.length > 0) {
                            cost = item.batchAllocations.reduce((sum: any, b: any) => sum + (b.unitCost * b.quantity), 0);
                        } else {
                            cost = ((item.product as any).avgPurchasePrice || item.product.purchasePrice) * item.quantity;
                        }
                        const profit = item.total - cost;
                        chartDataMap[dateStr].profit += profit;
                    });
                } else if (order.type === 'PURCHASE') {
                    chartDataMap[dateStr].purchases += order.total;
                }
            }
        });

        const result = Object.entries(chartDataMap).map(([date, data]) => ({
            date: format(new Date(date), 'dd MMM'),
            sales: data.sales,
            purchases: data.purchases,
            profit: data.profit
        })).sort((a: any, b: any) => a.date.localeCompare(b.date));

        return NextResponse.json(result);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
    }
}
