/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, context: any) {
    try {
        const params = await context.params;
        const id = parseInt(params.id);
        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
        }

        // @ts-ignore - Bypass IDE cache issue, npx tsc passes cleanly
        const payments = await prisma.payment.findMany({
            where: { invoiceId: id },
            orderBy: { paymentDate: 'desc' }
        });

        return NextResponse.json(payments);
    } catch (error: any) {
        console.error('[INVOICE_PAYMENTS_GET]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
