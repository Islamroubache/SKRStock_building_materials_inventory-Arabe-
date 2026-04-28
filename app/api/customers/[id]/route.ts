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
                orders: {
                    orderBy: { orderDate: 'desc' },
                    include: {
                        project: { select: { id: true, name: true } },
                        items: {
                            include: {
                                product: { select: { id: true, name: true, unit: true, quantity: true } }
                            }
                        },
                        invoice: {
                            include: {
                                payments: {
                                    orderBy: { paymentDate: 'asc' },
                                    take: 1
                                }
                            }
                        }
                    }
                },
                invoices: { orderBy: { date: 'desc' }, take: 10 },
                payments: { 
                    orderBy: { paymentDate: 'desc' },
                    include: {
                        invoice: {
                            include: {
                                order: {
                                    select: { 
                                        orderNumber: true,
                                        projectId: true,
                                        project: { select: { name: true } }
                                    }
                                }
                            }
                        }
                    }
                }
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

        // Exclude relations and metadata from the update data
        const { id: _id, projects, orders, invoices, payments, createdAt, ...updateData } = body;

        const updated = await prisma.customer.update({
            where: { id },
            data: updateData
        });
        return NextResponse.json(updated);
    } catch (e) {
        console.error('Update Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
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
