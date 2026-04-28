import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const onlyArchived = searchParams.get('onlyArchived') === 'true';

        const suppliers = await prisma.supplier.findMany({
            where: { isArchived: onlyArchived },
            orderBy: { name: 'asc' },
            include: { _count: { select: { products: true, orders: true } } }
        });
        return NextResponse.json(suppliers);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const supplier = await prisma.supplier.create({ data: body });
        return NextResponse.json(supplier);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
