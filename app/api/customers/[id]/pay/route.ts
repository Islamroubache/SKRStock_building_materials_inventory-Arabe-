import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function calculateInvoiceStatus(total: number, paid: number) {
    if (paid >= total) return 'PAID';
    if (paid > 0) return 'PARTIAL';
    return 'UNPAID';
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const customerId = parseInt(resolvedParams.id, 10);
        const body = await request.json();
        const { amount, projectId } = body;

        let workingAmount = parseFloat(amount);

        if (isNaN(workingAmount) || workingAmount <= 0) {
            return NextResponse.json({ error: 'المبلغ غير صالح' }, { status: 400 });
        }

        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });

        // Calculate maximum debt that the user is allowed to pay.
        // If projectId is provided, the max debt is the sum of unpaid invoices for that project.
        // Else, it's the total debt of the customer.
        let targetInvoices = await prisma.invoice.findMany({
            where: {
                customerId,
                remaining: { gt: 0 },
                ...(projectId ? { order: { projectId: parseInt(projectId, 10) } } : {})
            },
            include: { order: true },
            orderBy: { date: 'asc' } // Oldest first
        });

        const maxDebt = targetInvoices.reduce((sum, inv) => sum + inv.remaining, 0);

        if (workingAmount > maxDebt) {
            return NextResponse.json(
                { error: `المبلغ المدخل (${workingAmount.toLocaleString()}) أكبر من الرصيد المستحق في هذا النطاق (${maxDebt.toLocaleString()})` },
                { status: 400 }
            );
        }

        let updatedCustomer: any;
        await prisma.$transaction(async (tx) => {
            let totalAmountDisbursed = 0;

            for (const invoice of targetInvoices) {
                if (workingAmount <= 0) break;

                const paymentForThisInvoice = Math.min(workingAmount, invoice.remaining);
                
                // Record the payment
                await tx.payment.create({
                    data: {
                        invoiceId: invoice.id,
                        customerId,
                        amount: paymentForThisInvoice,
                        paymentMethod: 'CASH',
                        notes: projectId ? `تسديد شامل للمشروع (توزيع آلي)` : `تسديد رصيد العميل الشامل (توزيع آلي)`,
                        paymentDate: new Date()
                    }
                });

                const newPaid = invoice.paid + paymentForThisInvoice;
                const newRemaining = invoice.total - newPaid;

                // Update invoice
                await tx.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        paid: newPaid,
                        remaining: newRemaining,
                        status: calculateInvoiceStatus(invoice.total, newPaid)
                    }
                });

                // Update Project if order belongs to one
                if (invoice.order.projectId) {
                    await tx.project.update({
                        where: { id: invoice.order.projectId },
                        data: { paidAmount: { increment: paymentForThisInvoice } }
                    });
                }

                workingAmount -= paymentForThisInvoice;
                totalAmountDisbursed += paymentForThisInvoice;
            }

            // Reduce the customer's overall balance due
            updatedCustomer = await tx.customer.update({
                where: { id: customerId },
                data: {
                    balanceDue: { decrement: totalAmountDisbursed },
                    lastPaymentAmount: totalAmountDisbursed,
                    lastPaymentDate: new Date()
                }
            });
        });

        return NextResponse.json({ success: true, newBalance: updatedCustomer?.balanceDue });
    } catch (e) {
        console.error('[BULK_PAY_ERROR]', e);
        return NextResponse.json({ error: 'فشلت عملية الدفع' }, { status: 500 });
    }
}
