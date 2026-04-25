import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateInvoiceStatus } from '@/lib/payment-helpers';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { invoiceId, customerId, supplierId, amount, paymentMethod, chequeNumber, bankName, notes } = body;

        if (!invoiceId || amount === undefined || amount === null) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Determine if it's a Customer or Supplier payment
            let payment;
            if (supplierId) {
                // Create SupplierPayment
                payment = await tx.supplierPayment.create({
                    data: {
                        supplierId,
                        invoiceId,
                        amount: parseFloat(amount),
                        paymentMethod,
                        chequeNumber,
                        bankName,
                        notes,
                        paymentDate: new Date()
                    }
                });

                // Update Supplier Balance
                await tx.supplier.update({
                    where: { id: supplierId },
                    data: {
                        balanceDue: { decrement: parseFloat(amount) }
                    }
                });
            } else {
                // Create regular Customer Payment
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

                payment = await tx.payment.create({
                    data: paymentData
                });

                // Update Customer balance
                if (customerId) {
                    await tx.customer.update({
                        where: { id: customerId },
                        data: {
                            balanceDue: { decrement: parseFloat(amount) },
                            lastPaymentDate: new Date(),
                            lastPaymentAmount: parseFloat(amount)
                        }
                    });
                }
            }

            // 2. Update the Invoice (shared logic)
            const invoice = await tx.invoice.findUnique({
                where: { id: invoiceId },
                include: { 
                    order: {
                        include: {
                            items: true
                        }
                    } 
                }
            });

            if (!invoice) throw new Error('Invoice not found');

            const netTotal = invoice.total;

            const newPaidAmount = invoice.paid + parseFloat(amount);
            const newRemaining = netTotal - newPaidAmount;
            const newStatus = calculateInvoiceStatus(netTotal, newPaidAmount);

            const updatedInvoice = await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    paid: newPaidAmount,
                    remaining: newRemaining,
                    status: newStatus
                }
            });


            // 3. Update the project logic if applicable
            if (invoice.order?.projectId) {
                await tx.project.update({
                    where: { id: invoice.order.projectId },
                    data: { paidAmount: { increment: parseFloat(amount) } }
                });
            }

            return { payment, invoice: updatedInvoice };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[PAYMENTS_POST]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
