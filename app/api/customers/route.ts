import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const archivedStr = searchParams.get('isArchived');
        const isArchived = archivedStr === 'true';

        const customers = await prisma.customer.findMany({
            where: { isArchived: isArchived },
            orderBy: { name: 'asc' },
            include: { 
                _count: { 
                    select: { 
                        projects: { where: { status: 'ACTIVE' } }, 
                        orders: true 
                    } 
                },
                invoices: {
                    where: {
                        status: { not: 'PAID' },
                        remaining: { gt: 0 },
                        dueDate: { lte: new Date() }
                    },
                    select: { id: true },
                    take: 1
                }
            }
        });

        const customersWithOverdue = customers.map(c => ({
            ...c,
            hasOverdue: c.invoices.length > 0
        }));

        return NextResponse.json(customersWithOverdue);
    } catch (e: any) {
        console.error('API /api/customers GET Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const customer = await prisma.customer.create({ data: body });
        return NextResponse.json(customer);
    } catch (e: any) {
        console.error('API /api/customers POST Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
