import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay, format } from 'date-fns';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const startDate = startOfDay(subDays(new Date(), days - 1));

    try {
        const orders = await prisma.order.findMany({
            where: { orderDate: { gte: startDate } },
            select: { type: true, total: true, orderDate: true }
        });

        const chartDataMap: Record<string, { sales: number; purchases: number }> = {};

        for (let i = days - 1; i >= 0; i--) {
            const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
            chartDataMap[dateStr] = { sales: 0, purchases: 0 };
        }

        orders.forEach((order) => {
            const dateStr = format(order.orderDate, 'yyyy-MM-dd');
            if (chartDataMap[dateStr]) {
                if (order.type === 'SALE') {
                    chartDataMap[dateStr].sales += order.total;
                } else if (order.type === 'PURCHASE') {
                    chartDataMap[dateStr].purchases += order.total;
                }
            }
        });

        const result = Object.entries(chartDataMap).map(([date, data]) => ({
            date,
            sales: data.sales,
            purchases: data.purchases
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
    }
}
