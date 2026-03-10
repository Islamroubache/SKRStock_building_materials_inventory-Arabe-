import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { projects: true, orders: true } } }
        });
        return NextResponse.json(customers);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const customer = await prisma.customer.create({ data: body });
        return NextResponse.json(customer);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
