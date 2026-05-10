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
                orders: {
                    where: { type: { in: ['PURCHASE', 'RETURN_PURCHASE'] } },
                    orderBy: { orderDate: 'desc' },
                    include: {
                        invoice: {
                            include: { supplierPayments: true }
                        },
                        project: { select: { id: true, name: true } },
                        items: {
                            include: {
                                product: { select: { id: true, name: true, unit: true, quantity: true, code: true, purchasePrice: true, avgPurchasePrice: true } }
                            }
                        }
                    }
                },
                payments: {
                    include: {
                        invoice: {
                            include: {
                                order: {
                                    include: { project: { select: { id: true, name: true } } }
                                }
                            }
                        }
                    },
                    orderBy: { paymentDate: 'desc' }
                }
            }
        });

        if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Build a map of product stats and history
        const productStatsMap = new Map<number, any>();

        (supplier.orders || []).forEach((o: any) => {
            if (o.type !== 'PURCHASE') return;
            
            (o.items || []).forEach((item: any) => {
                if (!item.product) return;
                const pid = item.productId;
                if (!productStatsMap.has(pid)) {
                    productStatsMap.set(pid, {
                        ...item.product,
                        firstPurchase: new Date(o.orderDate),
                        lastPurchase: new Date(o.orderDate),
                        totalPurchasedQty: 0,
                        totalPurchasedAmount: 0,
                        purchaseHistory: []
                    });
                }

                const stats = productStatsMap.get(pid);
                const orderDate = new Date(o.orderDate);
                if (orderDate < stats.firstPurchase) stats.firstPurchase = orderDate;
                if (orderDate > stats.lastPurchase) stats.lastPurchase = orderDate;
                
                stats.totalPurchasedQty += item.quantity;
                stats.totalPurchasedAmount += item.total;
                
                stats.purchaseHistory.push({
                    id: item.id,
                    date: o.orderDate,
                    quantity: item.quantity,
                    returnedQuantity: item.returnedQuantity || 0,
                    unitPrice: item.unitPrice,
                    total: item.total,
                    orderNumber: o.orderNumber,
                    product: item.product
                });
            });
        });

        // Ensure all products linked to supplier are included even if no orders
        const directProducts = await prisma.product.findMany({
            where: { supplierId: id },
            select: { id: true, name: true, code: true, quantity: true, unit: true, purchasePrice: true, avgPurchasePrice: true }
        });

        directProducts.forEach(p => {
            if (!productStatsMap.has(p.id)) {
                productStatsMap.set(p.id, {
                    ...p,
                    firstPurchase: null,
                    lastPurchase: null,
                    totalPurchasedQty: 0,
                    totalPurchasedAmount: 0,
                    purchaseHistory: []
                });
            }
        });

        const products = Array.from(productStatsMap.values()).sort((a, b) => b.lastPurchase - a.lastPurchase);

        return NextResponse.json({ ...supplier, products });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        const body = await request.json();

        // Sanitize body to only include valid Supplier fields
        const updateData: any = {};
        const allowedFields = ['name', 'activity', 'phone', 'email', 'address', 'rc', 'nif', 'ai', 'nis', 'commune', 'wilaya', 'postalCode', 'isArchived'];
        
        allowedFields.forEach(field => {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        });

        // Special handling for postCode/postalCode mapping if it exists in body
        if (body.postCode !== undefined && body.postalCode === undefined) {
            updateData.postalCode = body.postCode;
        }

        const updated = await prisma.supplier.update({ 
            where: { id }, 
            data: updateData 
        });
        
        return NextResponse.json(updated);
    } catch (e) { 
        console.error("PUT Supplier Error:", e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 }); 
    }
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
