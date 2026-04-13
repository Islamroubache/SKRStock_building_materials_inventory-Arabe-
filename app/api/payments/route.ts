import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateInvoiceStatus } from '@/lib/payment-helpers';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { invoiceId, customerId, amount, paymentMethod, chequeNumber, bankName, notes } = body;

        if (!invoiceId || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the Payment record
            const paymentData: any = {
                invoiceId,
                amount: parseFloat(amount),
                paymentMethod,
                chequeNumber,
                bankName,
                notes,
                paymentDate: new Date()
            };
            if (customerId) paymentData.customerId = customerId;

            const payment = await tx.payment.create({
                data: paymentData
            });

            // 2. Update the Invoice
            const invoice = await tx.invoice.findUnique({
                where: { id: invoiceId },
                include: { order: true }
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

            // 3. Update the Customer balance if customerId exists
            let updatedCustomer = null;
            if (customerId) {
                updatedCustomer = await tx.customer.update({
                    where: { id: customerId },
                    data: {
                        balanceDue: { decrement: parseFloat(amount) },
                        lastPaymentDate: new Date(),
                        lastPaymentAmount: parseFloat(amount)
                    }
                });
            }

            // 4. Update the project logic if applicable
            if (invoice.order?.projectId) {
                await tx.project.update({
                    where: { id: invoice.order.projectId },
                    data: { paidAmount: { increment: parseFloat(amount) } }
                });
            }

            return { payment, invoice: updatedInvoice, customer: updatedCustomer };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[PAYMENTS_POST]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
