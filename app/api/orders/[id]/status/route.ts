import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const orderId = parseInt(resolvedParams.id, 10);
        const body = await request.json();
        const { status } = body; // 'DONE' or 'CANCELLED'

        if (!status || !['DONE', 'CANCELLED'].includes(status)) {
            return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: { batchAllocations: true }
                },
                invoice: true,
                customer: true,
                supplier: true
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'الطلبية غير موجودة' }, { status: 404 });
        }

        // 1. If changing to DONE
        if (status === 'DONE') {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'DONE' }
            });
            return NextResponse.json({ success: true });
        }

        // 2. If changing to CANCELLED and it's already cancelled
        if (order.status === 'CANCELLED') {
            return NextResponse.json({ error: 'الطلبية ملغية بالفعل' }, { status: 400 });
        }

        // 3. Rollback Logic for CANCELLED
        await prisma.$transaction(async (tx) => {
            // Update order status
            await tx.order.update({
                where: { id: orderId },
                data: { status: 'CANCELLED' }
            });

            if (order.type === 'SALE') {
                // Rollback Customer Debt & Invoice
                if (order.invoice) {
                    if (order.customerId) {
                        await tx.customer.update({
                            where: { id: order.customerId },
                            data: { balanceDue: { decrement: order.invoice.remaining } }
                        });
                    }
                    await tx.invoice.update({
                        where: { id: order.invoice.id },
                        data: { status: 'CANCELLED' }
                    });
                    // Remove associated payments
                    await tx.payment.deleteMany({
                        where: { invoiceId: order.invoice.id }
                    });
                }

                // Rollback Stock & Batches
                for (const item of order.items) {
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    if (!product) continue;

                    // Increment stock back
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { quantity: { increment: item.quantity } }
                    });

                    // Log stock movement
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            orderId: order.id,
                            movementType: 'IN',
                            quantity: item.quantity,
                            quantityBefore: product.quantity,
                            quantityAfter: product.quantity + item.quantity,
                            reason: 'إلغاء طلبية بيع'
                        }
                    });

                    // Restore Batches
                    for (const alloc of item.batchAllocations) {
                        await tx.productBatch.update({
                            where: { id: alloc.batchId },
                            data: {
                                remainingQty: { increment: alloc.quantity },
                                status: 'ACTIVE'
                            }
                        });
                    }
                }
            } else if (order.type === 'PURCHASE') {
                // Rollback Stock & Batches
                for (const item of order.items) {
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    if (!product) continue;

                    // Decrement stock
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { quantity: { decrement: item.quantity } }
                    });

                    // Log stock movement
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            orderId: order.id,
                            movementType: 'OUT',
                            quantity: item.quantity,
                            quantityBefore: product.quantity,
                            quantityAfter: product.quantity - item.quantity,
                            reason: 'إلغاء طلبية شراء'
                        }
                    });
                }

                // Invalidate Batches created by this purchase order
                await tx.productBatch.updateMany({
                    where: { purchaseOrderId: order.id },
                    data: {
                        status: 'CANCELLED',
                        remainingQty: 0
                    }
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'حدث خطأ أثناء تعديل حالة الطلبية' }, { status: 500 });
    }
}
