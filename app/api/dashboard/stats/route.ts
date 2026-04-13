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

        const todaySalesData = await prisma.order.aggregate({
            where: {
                type: 'SALE',
                status: { in: ['COMPLETED', 'DONE'] },
                orderDate: { gte: start, lte: end }
            },
            _sum: { total: true }
        });
        const todaySales = todaySalesData._sum.total || 0;

        // Today's Collections (Payments)
        const todayPaymentsData = await prisma.payment.aggregate({
            where: {
                paymentDate: { gte: start, lte: end }
            },
            _sum: { amount: true }
        });
        const todayCollections = todayPaymentsData._sum.amount || 0;

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
            customerName: inv.order?.customer?.name || inv.order?.guestName || 'عميل نقدي',
            remaining: inv.remaining,
            dueDate: inv.dueDate
        }));
        const overdueInvoicesCount = overdueInvoices.length;

        // Total Debt Calculation (sum of all customer balanceDue)
        const totalDebt = outstandingDebts.totalAmount;

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
            todayCollections
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
