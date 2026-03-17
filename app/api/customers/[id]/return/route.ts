import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/customers/[id]/return
// Body: { orderItemId, quantity } — Returns quantity of a specific order item back from a customer
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const customerId = parseInt(resolvedParams.id, 10);
        const body = await request.json();
        const { orderItemId, quantity } = body;

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
        if (orderItem.order.customerId !== customerId) {
            return NextResponse.json({ error: 'هذا العنصر لا ينتمي لهذا العميل' }, { status: 403 });
        }

        const remainingToReturn = orderItem.quantity - orderItem.returnedQuantity;
        if (quantity > remainingToReturn) {
            return NextResponse.json({ error: `الكمية المطلوبة (${quantity}) أكبر من الكمية المتبقية الممكن استرجاعها (${remainingToReturn})` }, { status: 400 });
        }

        const returnValue = quantity * orderItem.unitPrice;

        await prisma.$transaction(async (tx) => {
            // 1. Update returnedQuantity on OrderItem
            await tx.orderItem.update({
                where: { id: orderItem.id },
                data: { returnedQuantity: { increment: quantity } }
            });

            // 2. Increase product stock (customer returned it to us)
            await tx.product.update({
                where: { id: orderItem.productId },
                data: { quantity: { increment: quantity } }
            });

            // 3. Reduce customer balance due (they owe us less now, or we owe them)
            await tx.customer.update({
                where: { id: customerId },
                data: { balanceDue: { decrement: returnValue } }
            });

            // 4. Log stock movement
            await tx.stockMovement.create({
                data: {
                    productId: orderItem.productId,
                    orderId: orderItem.orderId,
                    movementType: 'IN', // Inventory comes back in
                    quantity: quantity,
                    quantityBefore: orderItem.product.quantity,
                    quantityAfter: orderItem.product.quantity + quantity,
                    supplierId: null,
                    unitCost: orderItem.unitPrice,
                    totalCost: returnValue,
                    reason: 'إرجاع بضاعة من عميل'
                }
            });
        });

        return NextResponse.json({ success: true, returnValue });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'فشلت عملية الإرجاع' }, { status: 500 });
    }
}
