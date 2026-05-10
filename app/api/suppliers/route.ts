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

        // Sanitize body for Prisma
        const createData: any = {};
        const allowedFields = ['name', 'activity', 'phone', 'email', 'address', 'rc', 'nif', 'ai', 'nis', 'commune', 'wilaya', 'postalCode'];
        
        allowedFields.forEach(field => {
            if (body[field] !== undefined) {
                createData[field] = body[field];
            }
        });

        // Map postCode to postalCode if necessary
        if (body.postCode !== undefined && body.postalCode === undefined) {
            createData.postalCode = body.postCode;
        }

        const supplier = await prisma.supplier.create({ data: createData });
        return NextResponse.json(supplier);
    } catch (e) {
        console.error("POST Supplier Error:", e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
