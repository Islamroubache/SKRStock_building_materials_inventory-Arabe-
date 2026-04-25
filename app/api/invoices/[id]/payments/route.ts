/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, context: any) {
    try {
        const params = await context.params;
        const id = parseInt(params.id);
        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
        }

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: { order: true }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const [customerPayments, supplierPayments, returnOrders] = await Promise.all([
            prisma.payment.findMany({
                where: { invoiceId: id },
                orderBy: { paymentDate: 'desc' }
            }),
            prisma.supplierPayment.findMany({
                where: { invoiceId: id },
                orderBy: { paymentDate: 'desc' }
            }),
            prisma.order.findMany({
                where: {
                    orderNumber: { contains: invoice.order.orderNumber },
                    type: { in: ['RETURN_SALE', 'RETURN_PURCHASE'] }
                },
                include: { items: { include: { product: true } } }
            })
        ]);

        // Map returns to a payment-like structure
        const returnsAsPayments = returnOrders.map(r => ({
            id: `ret-${r.id}`,
            amount: r.total,
            paymentMethod: 'RETURN',
            paymentDate: r.orderDate,
            notes: r.notes || 'Retour de produits',
            isReturn: true,
            items: r.items
        }));

        const allPayments = [...customerPayments, ...supplierPayments, ...returnsAsPayments].sort((a, b) => 
            new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        );

        return NextResponse.json(allPayments);
    } catch (error: any) {
        console.error('[INVOICE_PAYMENTS_GET]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
