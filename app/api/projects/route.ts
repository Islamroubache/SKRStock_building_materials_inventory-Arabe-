import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(projects);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}
