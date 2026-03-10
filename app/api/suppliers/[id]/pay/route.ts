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

        if (amount > supplier.balanceDue) {
            return NextResponse.json(
                { error: `المبلغ المدخل (${amount.toLocaleString()}) أكبر من الرصيد المستحق (${supplier.balanceDue.toLocaleString()})` },
                { status: 400 }
            );
        }

        const updated = await prisma.supplier.update({
            where: { id: supplierId },
            data: { balanceDue: { decrement: amount } }
        });

        return NextResponse.json({ success: true, newBalance: updated.balanceDue });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'فشلت عملية الدفع' }, { status: 500 });
    }
}
