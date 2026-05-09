import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const invoiceId = parseInt(params.id);

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        if (invoice.remaining >= 0) {
            return NextResponse.json({ error: 'No excess to refund' }, { status: 400 });
        }

        const refundAmount = Math.abs(invoice.remaining);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create a "Refund" payment (negative amount or just marked as refund)
            const payment = await tx.payment.create({
                data: {
                    invoiceId,
                    customerId: invoice.customerId,
                    amount: -refundAmount, // Record as negative payment to settle balance
                    paymentMethod: 'CASH',
                    notes: 'إرجاع فائض نقدي (Refund Excess)',
                    paymentDate: new Date()
                }
            });

            // 2. Update Invoice to 0 remaining
            const updatedInvoice = await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    paid: invoice.total, // Set paid to exactly total
                    remaining: 0,
                    status: 'PAID'
                }
            });

            // 3. Update Customer balance if applicable
            if (invoice.customerId) {
                await tx.customer.update({
                    where: { id: invoice.customerId },
                    data: {
                        balanceDue: { increment: refundAmount } // Increasing balanceDue because we gave money back
                    }
                });
            }

            return { payment, updatedInvoice };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error refunding excess:', error);
        return NextResponse.json({ error: 'Failed to refund' }, { status: 500 });
    }
}
