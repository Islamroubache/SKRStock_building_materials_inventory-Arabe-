import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        const body = await request.json();

        const project = await prisma.project.update({
            where: { id },
            data: {
                status: body.status
            }
        });
        return NextResponse.json(project);
    } catch (e) {
        console.error('[PROJECT_PATCH_ERROR]', e);
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
}
