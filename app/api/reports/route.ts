import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily';
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const productId = searchParams.get('productId') ? parseInt(searchParams.get('productId')!) : undefined;
    const customerId = searchParams.get('customerId') ? parseInt(searchParams.get('customerId')!) : undefined;

    let start = startOfDay(new Date());
    let end = endOfDay(new Date());

    if (fromStr && toStr) {
        start = startOfDay(new Date(fromStr));
        end = endOfDay(new Date(toStr));
    } else {
        if (type === 'weekly') { start = startOfWeek(new Date(), { weekStartsOn: 6 }); end = endOfWeek(new Date(), { weekStartsOn: 6 }); }
        else if (type === 'monthly') { start = startOfMonth(new Date()); end = endOfMonth(new Date()); }
        else if (type === 'yearly') { start = startOfYear(new Date()); end = endOfYear(new Date()); }
    }

    try {
        const orderWhere: any = {
            status: { in: ['COMPLETED', 'DONE'] },
            orderDate: { gte: start, lte: end }
        };
        if (customerId) orderWhere.customerId = customerId;
        if (productId) {
            orderWhere.items = { some: { productId } };
        }

        const orders = await prisma.order.findMany({
            where: orderWhere,
            include: {
                customer: true,
                items: {
                    include: {
                        product: true,
                        batchAllocations: true
                    }
                }
            }
        });

        const salesOrders = orders.filter(o => o.type === 'SALE');
        const purchaseOrders = orders.filter(o => o.type === 'PURCHASE');

        const totalSales = salesOrders.reduce((sum, o) => sum + o.total, 0);
        const totalPurchases = purchaseOrders.reduce((sum, o) => sum + o.total, 0);

        // Get Damages for this period
        const damages = await prisma.damagedProduct.findMany({
            where: { createdAt: { gte: start, lte: end } },
            include: { product: { select: { name: true, code: true } } }
        });
        const totalLoss = damages.reduce((sum, d) => sum + d.totalLoss, 0);

        let totalCostOfGoods = 0;
        const pStatsMap: Record<number, any> = {};
        const cStatsMap: Record<number, any> = {};
        const dailyMap: Record<string, any> = {};

        // Prepare chart data range
        const curr = new Date(start);
        while (curr <= end) {
            const dayKey = curr.toISOString().split('T')[0];
            dailyMap[dayKey] = { date: dayKey, sales: 0, purchases: 0, profit: 0, loss: 0 };
            curr.setDate(curr.getDate() + 1);
        }

        damages.forEach(d => {
            const dayKey = d.createdAt.toISOString().split('T')[0];
            if (dailyMap[dayKey]) dailyMap[dayKey].loss += d.totalLoss;
        });

        orders.forEach(order => {
            const dayKey = order.orderDate.toISOString().split('T')[0];
            if (!dailyMap[dayKey]) dailyMap[dayKey] = { date: dayKey, sales: 0, purchases: 0, profit: 0, loss: 0 };

            if (order.type === 'SALE') {
                dailyMap[dayKey].sales += order.total;
                if (order.customerId && order.customer) {
                    if (!cStatsMap[order.customerId]) cStatsMap[order.customerId] = { name: order.customer.name, type: order.customer.type, total: 0, orders: 0, balance: order.customer.balanceDue };
                    cStatsMap[order.customerId].total += order.total;
                    cStatsMap[order.customerId].orders += 1;
                }

                order.items.forEach(item => {
                    // Try to calculate cost using batch allocations (Precise FIFO)
                    let cost = 0;
                    if (item.batchAllocations && item.batchAllocations.length > 0) {
                        cost = item.batchAllocations.reduce((sum, b) => sum + (b.unitCost * b.quantity), 0);
                    } else {
                        // Fallback to WAC
                        const costPrice = (item.product as any).avgPurchasePrice || item.product.purchasePrice;
                        cost = costPrice * item.quantity;
                    }

                    const revenue = item.total;
                    const profit = revenue - cost;
                    totalCostOfGoods += cost;
                    dailyMap[dayKey].profit += profit;

                    if (!pStatsMap[item.productId]) {
                        pStatsMap[item.productId] = { name: item.product.name, sold: 0, revenue: 0, cost: 0, profit: 0 };
                    }
                    pStatsMap[item.productId].sold += item.quantity;
                    pStatsMap[item.productId].revenue += revenue;
                    pStatsMap[item.productId].cost += cost;
                    pStatsMap[item.productId].profit += profit;
                });
            } else {
                dailyMap[dayKey].purchases += order.total;
            }
        });

        const grossProfit = totalSales - totalCostOfGoods;
        const netProfit = grossProfit - totalLoss; // Subtract losses
        const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

        const productStats = Object.values(pStatsMap).sort((a: any, b: any) => b.revenue - a.revenue);
        const topCustomers = Object.values(cStatsMap).sort((a: any, b: any) => b.total - a.total);
        const chartData = Object.values(dailyMap).sort((a: any, b: any) => a.date.localeCompare(b.date));

        // Debt & Collection Metrics
        // Note: Invoice status is a field we added to the schema
        const allLoyalCustomers = await prisma.customer.findMany({
            where: { type: 'LOYAL' },
            include: {
                _count: {
                    select: {
                        // @ts-ignore - Bypass IDE TS Server cache issue for new 'status' field
                        invoices: { where: { status: { in: ['UNPAID', 'PARTIAL'] } as any } }
                    }
                }
            }
        });

        const debtors = allLoyalCustomers.filter(c => c.balanceDue > 0);
        const totalDebt = debtors.reduce((sum, d) => sum + d.balanceDue, 0);

        // Calculate collection rate: (Total Paid / (Total Paid + Total Due))
        // Casting o to any because paidAmount might be missing from types although it exists in DB
        const totalPaidOnLoyal = salesOrders.reduce((sum, o: any) => sum + (o.paidAmount || 0), 0);
        const collectionRate = (totalPaidOnLoyal + totalDebt) > 0
            ? (totalPaidOnLoyal / (totalPaidOnLoyal + totalDebt)) * 100
            : 100;

        // Stock Status
        const stockStatus = await prisma.product.findMany({
            select: { name: true, quantity: true, minQuantity: true }
        });

        return NextResponse.json({
            totalSales,
            totalPurchases,
            grossProfit,
            totalLoss,
            netProfit,
            profitMargin,
            productStats,
            topCustomers,
            chartData,
            stockStatus,
            damages,
            totalDebt,
            collectionRate,
            debtors
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
