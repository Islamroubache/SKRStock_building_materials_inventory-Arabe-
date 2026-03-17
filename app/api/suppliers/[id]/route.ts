import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/suppliers/[id] — Returns supplier details with all purchase orders
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        const supplier = await prisma.supplier.findUnique({
            where: { id },
            include: {
                products: {
                    select: { id: true, name: true, code: true, quantity: true, unit: true, purchasePrice: true, avgPurchasePrice: true }
                },
                orders: {
                    where: { type: 'PURCHASE' },
                    orderBy: { orderDate: 'desc' },
                    include: {
                        items: {
                            include: {
                                product: { select: { id: true, name: true, unit: true, quantity: true } }
                            }
                        }
                    }
                },
                payments: {
                    orderBy: { paymentDate: 'desc' }
                }
            }
        });
        if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(supplier);
    } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        const body = await request.json();
        const updated = await prisma.supplier.update({ where: { id }, data: body });
        return NextResponse.json(updated);
    } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);

        const supplier = await prisma.supplier.findUnique({ where: { id } });
        if (!supplier) return NextResponse.json({ error: 'المورد غير موجود' }, { status: 404 });

        // ❌ Condition 1: Supplier still has a balance due (we owe them money)
        if (supplier.balanceDue > 0) {
            return NextResponse.json(
                { error: `لا يمكن الحذف. لا يزال هناك رصيد مستحق لهذا المورد بقيمة ${supplier.balanceDue.toLocaleString()} دج. يجب تسوية الحساب أولاً.` },
                { status: 400 }
            );
        }

        // Get all products linked to this supplier
        const products = await prisma.product.findMany({
            where: { supplierId: id },
            select: { id: true, quantity: true, name: true }
        });

        // ❌ Condition 2: Products still have stock
        const hasStock = products.some(p => p.quantity > 0);
        if (hasStock) {
            const remaining = products.filter(p => p.quantity > 0).map(p => p.name).join(', ');
            return NextResponse.json(
                { error: `لا يمكن الحذف. لا تزال هناك كمية في مخزون المنتجات التالية: ${remaining}` },
                { status: 400 }
            );
        }

        // ✅ All conditions passed → Soft delete
        await prisma.supplier.update({
            where: { id },
            data: { isArchived: true }
        });

        return NextResponse.json({ success: true, message: 'تم أرشفة المورد بنجاح. سيبقى اسمه في السجلات التاريخية.' });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'فشلت العملية' }, { status: 500 });
    }
}
