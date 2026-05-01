/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const damageType = searchParams.get('damageType');
        const productId = searchParams.get('productId');

        const where: any = {};
        if (status) where.status = status;
        if (damageType) where.damageType = damageType;
        if (productId) where.productId = parseInt(productId);

        const records = await prisma.damagedProduct.findMany({
            where,
            include: {
                product: true,
                supplier: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const totalLoss = records.reduce((sum: any, r: any) => sum + r.totalLoss, 0);

        return NextResponse.json({
            records,
            summary: {
                totalRecords: records.length,
                totalLoss,
                pendingCount: records.filter((r: any) => r.status === 'PENDING').length,
                returnedCount: records.filter((r: any) => r.status === 'RETURNED_TO_SUPPLIER').length
            }
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch damaged records' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productId, batchId, quantity, reason, damageType, supplierRefund, supplierId, refundAmount, reportedBy, notes } = body;

        const pId = parseInt(productId);
        const qty = parseInt(quantity);

        const product = await prisma.product.findUnique({
            where: { id: pId }
        });

        if (!product) return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
        if (qty > product.quantity) {
            return NextResponse.json({ error: `الكمية المطلوبة (${qty}) أكبر من المتوفر (${product.quantity})` }, { status: 400 });
        }

        // Validate batch if provided
        let batch = null;
        if (batchId) {
            batch = await prisma.productBatch.findUnique({
                where: { id: parseInt(batchId) }
            });
            if (!batch || batch.productId !== productId) {
                return NextResponse.json({ error: 'الدفعة غير صالحة أو لا تنتمي لهذا المنتج' }, { status: 400 });
            }
            if (qty > batch.remainingQty) {
                return NextResponse.json({ error: `الكمية المطلوبة (${qty}) أكبر من المتبقي في الدفعة (${batch.remainingQty})` }, { status: 400 });
            }
        }

        const avgCost = product.avgPurchasePrice ?? product.purchasePrice;
        const totalLoss = qty * avgCost;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Damaged Record
            const record = await tx.damagedProduct.create({
                data: {
                    productId: pId,
                    batchId: batchId ? parseInt(batchId) : null,
                    quantity: qty,
                    reason,
                    damageType,
                    unitCost: avgCost,
                    totalLoss,
                    reportedBy,
                    status: body.status || 'PENDING',
                    supplierRefund: !!supplierRefund,
                    supplierId: supplierId ? parseInt(supplierId) : null,
                    refundAmount: refundAmount ? parseFloat(String(refundAmount)) : null,
                    notes
                }
            });

            // 2. Deduct from Main Stock
            await tx.product.update({
                where: { id: pId },
                data: { quantity: { decrement: qty } }
            });

            // 3. Deduct from Batch Stock (Consistency Logic)
            if (batchId) {
                await tx.productBatch.update({
                    where: { id: parseInt(batchId) },
                    data: { remainingQty: { decrement: qty } }
                });
            } else {
                // Consistency: If product has batches, we must deduct from them even if recorded from overview
                // We prioritize deducting from expired or soonest-to-expire batches
                const batchesToDeduct = await tx.productBatch.findMany({
                    where: { 
                        productId: pId,
                        remainingQty: { gt: 0 }
                    },
                    orderBy: [
                        { expiryDate: 'asc' },   // Soonest to expire first
                        { purchaseDate: 'asc' }, // Then oldest batches (by purchase date)
                        { id: 'asc' }            // Then by ID as fallback
                    ]
                });

                let remainingToDeduct = qty;
                for (const b of batchesToDeduct) {
                    if (remainingToDeduct <= 0) break;
                    const deduct = Math.min(b.remainingQty, remainingToDeduct);
                    await tx.productBatch.update({
                        where: { id: b.id },
                        data: { remainingQty: { decrement: deduct } }
                    });
                    remainingToDeduct -= deduct;
                }
            }

            // 4. Create Stock Movement
            await tx.stockMovement.create({
                data: {
                    productId: pId,
                    movementType: 'OUT',
                    quantity: qty,
                    quantityBefore: product.quantity,
                    quantityAfter: product.quantity - qty,
                    reason: `تلف/سحب — ${damageType} — ${reason}${batchId ? ` (دفعة: ${batch?.batchNumber})` : ''}`,
                    unitCost: avgCost,
                    totalCost: totalLoss
                }
            });

            // 5. Update Supplier Balance if refund is immediate
            if (supplierRefund && supplierId && refundAmount) {
                await tx.supplier.update({
                    where: { id: parseInt(supplierId) },
                    data: { balanceDue: { decrement: parseFloat(String(refundAmount)) } }
                });
            }

            return record;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to record damaged product' }, { status: 500 });
    }
}
