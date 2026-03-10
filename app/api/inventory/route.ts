import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'ALL';

        // Fetch products for stock overview
        const products = await prisma.product.findMany({
            include: { supplier: true },
            orderBy: { name: 'asc' }
        });

        // Build movement query based on filter
        let movementWhere = {};
        if (type !== 'ALL') {
            movementWhere = { movementType: type };
        }

        // Fetch recent stock movements
        const movements = await prisma.stockMovement.findMany({
            where: movementWhere,
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                product: { select: { name: true, unit: true } },
                order: { select: { orderNumber: true } }
            }
        });

        return NextResponse.json({
            products,
            movements
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
