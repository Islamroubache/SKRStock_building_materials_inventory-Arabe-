import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateInvoiceStatus } from '@/lib/payment-helpers';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { invoiceId, customerId, amount, paymentMethod, chequeNumber, bankName, notes } = body;

        if (!invoiceId || !customerId || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the Payment record
            const payment = await tx.payment.create({
                data: {
                    invoiceId,
                    customerId,
                    amount: parseFloat(amount),
                    paymentMethod,
                    chequeNumber,
                    bankName,
                    notes,
                    paymentDate: new Date()
                }
            });

            // 2. Update the Invoice
            const invoice = await tx.invoice.findUnique({
                where: { id: invoiceId }
            });

            if (!invoice) throw new Error('Invoice not found');

            const newPaidAmount = invoice.paid + parseFloat(amount);
            const newRemaining = invoice.total - newPaidAmount;
            const newStatus = calculateInvoiceStatus(invoice.total, newPaidAmount);

            const updatedInvoice = await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    paid: newPaidAmount,
                    remaining: newRemaining,
                    status: newStatus
                }
            });

            // 3. Update the Customer balance
            const updatedCustomer = await tx.customer.update({
                where: { id: customerId },
                data: {
                    balanceDue: { decrement: parseFloat(amount) },
                    lastPaymentDate: new Date(),
                    lastPaymentAmount: parseFloat(amount)
                }
            });

            return { payment, invoice: updatedInvoice, customer: updatedCustomer };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[PAYMENTS_POST]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
