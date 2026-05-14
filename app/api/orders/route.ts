import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateBatchNumber, updateNearestExpiry, getFIFOBatches } from '@/lib/batch-helpers';
import { calculateWeightedAverage } from '@/lib/weighted-average';
import { calculateInvoiceStatus, checkCreditLimit } from '@/lib/payment-helpers';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        
        const orders = await prisma.order.findMany({
            where: type ? { type: type as any } : undefined,
            orderBy: { orderDate: 'desc' },
            include: {
                customer: true,
                project: true,
                supplier: true,
                items: { include: { product: true } },
                invoice: {
                    include: {
                        payments: { orderBy: { paymentDate: 'asc' }, take: 1 }
                    }
                }
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
        const { 
            customerId, projectId, supplierId, type, items, notes, 
            guestName, guestPhone, initialPayment, paymentMethod, 
            externalNumber, isOfficial,
            docType,
            guestRC, guestNIF, guestAI, guestNIS, 
            guestAddress, guestCommune, guestWilaya,
            dueDate,
            orderNumber: bodyOrderNumber
        } = body;

        // 1. Fetch Store Settings for Tax Rates
        const settings = await (prisma as any).storeSettings?.findUnique({ where: { id: 1 } });
        const tvaRate = settings?.tvaRate ?? 19;
        const timbreRate = settings?.timbreRate ?? 1;

        // 2. Initial Totals
        const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
        let taxTotal = 0;
        let timbreAmount = 0;

        if (isOfficial) {
            taxTotal = subtotal * (tvaRate / 100);
            // Timbre is 1% of TTC (capped at 10,000) only for official CASH invoices
            if ((paymentMethod || 'CASH') === 'CASH') {
                timbreAmount = Math.min((subtotal + taxTotal) * (timbreRate / 100), 10000);
            }
        }

        const grandTotal = subtotal + taxTotal + timbreAmount;
        const paidAmount = parseFloat(initialPayment || 0);
        const remainingAmount = grandTotal - paidAmount;
        
        // --- PURCHASE ORDER LOGIC ---
        if (type === 'PURCHASE') {
            // Check for duplicate external number for the same supplier
            if (externalNumber && externalNumber !== 'ACHAT-') {
                const existingOrder = await prisma.order.findFirst({
                    where: {
                        supplierId: supplierId || null,
                        customerName: supplierId ? undefined : body.guestSupplierName,
                        externalNumber: externalNumber,
                        type: 'PURCHASE'
                    }
                });

                if (existingOrder) {
                    return NextResponse.json({ 
                        error: `عذراً! رقم الفاتورة "${externalNumber}" مسجل مسبقاً لهذا المورد. يرجى التأكد من الرقم لتجنب التكرار.` 
                    }, { status: 400 });
                }
            }

            // Generate sequence for the month
            const now = new Date();
            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            const count = await prisma.order.count({
                where: {
                    type: 'PURCHASE',
                    orderDate: { gte: startOfMonth }
                }
            });
            const aaa = String(count + 1).padStart(3, '0');
            
            // Generate orderNumber: [externalNumber]/yymmaaa
            // Note: externalNumber already includes 'ACHAT-' from the frontend
            const userRef = externalNumber || 'ACHAT-';
            const orderNumber = bodyOrderNumber || `${userRef}/${yy}${mm}${aaa}`;
            const result = await prisma.$transaction(async (tx) => {
                const orderData: any = {
                    type,
                    orderNumber,
                    externalNumber,
                    notes,
                    dueDate: body.dueDate ? new Date(body.dueDate) : null,
                    status: body.status || 'DONE',
                    total: subtotal,
                    taxRate: isOfficial ? tvaRate : 0,
                    taxTotal,
                    timbreAmount,
                    grandTotal,
                    isOfficial: !!isOfficial,
                    items: {
                        create: items.map((i: any) => ({
                            productId: Number(i.productId),
                            quantity: Number(i.quantity),
                            unitPrice: Number(i.unitPrice),
                            total: Number(i.quantity) * Number(i.unitPrice)
                        }))
                    }
                };
                if (customerId) orderData.customerId = customerId;
                if (projectId) orderData.projectId = projectId;
                if (supplierId) orderData.supplierId = supplierId;
                if (body.guestSupplierName) orderData.customerName = body.guestSupplierName;
                
                // Add Guest IDs for Purchases too (if applicable)
                if (guestRC) orderData.customerRC = guestRC;
                if (guestNIF) orderData.customerNIF = guestNIF;
                if (guestAI) orderData.customerAI = guestAI;
                if (guestNIS) orderData.customerNIS = guestNIS;
                if (guestAddress) orderData.customerAddress = guestAddress;
                if (guestCommune) orderData.customerCommune = guestCommune;
                if (guestWilaya) orderData.customerWilaya = guestWilaya;

                const order = await tx.order.create({
                    data: orderData,
                    include: { supplier: true }
                });

                for (const item of items) {
                    const product = await tx.product.findUnique({
                        where: { id: Number(item.productId) }
                    });

                    if (product) {
                        const currentQty = product.quantity;
                        const currentAvg = product.avgPurchasePrice ?? product.purchasePrice;
                        const newQty = item.quantity;
                        const newUnitCost = item.unitPrice;

                        const newAvgPrice = calculateWeightedAverage(currentQty, currentAvg, newQty, newUnitCost);

                        const shouldTrackBatch = product.hasBatches || (product as any).hasExpiryDate;

                        const updateData: any = {
                            quantity: { increment: newQty },
                            avgPurchasePrice: newAvgPrice,
                            purchasePrice: newUnitCost,
                            hasBatches: shouldTrackBatch ? true : product.hasBatches
                        };

                        if (item.newSellPrice !== undefined && item.newSellPrice >= Math.max(product.purchasePrice, newUnitCost)) {
                            updateData.sellPrice = item.newSellPrice;
                        }

                        await tx.product.update({
                            where: { id: Number(item.productId) },
                            data: updateData
                        });

                        if (shouldTrackBatch) {
                            const batchNumber = await generateBatchNumber(tx);

                            await tx.productBatch.create({
                                data: {
                                    productId: Number(item.productId),
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
                            await updateNearestExpiry(Number(item.productId), tx);
                        }

                        await tx.stockMovement.create({
                            data: {
                                productId: Number(item.productId),
                                orderId: order.id,
                                movementType: 'IN',
                                quantity: newQty,
                                quantityBefore: currentQty,
                                quantityAfter: currentQty + newQty,
                                supplierId: supplierId || null,
                                unitCost: newUnitCost,
                                totalCost: newUnitCost * newQty,
                                reason: `شراء من المورد — ${body.guestSupplierName || 'مورد مسجل'}${externalNumber ? ` (فاتورة: ${externalNumber})` : ''}`
                            }
                        });
                    }
                }
                
                // Track supplier balance if not anonymous
                if (supplierId) {
                    await tx.supplier.update({
                        where: { id: supplierId },
                        data: { balanceDue: { increment: remainingAmount } }
                    });
                }

                // Create Invoice for Purchase
                const invoiceStatus = calculateInvoiceStatus(grandTotal, paidAmount);
                await tx.invoice.create({
                    data: {
                        orderId: order.id,
                        invoiceNumber: `PUR/${order.orderNumber}`,
                        supplierId: supplierId || null,
                        type: 'PURCHASE_INVOICE',
                        total: subtotal,
                        grandTotal,
                        paid: paidAmount,
                        remaining: remainingAmount,
                        status: invoiceStatus,
                        dueDate: body.dueDate ? new Date(body.dueDate) : null,
                        date: new Date(),
                        customerName: body.guestSupplierName || undefined
                    }
                });

                return order;
            });
            return NextResponse.json(result);
        }

        // --- SALE ORDER LOGIC ---
        if (!customerId && !guestName) {
            return NextResponse.json({ error: 'يجب تقديم معلومات العميل' }, { status: 400 });
        }

        let customer: any = null;
        if (customerId) {
            const creditCheck = await checkCreditLimit(customerId, grandTotal, paidAmount);
            if (!creditCheck.allowed) {
                return NextResponse.json({
                    error: creditCheck.message,
                    details: creditCheck
                }, { status: 400 });
            }
            customer = await prisma.customer.findUnique({ where: { id: customerId } });
        }

        const productIds = items.map((i: any) => Number(i.productId));
        const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

        for (const item of items) {
            const p = products.find(prod => prod.id === Number(item.productId));
            if (!p) return NextResponse.json({ error: `المنتج غير موجود: ${item.productId}` }, { status: 400 });
            if (item.quantity > p.quantity) {
                return NextResponse.json({ error: `الكمية المتوفرة من ${p.name} غير كافية (${p.quantity} متوفر)` }, { status: 400 });
            }
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const startOfMonth = new Date(year, now.getMonth(), 1);
        
        const orderCountThisMonth = await prisma.order.count({
            where: {
                type: 'SALE',
                orderDate: { gte: startOfMonth }
            }
        });

        const sequenceNumber = String(orderCountThisMonth + 1).padStart(6, '0');
        const orderNumber = `${year}/${month}/${sequenceNumber}`;
        const invoiceNumber = `INV/${orderNumber}`;

        const result = await prisma.$transaction(async (tx) => {
            const orderData: any = {
                orderNumber,
                type: 'SALE',
                status: body.status || 'DONE',
                total: subtotal,
                taxRate: isOfficial ? tvaRate : 0,
                taxTotal,
                timbreAmount,
                grandTotal,
                isOfficial: !!isOfficial,
                notes,
                dueDate: body.dueDate ? new Date(body.dueDate) : null,
                items: {
                    create: items.map((i: any) => ({
                        productId: Number(i.productId),
                        quantity: Number(i.quantity),
                        unitPrice: Number(i.unitPrice),
                        total: Number(i.quantity) * Number(i.unitPrice)
                    }))
                }
            };
            if (customerId) orderData.customerId = customerId;
            if (customerId && projectId) orderData.projectId = projectId;
            if (guestName) orderData.customerName = guestName;
            if (guestPhone) orderData.customerPhone = guestPhone;
            if (guestRC) orderData.customerRC = guestRC;
            if (guestNIF) orderData.customerNIF = guestNIF;
            if (guestAI) orderData.customerAI = guestAI;
            if (guestNIS) orderData.customerNIS = guestNIS;
            if (guestAddress) orderData.customerAddress = guestAddress;
            if (guestCommune) orderData.customerCommune = guestCommune;
            if (guestWilaya) orderData.customerWilaya = guestWilaya;

            // For registered customers, copy their address info if not provided
            if (customerId && customer) {
                if (!orderData.customerAddress) orderData.customerAddress = customer.address;
                if (!orderData.customerCommune) orderData.customerCommune = customer.commune;
                if (!orderData.customerWilaya) orderData.customerWilaya = customer.wilaya;
            }

            const newOrder = await tx.order.create({
                data: orderData,
                include: { items: true }
            });

            for (const item of items) {
                const p = products.find((prod) => prod.id === Number(item.productId))!;

                let batchNote = "";
                if (p.hasBatches) {
                    const allocations = await getFIFOBatches(p.id, item.quantity, tx);

                    for (const alloc of allocations) {
                        await tx.productBatch.update({
                            where: { id: alloc.batchId },
                            data: { remainingQty: { decrement: alloc.quantity } }
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

            const invoiceStatus = calculateInvoiceStatus(grandTotal, paidAmount);
            const invoiceData: any = {
                orderId: newOrder.id,
                invoiceNumber,
                type: isOfficial ? 'INVOICE' : 'PROVISIONAL',
                taxTotal,
                timbreAmount,
                total: subtotal,
                grandTotal,
                paid: paidAmount,
                remaining: remainingAmount,
                status: invoiceStatus,
                dueDate: dueDate ? new Date(dueDate) : null,
                date: new Date()
            };
            if (customerId) invoiceData.customerId = customerId;
            if (guestName) invoiceData.customerName = guestName;
            if (guestPhone) invoiceData.customerPhone = guestPhone;
            if (guestRC) invoiceData.customerRC = guestRC;
            if (guestNIF) invoiceData.customerNIF = guestNIF;
            if (guestAI) invoiceData.customerAI = guestAI;
            if (guestNIS) invoiceData.customerNIS = guestNIS;
            if (guestAddress) invoiceData.customerAddress = guestAddress;
            if (guestCommune) invoiceData.customerCommune = guestCommune;
            if (guestWilaya) invoiceData.customerWilaya = guestWilaya;

            if (customerId && customer) {
                if (!invoiceData.customerAddress) invoiceData.customerAddress = customer.address;
                if (!invoiceData.customerCommune) invoiceData.customerCommune = customer.commune;
                if (!invoiceData.customerWilaya) invoiceData.customerWilaya = customer.wilaya;
            }

            const invoice = await tx.invoice.create({
                data: invoiceData
            });

            if (paidAmount > 0) {
                const paymentData: any = {
                    invoiceId: invoice.id,
                    amount: paidAmount,
                    paymentMethod: paymentMethod || 'CASH',
                    paymentDate: new Date(),
                    notes: 'دفعة أولية عند الطلب'
                };
                if (customerId) paymentData.customerId = customerId;

                await tx.payment.create({
                    data: paymentData
                });
            }

            return { newOrder, invoice };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ 
            error: error.message || 'Failed to create order',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        }, { status: 500 });
    }
}
