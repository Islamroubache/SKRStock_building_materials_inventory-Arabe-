/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, context: any) {
    try {
        const params = await context.params;
        const id = parseInt(params.id);

        if (isNaN(id)) {
            return NextResponse.json({ error: 'ID المنتج غير صالح' }, { status: 400 });
        }

        const batches = await prisma.productBatch.findMany({
            where: { productId: id },
            orderBy: [
                { status: 'asc' }, // ACTIVE first
                { expiryDate: 'asc' },
                { purchaseDate: 'desc' }
            ]
        });

        return NextResponse.json(batches);
    } catch (error) {
        console.error('Error fetching batches:', error);
        return NextResponse.json({ error: 'فشل في جلب الدفعات' }, { status: 500 });
    }
}
