import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        const projects = await prisma.project.findMany({
            where: { customerId: id },
            include: {
                _count: { select: { orders: true } }
            },
            orderBy: { startDate: 'desc' }
        });
        return NextResponse.json(projects);
    } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        const body = await request.json();

        const project = await prisma.project.create({
            data: {
                customerId: id,
                name: body.name,
                description: body.description,
                status: body.status || 'ACTIVE',
                totalAmount: body.totalAmount || 0,
                paidAmount: body.paidAmount || 0,
                startDate: body.startDate ? new Date(body.startDate) : new Date(),
                endDate: body.endDate ? new Date(body.endDate) : null,
            }
        });
        return NextResponse.json(project);
    } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}
