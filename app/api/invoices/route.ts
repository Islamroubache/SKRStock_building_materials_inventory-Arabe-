import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const invoices = await prisma.invoice.findMany({
            orderBy: { date: 'desc' },
            include: {
                customer: true,
                order: { select: { orderNumber: true } }
            }
        });
        return NextResponse.json(invoices);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
