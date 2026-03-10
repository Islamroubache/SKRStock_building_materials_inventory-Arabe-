import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                projects: true,
                orders: { orderBy: { orderDate: 'desc' }, take: 10 },
                invoices: { orderBy: { date: 'desc' }, take: 10 }
            }
        });
        if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(customer);
    } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        const body = await request.json();
        const updated = await prisma.customer.update({ where: { id }, data: body });
        return NextResponse.json(updated);
    } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);

        const ordersCount = await prisma.order.count({ where: { customerId: id } });
        if (ordersCount > 0) return NextResponse.json({ error: 'لا يمكن حذف عميل لديه طلبات' }, { status: 400 });

        await prisma.customer.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}
