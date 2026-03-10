import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, context: any) {
    try {
        const params = await context.params;
        const id = parseInt(params.id, 10);
        const body = await request.json();
        const { amount } = body;

        if (!amount || amount <= 0) return NextResponse.json({ error: 'المبلغ يجب أن يكون أكبر من الصفر' }, { status: 400 });

        const invoice = await prisma.invoice.findUnique({ where: { id } });
        if (!invoice) return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
        if (amount > invoice.remaining) return NextResponse.json({ error: 'المبلغ المدفوع يتجاوز الرصيد المتبقي' }, { status: 400 });

        const result = await prisma.$transaction(async (tx) => {
            const updatedInvoice = await tx.invoice.update({
                where: { id },
                data: {
                    paid: { increment: amount },
                    remaining: { decrement: amount }
                }
            });

            if (invoice.customerId) {
                await tx.customer.update({
                    where: { id: invoice.customerId },
                    data: { balanceDue: { decrement: amount } }
                });
            }

            return updatedInvoice;
        });

        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
    }
}
