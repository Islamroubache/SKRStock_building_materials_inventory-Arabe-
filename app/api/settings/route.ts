import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        let settings = await (prisma as any).storeSettings?.findUnique({
            where: { id: 1 }
        });

        // Initialize if not exists
        if (!settings && (prisma as any).storeSettings) {
            settings = await (prisma as any).storeSettings.create({
                data: { id: 1, storeName: 'مخزون' }
            });
        }

        return NextResponse.json(settings);
    } catch (e: any) {
        console.error('API /api/settings GET Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        // Remove identity fields if they exist to prevent errors
        const { id, createdAt, updatedAt, ...updateData } = body;

        const settings = await (prisma as any).storeSettings?.upsert({
            where: { id: 1 },
            update: updateData,
            create: { id: 1, ...updateData }
        });

        return NextResponse.json(settings);
    } catch (e: any) {
        console.error('API /api/settings POST Error:', e);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
