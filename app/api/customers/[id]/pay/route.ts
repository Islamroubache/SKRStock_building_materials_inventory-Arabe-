import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/customers/[id]/pay
// Body: { amount } — Records a payment from a customer, reducing their balance due
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const customerId = parseInt(resolvedParams.id, 10);
        const body = await request.json();
        const { amount } = body;

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'المبلغ غير صالح' }, { status: 400 });
        }

        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });

        if (amount > customer.balanceDue) {
            return NextResponse.json(
                { error: `المبلغ المدخل (${amount.toLocaleString()}) أكبر من الرصيد المستحق (${customer.balanceDue.toLocaleString()})` },
                { status: 400 }
            );
        }

        let updatedCustomer: any;
        await prisma.$transaction(async (tx) => {
            // 1. Create the payment record
            // Since this is a general payment, invoiceId is null
            await tx.payment.create({
                data: {
                    customerId,
                    amount,
                    notes: `تسديد رصيد العميل`
                }
            });

            // 2. Reduce the customer's balance due
            updatedCustomer = await tx.customer.update({
                where: { id: customerId },
                data: {
                    balanceDue: { decrement: amount },
                    lastPaymentAmount: amount,
                    lastPaymentDate: new Date()
                }
            });
        });

        return NextResponse.json({ success: true, newBalance: updatedCustomer?.balanceDue });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'فشلت عملية الدفع' }, { status: 500 });
    }
}
