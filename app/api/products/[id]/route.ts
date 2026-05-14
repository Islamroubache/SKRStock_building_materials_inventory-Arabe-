import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateNearestExpiry } from '@/lib/batch-helpers';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                supplier: true,
                stockMovements: {
                    orderBy: { createdAt: 'desc' },
                    take: 50
                },
                _count: {
                    select: { orderItems: true }
                }
            }
        });
        if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        const body = await request.json();

        if (body.sellPrice && body.purchasePrice && body.sellPrice < body.purchasePrice) {
            return NextResponse.json({ error: 'سعر البيع لا يمكن أن يكون أقل من سعر الشراء' }, { status: 400 });
        }

        // Fix weird years (e.g. 0026 -> 2026)
        let finalExpiry = null;
        if (body.expiryDate) {
            const d = new Date(body.expiryDate);
            if (d.getFullYear() < 100) {
                d.setFullYear(d.getFullYear() + 2000);
            }
            finalExpiry = d;
        }

        const product = await prisma.$transaction(async (tx) => {
            const currentProduct = await tx.product.findUnique({
                where: { id }
            });

            if (!currentProduct) throw new Error('Product not found');

            const updatedProduct = await tx.product.update({
                where: { id },
                data: {
                    code: body.code !== undefined ? body.code : currentProduct.code,
                    name: body.name !== undefined ? body.name : currentProduct.name,
                    category: body.category !== undefined ? body.category : currentProduct.category,
                    purchasePrice: body.purchasePrice !== undefined ? parseFloat(String(body.purchasePrice)) : currentProduct.purchasePrice,
                    sellPrice: body.sellPrice !== undefined ? parseFloat(String(body.sellPrice)) : currentProduct.sellPrice,
                    quantity: body.quantity !== undefined ? parseInt(String(body.quantity)) : currentProduct.quantity,
                    minQuantity: body.minQuantity !== undefined ? parseInt(String(body.minQuantity)) : currentProduct.minQuantity,
                    unit: body.unit !== undefined ? body.unit : currentProduct.unit,
                    isArchived: (body.isArchived === true && currentProduct.quantity > 0) 
                        ? (function() { throw new Error('لا يمكن أرشفة منتج لا يزال لديه كمية في المخزون') })()
                        : (body.isArchived !== undefined ? body.isArchived : (currentProduct as any).isArchived),
                    supplier: (body.supplierId !== undefined)
                        ? (body.supplierId && !isNaN(Number(body.supplierId)) ? { connect: { id: Number(body.supplierId) } } : { disconnect: true })
                        : undefined,
                    nearestExpiryDate: body.expiryDate !== undefined ? finalExpiry : currentProduct.nearestExpiryDate,
                    hasBatches: body.hasBatches !== undefined ? body.hasBatches : currentProduct.hasBatches,
                    hasExpiryDate: body.hasExpiryDate !== undefined ? body.hasExpiryDate : currentProduct.hasExpiryDate,
                    tva: body.tva !== undefined ? (body.tva === null ? null : parseFloat(String(body.tva))) : currentProduct.tva,
                }
            });

            // If batches were just enabled and stock exists, create initial batch
            if (updatedProduct.hasBatches && !currentProduct.hasBatches && updatedProduct.quantity > 0) {
                const lastBatch = await tx.productBatch.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
                const batchNumber = `BAT-${String((lastBatch?.id || 0) + 1).padStart(4, '0')}`;

                await tx.productBatch.create({
                    data: {
                        productId: updatedProduct.id,
                        batchNumber,
                        initialQty: updatedProduct.quantity,
                        remainingQty: updatedProduct.quantity,
                        unitCost: updatedProduct.purchasePrice,
                        totalCost: updatedProduct.quantity * updatedProduct.purchasePrice,
                        expiryDate: finalExpiry,
                        supplierId: updatedProduct.supplierId,
                        status: 'ACTIVE'
                    }
                });
            }

            // Always sync nearestExpiryDate if product has batches
            if (updatedProduct.hasBatches) {
                await updateNearestExpiry(updatedProduct.id, tx);
            }

            return updatedProduct;
        });

        return NextResponse.json(product);
    } catch (error: any) {
        if (error?.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('name')) {
                return NextResponse.json({ error: 'اسم المنتج موجود مسبقاً' }, { status: 400 });
            }
            return NextResponse.json({ error: 'كود المنتج موجود مسبقاً' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}


export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);

        // 1. Check for pending orders
        const activeOrders = await prisma.orderItem.count({
            where: {
                productId: id,
                order: { status: 'PENDING' }
            }
        });

        if (activeOrders > 0) {
            return NextResponse.json({ error: 'لا يمكن حذف منتج لديه طلبات نشطة' }, { status: 400 });
        }

        const product = await prisma.product.findUnique({ where: { id }, select: { quantity: true } });
        if (product && product.quantity > 0) {
            return NextResponse.json({ error: 'لا يمكن أرشفة منتج لا يزال لديه كمية في المخزون' }, { status: 400 });
        }

        // 2. Perform Soft Delete (Archiving)
        await prisma.product.update({
            where: { id },
            data: { isArchived: true }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Archive Product Error:', error);
        return NextResponse.json({ error: error.message || 'فشل أرشفة المنتج' }, { status: 500 });
    }
}
