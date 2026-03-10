import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/suppliers/[id]/return
// Body: { orderItemId, quantity } — Returns quantity of a specific order item back to supplier
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const supplierId = parseInt(resolvedParams.id, 10);
        const body = await request.json();
        const { orderItemId, quantity, reason } = body;

        if (!orderItemId || !quantity || quantity <= 0) {
            return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
        }

        // Get the order item with its product and order
        const orderItem = await prisma.orderItem.findUnique({
            where: { id: orderItemId },
            include: {
                product: true,
                order: true
            }
        });

        if (!orderItem) return NextResponse.json({ error: 'العنصر غير موجود' }, { status: 404 });
        if (orderItem.order.supplierId !== supplierId) {
            return NextResponse.json({ error: 'هذا العنصر لا ينتمي لهذا المورد' }, { status: 403 });
        }

        const remainingToReturn = orderItem.quantity - orderItem.returnedQuantity;
        if (quantity > remainingToReturn) {
            return NextResponse.json({ error: `الكمية المطلوبة (${quantity}) أكبر من الكمية المتبقية الممكن إرجاعها (${remainingToReturn})` }, { status: 400 });
        }

        if (quantity > orderItem.product.quantity) {
            return NextResponse.json({ error: `الكمية المطلوبة (${quantity}) أكبر من المتوفر في المخزون (${orderItem.product.quantity})` }, { status: 400 });
        }

        const returnValue = quantity * orderItem.unitPrice;

        await prisma.$transaction(async (tx) => {
            // 1. Update returnedQuantity on OrderItem
            await tx.orderItem.update({
                where: { id: orderItem.id },
                data: { returnedQuantity: { increment: quantity } }
            });

            // 2. Reduce product stock
            await tx.product.update({
                where: { id: orderItem.productId },
                data: { quantity: { decrement: quantity } }
            });

            // 3. Reduce supplier balance due (we owe them less now)
            await tx.supplier.update({
                where: { id: supplierId },
                data: { balanceDue: { decrement: returnValue } }
            });

            // 4. Reduce Batch quantity if applicable
            if (orderItem.product.hasBatches) {
                const batch = await tx.productBatch.findFirst({
                    where: {
                        productId: orderItem.productId,
                        purchaseOrderId: orderItem.order.id
                    }
                });

                if (batch) {
                    await tx.productBatch.update({
                        where: { id: batch.id },
                        data: { remainingQty: { decrement: quantity } }
                    });
                }
            }

            // 5. Record stock movement
            const product = await tx.product.findUnique({ where: { id: orderItem.productId } });
            await tx.stockMovement.create({
                data: {
                    productId: orderItem.productId,
                    movementType: 'OUT',
                    quantity,
                    quantityBefore: (product?.quantity ?? 0) + quantity,
                    quantityAfter: product?.quantity ?? 0,
                    supplierId,
                    unitCost: orderItem.unitPrice,
                    totalCost: returnValue,
                    reason: reason || `إرجاع للمورد — طلبية ${orderItem.order.orderNumber}`
                }
            });
        });

        return NextResponse.json({ success: true, returnValue });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'فشلت عملية الإرجاع' }, { status: 500 });
    }
}
