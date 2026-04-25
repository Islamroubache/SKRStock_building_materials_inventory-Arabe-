import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET() {
    try {
        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);

        const totalProducts = await prisma.product.count();
        const totalSuppliers = await prisma.supplier.count();
        const totalCustomers = await prisma.customer.count();

        // 1. Calculate Today's Sales Collected (Initial payments or full payments for orders created today)
        const todaySaleOrders = await prisma.order.findMany({
            where: { 
                type: 'SALE', 
                status: { in: ['COMPLETED', 'DONE', 'PENDING'] },
                orderDate: { gte: start, lte: end } 
            },
            include: { invoice: true }
        });

        const todayNet = todaySaleOrders.reduce((sum, order) => {
            const grandTotal = order.grandTotal || 0;
            const isPaid = order.invoice?.status === 'PAID';
            const remaining = isPaid ? 0 : (order.invoice?.remaining || 0);
            return sum + (grandTotal - remaining);
        }, 0);

        const todaySales = todaySaleOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

        // 2. Calculate Today's Collections for OLD debts (Payments today for invoices created BEFORE today)
        const allTodayPayments = await prisma.payment.findMany({
            where: { paymentDate: { gte: start, lte: end } },
            include: { invoice: true }
        });

        // Sum payments where the invoice was created before today OR if there is no invoice (direct customer payment)
        // Actually, if it's an initial payment for a today's order, it's already in todayNet.
        // So we want payments where the invoice.order.orderDate < start.
        
        // Let's get order dates for these payments
        const paymentInvoiceIds = allTodayPayments.map(p => p.invoiceId).filter(id => id !== null) as number[];
        const invoices = await prisma.invoice.findMany({
            where: { id: { in: paymentInvoiceIds } },
            include: { order: true }
        });

        const todayOldDebtCollections = allTodayPayments.reduce((sum, p) => {
            const inv = invoices.find(i => i.id === p.invoiceId);
            // If invoice exists and order was before today, count it.
            // If no invoice, it might be a general credit, we can count it as collection too.
            if (!inv || !inv.order || inv.order.orderDate < start) {
                return sum + p.amount;
            }
            return sum;
        }, 0);

        const todayCustomerCollections = todayOldDebtCollections; // Renaming for consistency in Dashboard formula

        // 3. Calculate Today's Payments (Money OUT to suppliers)
        const todaySupplierPaymentsData = await prisma.supplierPayment.aggregate({
            where: { paymentDate: { gte: start, lte: end } },
            _sum: { amount: true }
        });
        const todaySupplierPayments = todaySupplierPaymentsData._sum.amount || 0;

        // 4. Monthly Collection Growth Calculation
        const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

        const [thisMonthCollectionsData, lastMonthCollectionsData] = await Promise.all([
            prisma.payment.aggregate({
                where: { paymentDate: { gte: startOfThisMonth, lte: end } },
                _sum: { amount: true }
            }),
            prisma.payment.aggregate({
                where: { paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
                _sum: { amount: true }
            })
        ]);

        const thisMonthCol = thisMonthCollectionsData._sum.amount || 0;
        const lastMonthCol = lastMonthCollectionsData._sum.amount || 0;

        let collectionGrowth = 0;
        if (lastMonthCol > 0) {
            collectionGrowth = ((thisMonthCol - lastMonthCol) / lastMonthCol) * 100;
        } else if (thisMonthCol > 0) {
            collectionGrowth = 100; // 100% growth if there was nothing last month
        }
        
        const monthlyGrowth = {
            value: collectionGrowth.toFixed(1),
            isPositive: collectionGrowth >= 0
        };

        const pendingInvoices = await prisma.invoice.aggregate({
            _sum: { remaining: true }
        });
        const pendingInvoicesTotal = pendingInvoices._sum.remaining || 0;

        const topItems = await prisma.orderItem.groupBy({
            by: ['productId'],
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });

        const productIds = topItems.map((i) => i.productId);
        const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
        const topProducts = topItems.map((item) => {
            const p = products.find((p) => p.id === item.productId);
            return {
                name: p?.name || 'منتج غير معروف',
                sold: item._sum.quantity || 0
            };
        });

        const recentOrdersQuery = await prisma.order.findMany({
            take: 5,
            orderBy: { orderDate: 'desc' },
            include: { customer: true }
        });

        const recentOrders = recentOrdersQuery.map((o) => ({
            orderNumber: o.orderNumber,
            customerName: o.customer?.name || 'عميل نقدي',
            total: o.total,
            status: o.status,
            date: o.orderDate
        }));

        const allProducts = await prisma.product.findMany({
            select: { name: true, quantity: true, minQuantity: true, unit: true }
        });
        const lowStockProducts = allProducts.filter((p) => p.quantity <= p.minQuantity).map(p => ({
            name: p.name,
            quantity: p.quantity,
            unit: p.unit
        }));
        const lowStockCount = lowStockProducts.length;

        // Outstanding Debts
        const outstandingCustomers = await prisma.customer.findMany({
            where: { balanceDue: { gt: 0 } },
            select: { id: true, name: true, balanceDue: true, creditLimit: true }
        });

        const outstandingDebts = {
            count: outstandingCustomers.length,
            totalAmount: outstandingCustomers.reduce((sum, c) => sum + c.balanceDue, 0)
        };

        // Credit Alerts
        const creditAlerts = outstandingCustomers.filter(c => c.creditLimit > 0 && c.balanceDue >= c.creditLimit).map(c => ({
            name: c.name,
            balanceDue: c.balanceDue,
            creditLimit: c.creditLimit
        }));

        // Expiry Stats (from Batches)
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const expiredBatches = await prisma.productBatch.findMany({
            where: {
                OR: [
                    { status: 'EXPIRED' },
                    {
                        status: 'ACTIVE',
                        remainingQty: { gt: 0 },
                        expiryDate: { lte: now }
                    }
                ]
            },
            include: { product: { select: { name: true, code: true } } }
        });

        const expiringSoonCount = await prisma.productBatch.count({
            where: {
                status: 'ACTIVE',
                remainingQty: { gt: 0 },
                expiryDate: {
                    gt: now,
                    lte: thirtyDaysFromNow
                }
            }
        });

        const expiredCount = expiredBatches.length;
        const expiredList = expiredBatches.map(b => ({
            name: b.product.name,
            code: b.product.code,
            expiryDate: b.expiryDate,
            batchNumber: b.batchNumber,
            quantity: b.remainingQty
        }));

        // Damage Stats for Dashboard
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const damageRecords = await prisma.damagedProduct.findMany({
            where: { createdAt: { gte: monthStart } },
            select: { totalLoss: true }
        });
        const totalLossThisMonth = damageRecords.reduce((sum, r) => sum + r.totalLoss, 0);

        // Overdue Invoices
        const overdueInvoicesQuery = await prisma.invoice.findMany({
            where: {
                status: { in: ['UNPAID', 'PARTIAL'] },
                dueDate: { lt: startOfDay(now) }
            },
            include: {
                order: {
                    include: { customer: true }
                }
            }
        });
        
        const overdueInvoices = overdueInvoicesQuery.map(inv => ({
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.order?.customer?.name || inv.order?.customerName || 'عميل نقدي',
            remaining: inv.remaining,
            dueDate: inv.dueDate
        }));
        const overdueInvoicesCount = overdueInvoices.length;

        // 5. Total Debt Calculation (Sync with Invoices Page Logic)
        const allSaleOrders = await prisma.order.findMany({
            where: { type: 'SALE' },
            include: {
                items: true,
                invoice: true
            }
        });

        let totalDebt = 0;
        allSaleOrders.forEach(order => {
            const returnsValue = order.items.reduce((sum, item) => sum + ((item.returnedQuantity || 0) * item.unitPrice), 0);
            const paid = order.invoice?.paid || 0;
            const remaining = Math.max(0, (order.grandTotal - returnsValue) - paid);
            totalDebt += remaining;
        });
        
        const allSalesTotal = allSaleOrders.reduce((sum, o) => sum + o.grandTotal, 0);
        const allPaymentsTotal = await prisma.payment.aggregate({ _sum: { amount: true } }).then(res => res._sum.amount || 0);
        const allReturnsTotal = allSaleOrders.reduce((sum, o) => {
            return sum + o.items.reduce((iSum, item) => iSum + ((item.returnedQuantity || 0) * item.unitPrice), 0);
        }, 0);

        return NextResponse.json({
            totalProducts,
            todaySales,
            totalSuppliers,
            totalCustomers,
            outstandingDebts,
            totalDebt,
            lowStockCount,
            lowStockProducts,
            creditAlerts,
            pendingInvoicesTotal,
            topProducts,
            recentOrders,
            expiredCount,
            expiringSoonCount,
            expiredList,
            totalLossThisMonth,
            overdueInvoices,
            overdueInvoicesCount,
            todayCustomerCollections,
            todaySupplierPayments,
            todayNet,
            monthlyGrowth
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
