import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { classifyABC } from '@/lib/ai-analytics';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'product';

    try {
        const orders = await prisma.order.findMany({
            where: { type: 'SALE', status: { in: ['COMPLETED', 'DONE'] } },
            include: {
                customer: true,
                supplier: true,
                project: true,
                items: { include: { product: true } }
            }
        });

        const stats: Record<string, any> = {};

        orders.forEach((order: any) => {
            let key = '';
            let name = '';

            if (groupBy === 'product') {
                order.items.forEach((item: any) => {
                    const k = item.productId.toString();
                    if (!stats[k]) stats[k] = { name: item.product.name, totalRevenue: 0, totalCost: 0, profit: 0 };
                    const costPrice = (item.product as any).avgPurchasePrice || item.product.purchasePrice;
                    const cost = costPrice * item.quantity;
                    stats[k].totalRevenue += item.total;
                    stats[k].totalCost += cost;
                    stats[k].profit += (item.total - cost);
                });
                return;
            } else if (groupBy === 'supplier') {
                // For supplier, we check the products sold and their original supplier
                order.items.forEach((item: any) => {
                    const k = item.product.supplierId?.toString() || 'none';
                    if (!stats[k]) stats[k] = { name: 'المورد الافتراضي', totalRevenue: 0, totalCost: 0, profit: 0 };
                    const costPrice = (item.product as any).avgPurchasePrice || item.product.purchasePrice;
                    const cost = costPrice * item.quantity;
                    stats[k].totalRevenue += item.total;
                    stats[k].totalCost += cost;
                    stats[k].profit += (item.total - cost);
                });
                return;
            } else if (groupBy === 'project' && order.projectId) {
                key = order.projectId.toString();
                name = order.project?.name || 'مشروع غير مسمى';
            } else if (groupBy === 'customer' && order.customerId) {
                key = order.customerId.toString();
                name = order.customer?.name || 'عميل غير مسمى';
            }

            if (key) {
                if (!stats[key]) stats[key] = { name, totalRevenue: 0, totalCost: 0, profit: 0 };
                stats[key].totalRevenue += order.total;
                // Calculate cost for the whole order items using WAC
                const orderCost = order.items.reduce((sum: any, item: any) => {
                    const costPrice = (item.product as any).avgPurchasePrice || item.product.purchasePrice;
                    return sum + (costPrice * item.quantity);
                }, 0);
                stats[key].totalCost += orderCost;
                stats[key].profit += (order.total - orderCost);
            }
        });

        const result = Object.values(stats).map((s: any) => ({
            ...s,
            margin: s.totalRevenue > 0 ? (s.profit / s.totalRevenue) * 100 : 0
        })).sort((a: any, b: any) => b.profit - a.profit);

        // Add ABC Classification if grouping by product
        if (groupBy === 'product' && result.length > 0) {
            const abcInput = result.map((r: any) => ({ id: r.name, value: r.profit }));
            const abcMap = classifyABC(abcInput);
            result.forEach((r: any) => {
                (r as any).abcClass = abcMap[r.name];
            });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
