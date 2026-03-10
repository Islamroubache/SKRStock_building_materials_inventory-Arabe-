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

        const totalLoss = records.reduce((sum, r) => sum + r.totalLoss, 0);

        return NextResponse.json({
            records,
            summary: {
                totalRecords: records.length,
                totalLoss,
                pendingCount: records.filter(r => r.status === 'PENDING').length,
                returnedCount: records.filter(r => r.status === 'RETURNED_TO_SUPPLIER').length
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

        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
        if (quantity > product.quantity) {
            return NextResponse.json({ error: `الكمية المطلوبة (${quantity}) أكبر من المتوفر (${product.quantity})` }, { status: 400 });
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
            if (quantity > batch.remainingQty) {
                return NextResponse.json({ error: `الكمية المطلوبة (${quantity}) أكبر من المتبقي في الدفعة (${batch.remainingQty})` }, { status: 400 });
            }
        }

        const avgCost = product.avgPurchasePrice ?? product.purchasePrice;
        const totalLoss = quantity * avgCost;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Damaged Record
            const record = await tx.damagedProduct.create({
                data: {
                    productId,
                    batchId: batchId ? parseInt(batchId) : null,
                    quantity,
                    reason,
                    damageType,
                    unitCost: avgCost,
                    totalLoss,
                    reportedBy,
                    status: 'PENDING',
                    supplierRefund: !!supplierRefund,
                    supplierId: supplierId ? parseInt(supplierId) : null,
                    refundAmount: refundAmount ? parseFloat(refundAmount) : null,
                    notes
                }
            });

            // 2. Deduct from Main Stock
            await tx.product.update({
                where: { id: productId },
                data: { quantity: { decrement: quantity } }
            });

            // 3. Deduct from Batch Stock if applicable
            if (batchId) {
                await tx.productBatch.update({
                    where: { id: parseInt(batchId) },
                    data: { remainingQty: { decrement: quantity } }
                });
            }

            // 4. Create Stock Movement
            await tx.stockMovement.create({
                data: {
                    productId,
                    movementType: 'OUT',
                    quantity,
                    quantityBefore: product.quantity,
                    quantityAfter: product.quantity - quantity,
                    reason: `تلف/سحب — ${damageType} — ${reason}${batchId ? ` (دفعة: ${batch?.batchNumber})` : ''}`,
                    unitCost: avgCost,
                    totalCost: totalLoss
                }
            });

            // 5. Update Supplier Balance if refund is immediate
            if (supplierRefund && supplierId && refundAmount) {
                await tx.supplier.update({
                    where: { id: parseInt(supplierId) },
                    data: { balanceDue: { decrement: parseFloat(refundAmount) } }
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
