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
                const sId = parseInt(supplierId);
                const iId = invoiceId ? parseInt(invoiceId) : null;
                const payAmount = parseFloat(amount);

                if (isNaN(sId)) throw new Error('Invalid Supplier ID');
                if (isNaN(payAmount)) throw new Error('Invalid Amount');

                payment = await tx.supplierPayment.create({
                    data: {
                        amount: payAmount,
                        paymentMethod: paymentMethod || 'CASH',
                        chequeNumber: chequeNumber || null,
                        bankName: bankName || null,
                        notes: notes || null,
                        paymentDate: new Date(),
                        supplier: { connect: { id: sId } },
                        ...(iId ? { invoice: { connect: { id: iId } } } : {})
                    }
                });

                // Update Supplier Balance
                await tx.supplier.update({
                    where: { id: sId },
                    data: {
                        balanceDue: { decrement: payAmount }
                    }
                });
            } else {
                // Create regular Customer Payment
                const iId = parseInt(invoiceId);
                const cId = customerId ? parseInt(customerId) : null;
                const payAmount = parseFloat(amount);

                if (isNaN(iId)) throw new Error('Invalid Invoice ID');
                if (isNaN(payAmount)) throw new Error('Invalid Amount');

                const paymentData: any = {
                    amount: payAmount,
                    paymentMethod: paymentMethod || 'CASH',
                    chequeNumber: chequeNumber || null,
                    bankName: bankName || null,
                    notes: notes || null,
                    paymentDate: new Date(),
                    invoice: { connect: { id: iId } }
                };
                
                if (cId && !isNaN(cId)) {
                    paymentData.customer = { connect: { id: cId } };
                }

                payment = await tx.payment.create({
                    data: paymentData
                });

                // Update Customer balance
                if (cId && !isNaN(cId)) {
                    await tx.customer.update({
                        where: { id: cId },
                        data: {
                            balanceDue: { decrement: payAmount },
                            lastPaymentDate: new Date(),
                            lastPaymentAmount: payAmount
                        }
                    });
                }
            }

            // 2. Update the Invoice (shared logic)
            const invId = parseInt(invoiceId);
            const invoice = await tx.invoice.findUnique({
                where: { id: invId },
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
