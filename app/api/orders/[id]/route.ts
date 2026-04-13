import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                customer: true,
                project: true,
                invoice: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'الطلبية غير موجودة' }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'فشل في جلب بيانات الطلبية' }, { status: 500 });
    }
}
