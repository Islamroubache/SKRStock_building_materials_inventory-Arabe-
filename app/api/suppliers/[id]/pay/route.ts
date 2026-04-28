import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/suppliers/[id]/pay
// Body: { amount } — Records a payment to a supplier, reducing their balance due
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const supplierId = parseInt(resolvedParams.id, 10);
        const body = await request.json();
        const { amount } = body;

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'المبلغ غير صالح' }, { status: 400 });
        }

        const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
        if (!supplier) return NextResponse.json({ error: 'المورد غير موجود' }, { status: 404 });

        // Logic check:
        // If balance > 0 (we owe them), amount must be <= balanceDue
        if (supplier.balanceDue > 0 && amount > supplier.balanceDue) {
            return NextResponse.json(
                { error: `المبلغ المدخل (${amount.toLocaleString()}) أكبر من الرصيد المستحق (${supplier.balanceDue.toLocaleString()})` },
                { status: 400 }
            );
        }

        let updatedSupplier: any;
        await prisma.$transaction(async (tx) => {
            const isRetrieval = supplier.balanceDue < 0;
            
            // 1. Create the payment record
            // If it's a retrieval, the amount in payment record should be negative (money coming back)
            await tx.supplierPayment.create({
                data: {
                    supplierId,
                    amount: isRetrieval ? -amount : amount,
                    notes: isRetrieval ? `استرجاع مبالغ مستحقة من المورد` : `دفعة للمورد لتسوية الرصيد`
                }
            });

            // 2. Adjust the supplier's balance due
            // If we pay (balance > 0), we decrement.
            // If we retrieve (balance < 0), we increment (move towards 0).
            updatedSupplier = await tx.supplier.update({
                where: { id: supplierId },
                data: { balanceDue: isRetrieval ? { increment: amount } : { decrement: amount } }
            });
        });

        return NextResponse.json({ success: true, newBalance: updatedSupplier?.balanceDue });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'فشلت عملية الدفع' }, { status: 500 });
    }
}
