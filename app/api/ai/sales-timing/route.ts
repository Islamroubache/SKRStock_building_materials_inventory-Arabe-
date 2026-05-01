import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDay, getHours } from 'date-fns';

export async function GET() {
    try {
        const sales = await prisma.order.findMany({
            where: { type: 'SALE', status: { in: ['COMPLETED', 'DONE'] } },
            select: { orderDate: true, total: true }
        });

        // Initialize counters
        const daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const dayStats = daysOfWeek.map((name: any) => ({ name, count: 0, revenue: 0 }));
        const hourStats = Array.from({ length: 24 }, (_, i: any) => ({ hour: i, count: 0, revenue: 0 }));

        sales.forEach((order: any) => {
            const date = new Date(order.orderDate);
            const dayIndex = getDay(date);
            const hour = getHours(date);

            dayStats[dayIndex].count++;
            dayStats[dayIndex].revenue += order.total;

            hourStats[hour].count++;
            hourStats[hour].revenue += order.total;
        });

        // Recommendations logic
        const bestDay = [...dayStats].sort((a: any, b: any) => b.revenue - a.revenue)[0];
        const bestHour = [...hourStats].sort((a: any, b: any) => b.revenue - a.revenue)[0];
        
        // Find peak morning and peak afternoon
        const morningPeak = hourStats.slice(6, 13).sort((a: any, b: any) => b.count - a.count)[0];
        const afternoonPeak = hourStats.slice(13, 20).sort((a: any, b: any) => b.count - a.count)[0];

        return NextResponse.json({
            dayStats,
            hourStats,
            recommendations: {
                bestDay: bestDay.name,
                bestHour: `${bestHour.hour}:00`,
                suggestedOpening: "08:00",
                suggestedClosing: "18:00", // Default or calculated
                peakPeriods: [
                    { label: "الفترة الصباحية", peak: `${morningPeak?.hour || 9}:00` },
                    { label: "الفترة المسائية", peak: `${afternoonPeak?.hour || 16}:00` }
                ]
            }
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
