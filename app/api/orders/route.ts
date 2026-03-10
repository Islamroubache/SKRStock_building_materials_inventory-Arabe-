import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateBatchNumber, updateNearestExpiry, getFIFOBatches } from '@/lib/batch-helpers';
import { calculateWeightedAverage } from '@/lib/weighted-average';
import { calculateInvoiceStatus, checkCreditLimit } from '@/lib/payment-helpers';

export async function GET(request: Request) {
    try {
        const orders = await prisma.order.findMany({
            orderBy: { orderDate: 'desc' },
            include: {
                customer: true,
                project: true,
                supplier: true,
                items: { include: { product: true } },
                invoice: true
            }
        });
        return NextResponse.json(orders);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { customerId, projectId, type, items, notes, guestName, guestPhone, initialPayment, paymentMethod, dueDate } = body;

        if (type !== 'SALE') {
            const orderNumber = "ORD-" + Date.now();
            const result = await prisma.$transaction(async (tx) => {
                const order = await tx.order.create({
                    data: {
                        customerId,
                        projectId,
                        supplierId: body.supplierId,
                        type,
                        orderNumber,
                        notes,
                        status: 'DONE',
                        total: body.total || 0,
                        items: {
                            create: items.map((i: any) => ({
                                productId: i.productId,
                                quantity: i.quantity,
                                unitPrice: i.unitPrice,
                                total: i.quantity * i.unitPrice
                            }))
                        }
                    },
                    include: { supplier: true }
                });

                if (type === 'PURCHASE') {
                    for (const item of items) {
                        const product = await tx.product.findUnique({
                            where: { id: item.productId }
                        });

                        if (product) {
                            const currentQty = product.quantity;
                            const currentAvg = product.avgPurchasePrice ?? product.purchasePrice;
                            const newQty = item.quantity;
                            const newUnitCost = item.unitPrice;

                            const newAvgPrice = calculateWeightedAverage(currentQty, currentAvg, newQty, newUnitCost);

                            const shouldTrackBatch = product.hasBatches || (product as any).hasExpiryDate;

                            await tx.product.update({
                                where: { id: item.productId },
                                data: {
                                    quantity: { increment: newQty },
                                    avgPurchasePrice: newAvgPrice,
                                    purchasePrice: newAvgPrice,
                                    hasBatches: shouldTrackBatch ? true : product.hasBatches
                                }
                            });

                            if (shouldTrackBatch) {
                                const batchNumber = await generateBatchNumber(tx);

                                await tx.productBatch.create({
                                    data: {
                                        productId: item.productId,
                                        supplierId: body.supplierId || null,
                                        batchNumber,
                                        purchaseOrderId: order.id,
                                        initialQty: newQty,
                                        remainingQty: newQty,
                                        unitCost: newUnitCost,
                                        totalCost: newUnitCost * newQty,
                                        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                                        manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
                                        status: 'ACTIVE'
                                    }
                                });
                                await updateNearestExpiry(item.productId, tx);
                            }

                            await tx.stockMovement.create({
                                data: {
                                    productId: item.productId,
                                    orderId: order.id,
                                    movementType: 'IN',
                                    quantity: newQty,
                                    quantityBefore: currentQty,
                                    quantityAfter: currentQty + newQty,
                                    supplierId: body.supplierId,
                                    unitCost: newUnitCost,
                                    totalCost: newUnitCost * newQty,
                                    reason: `شراء من المورد — ${order.supplier?.name || 'غير محدد'}`
                                }
                            });
                        }
                    }
                }
                return order;
            });
            return NextResponse.json(result);
        }

        // Logic for SALE
        if (!customerId && !guestName) {
            return NextResponse.json({ error: 'يجب تقديم معلومات العميل' }, { status: 400 });
        }

        const orderTotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
        const paidAmount = parseFloat(initialPayment || 0);
        const remainingAmount = orderTotal - paidAmount;

        let customer: any = null;
        if (customerId) {
            const creditCheck = await checkCreditLimit(customerId, orderTotal, paidAmount);
            if (!creditCheck.allowed) {
                return NextResponse.json({
                    error: creditCheck.message,
                    details: creditCheck
                }, { status: 400 });
            }
            customer = await prisma.customer.findUnique({ where: { id: customerId } });
        }

        const productIds = items.map((i: any) => i.productId);
        const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

        for (const item of items) {
            const p = products.find(prod => prod.id === item.productId);
            if (!p) return NextResponse.json({ error: `المنتج غير موجود: ${item.productId}` }, { status: 400 });
            if (item.quantity > p.quantity) {
                return NextResponse.json({ error: `الكمية المتوفرة من ${p.name} غير كافية (${p.quantity} متوفر)` }, { status: 400 });
            }
        }

        const timestamp = Date.now();
        const orderNumber = `BC-${timestamp}`;
        const invoiceNumber = `FC-${orderNumber}`;

        const result = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    customerId: customerId || null,
                    projectId: (customerId && projectId) ? projectId : null,
                    customerName: guestName || null,
                    customerPhone: guestPhone || null,
                    orderNumber,
                    type: 'SALE',
                    status: 'DONE',
                    total: orderTotal,
                    notes,
                    items: {
                        create: items.map((i: any) => ({
                            productId: i.productId,
                            quantity: i.quantity,
                            unitPrice: i.unitPrice,
                            total: i.quantity * i.unitPrice
                        }))
                    }
                } as any,
                include: { items: true }
            });

            for (const item of items) {
                const p = products.find((prod) => prod.id === item.productId)!;

                let batchNote = "";
                if (p.hasBatches) {
                    const allocations = await getFIFOBatches(p.id, item.quantity, tx);

                    for (const alloc of allocations) {
                        await tx.productBatch.update({
                            where: { id: alloc.batchId },
                            data: {
                                remainingQty: { decrement: alloc.quantity }
                            }
                        });

                        const updatedBatch = await tx.productBatch.findUnique({ where: { id: alloc.batchId } });
                        if (updatedBatch && updatedBatch.remainingQty <= 0) {
                            await tx.productBatch.update({
                                where: { id: alloc.batchId },
                                data: { status: 'DEPLETED' }
                            });
                        }
                    }

                    const batchNumbers = await tx.productBatch.findMany({
                        where: { id: { in: allocations.map(a => a.batchId) } },
                        select: { batchNumber: true, id: true }
                    });

                    batchNote = " — سحب FIFO من دفعات: " + allocations.map(a => {
                        const b = batchNumbers.find((bn: any) => bn.id === a.batchId);
                        return `${b?.batchNumber}(${a.quantity})`;
                    }).join(", ");

                    // Create OrderItemBatches
                    const orderItem = (newOrder as any).items.find((oi: any) => oi.productId === p.id)!;
                    for (const alloc of allocations) {
                        await tx.orderItemBatch.create({
                            data: {
                                orderItemId: orderItem.id,
                                batchId: alloc.batchId,
                                quantity: alloc.quantity,
                                unitCost: alloc.unitCost
                            }
                        });
                    }

                    await updateNearestExpiry(p.id, tx);
                }

                await tx.product.update({
                    where: { id: p.id },
                    data: { quantity: { decrement: item.quantity } }
                });

                await tx.stockMovement.create({
                    data: {
                        productId: p.id,
                        orderId: newOrder.id,
                        movementType: 'OUT',
                        quantity: item.quantity,
                        quantityBefore: p.quantity,
                        quantityAfter: p.quantity - item.quantity,
                        reason: `بيع للعميل - ${customer?.name || guestName}${batchNote}`
                    }
                });
            }

            if (customerId) {
                await tx.customer.update({
                    where: { id: customerId },
                    data: {
                        balanceDue: { increment: remainingAmount },
                        lastPaymentDate: paidAmount > 0 ? new Date() : undefined,
                        lastPaymentAmount: paidAmount > 0 ? paidAmount : undefined
                    }
                });
            }

            const invoiceStatus = calculateInvoiceStatus(orderTotal, paidAmount);
            const invoice = await tx.invoice.create({
                data: {
                    orderId: newOrder.id,
                    customerId: customerId || null,
                    customerName: guestName || null,
                    customerPhone: guestPhone || null,
                    invoiceNumber,
                    type: 'INVOICE',
                    total: orderTotal,
                    paid: paidAmount,
                    remaining: remainingAmount,
                    status: invoiceStatus,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    date: new Date()
                }
            });

            if (paidAmount > 0) {
                await tx.payment.create({
                    data: {
                        invoiceId: invoice.id,
                        customerId: customerId || 0, // 0 for guest if needed, or handle guest payments
                        amount: paidAmount,
                        paymentMethod: paymentMethod || 'CASH',
                        paymentDate: new Date(),
                        notes: 'دفعة أولية عند الطلب'
                    }
                });
            }

            return { newOrder, invoice };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
