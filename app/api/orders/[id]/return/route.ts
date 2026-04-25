import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const resolvedParams = await params;
        const orderId = parseInt(resolvedParams.id, 10);
        const body = await request.json();
        // items: [{ orderItemId, returnQty }]
        const { items, notes } = body;

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'يجب تحديد المنتجات المرتجعة' }, { status: 400 });
        }

        // Fetch the original order
        const originalOrder = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: { include: { product: true } },
                customer: true,
                supplier: true,
            }
        });

        if (!originalOrder) {
            return NextResponse.json({ error: 'الطلبية غير موجودة' }, { status: 404 });
        }

        if (originalOrder.status === 'CANCELLED') {
            return NextResponse.json({ error: 'لا يمكن استرجاع طلبية ملغاة' }, { status: 400 });
        }

        // Validate return quantities
        for (const ret of items) {
            const originalItem = originalOrder.items.find(i => i.id === ret.orderItemId);
            if (!originalItem) {
                return NextResponse.json({ error: `بند غير موجود في الطلبية الأصلية` }, { status: 400 });
            }
            const alreadyReturned = originalItem.returnedQuantity || 0;
            const maxReturnable = originalItem.quantity - alreadyReturned;
            if (ret.returnQty > maxReturnable) {
                return NextResponse.json({
                    error: `الكمية المرتجعة من "${originalItem.product.name}" (${ret.returnQty}) تتجاوز الكمية القابلة للاسترجاع (${maxReturnable})`
                }, { status: 400 });
            }
        }

        const ts = Date.now();
        const returnOrderNumber = `RET/${originalOrder.orderNumber}/${ts}`;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create return order for record keeping (No Invoice created for this)
            const returnOrder = await tx.order.create({
                data: {
                    orderNumber: returnOrderNumber,
                    type: originalOrder.type === 'SALE' ? 'RETURN_SALE' : 'RETURN_PURCHASE',
                    status: 'DONE',
                    total: 0, // will update below
                    grandTotal: 0,
                    isOfficial: originalOrder.isOfficial,
                    customerId: originalOrder.customerId || undefined,
                    supplierId: originalOrder.supplierId || undefined,
                    projectId: originalOrder.projectId || undefined,
                    customerName: originalOrder.customerName || undefined,
                    notes: notes || `استرجاع من الطلبية: ${originalOrder.orderNumber}`,
                    items: {
                        create: items.map((ret: any) => {
                            const orig = originalOrder.items.find(i => i.id === ret.orderItemId)!;
                            return {
                                productId: orig.productId,
                                quantity: ret.returnQty,
                                unitPrice: orig.unitPrice,
                                total: ret.returnQty * orig.unitPrice,
                            };
                        })
                    }
                }
            });

            let returnTotal = 0;

            for (const ret of items) {
                const originalItem = originalOrder.items.find(i => i.id === ret.orderItemId)!;
                const product = originalItem.product;
                const itemReturnTotal = ret.returnQty * originalItem.unitPrice;
                returnTotal += itemReturnTotal;

                // Update returned quantity on original item
                await tx.orderItem.update({
                    where: { id: ret.orderItemId },
                    data: { returnedQuantity: { increment: ret.returnQty } }
                });

                // Reverse stock movement
                const currentQty = product.quantity;
                if (originalOrder.type === 'SALE') {
                    // Sale return → stock comes back IN
                    await tx.product.update({
                        where: { id: product.id },
                        data: { quantity: { increment: ret.returnQty } }
                    });
                    await tx.stockMovement.create({
                        data: {
                            productId: product.id,
                            orderId: returnOrder.id, // Link to return order
                            movementType: 'RETURN_IN',
                            quantity: ret.returnQty,
                            quantityBefore: currentQty,
                            quantityAfter: currentQty + ret.returnQty,
                            reason: `استرجاع مبيعات — ${originalOrder.orderNumber} (الكمية: ${ret.returnQty})`
                        }
                    });
                } else {
                    // Purchase return → stock goes OUT
                    await tx.product.update({
                        where: { id: product.id },
                        data: { quantity: { decrement: ret.returnQty } }
                    });
                    await tx.stockMovement.create({
                        data: {
                            productId: product.id,
                            orderId: returnOrder.id, // Link to return order
                            movementType: 'RETURN_OUT',
                            quantity: ret.returnQty,
                            quantityBefore: currentQty,
                            quantityAfter: currentQty - ret.returnQty,
                            supplierId: originalOrder.supplierId || null,
                            reason: `استرجاع مشتريات — ${originalOrder.orderNumber} (الكمية: ${ret.returnQty})`
                        }
                    });
                }
            }

            // Update return order totals
            await tx.order.update({
                where: { id: returnOrder.id },
                data: { total: returnTotal, grandTotal: returnTotal }
            });

            // Fetch and update the corresponding Invoice of original order
            const linkedInvoice = await tx.invoice.findUnique({
                where: { orderId: originalOrder.id }
            });

            if (linkedInvoice) {
                const newTotal = Math.max(0, linkedInvoice.total - returnTotal);
                const newGrandTotal = Math.max(0, (linkedInvoice.grandTotal ?? linkedInvoice.total) - returnTotal);
                const newRemaining = newTotal - linkedInvoice.paid;
                
                let newStatus = 'UNPAID';
                if (linkedInvoice.paid >= newTotal && newTotal > 0) {
                    newStatus = newRemaining < 0 ? 'CREDIT' : 'PAID';
                } else if (newTotal <= 0) {
                    newStatus = 'PAID';
                } else if (linkedInvoice.paid > 0) {
                    newStatus = 'PARTIAL';
                }

                await tx.invoice.update({
                    where: { id: linkedInvoice.id },
                    data: {
                        total: newTotal,
                        grandTotal: newGrandTotal,
                        remaining: newRemaining,
                        status: newStatus
                    }
                });
            }

            // Decrement total on original order
            const updatedOriginalOrder = await tx.order.update({
                where: { id: originalOrder.id },
                data: { 
                    total: { decrement: returnTotal },
                    grandTotal: { decrement: returnTotal }
                },
                include: { items: true, invoice: true }
            });

            // Update customer balanceDue (allow negative for credit balance)
            if (originalOrder.customerId) {
                await tx.customer.update({
                    where: { id: originalOrder.customerId },
                    data: { balanceDue: { decrement: returnTotal } }
                });
            }

            return { success: true, order: updatedOriginalOrder, returnOrder, returnTotal };
        });

        return NextResponse.json(result);
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || 'فشلت عملية الاسترجاع' }, { status: 500 });
    }
}
