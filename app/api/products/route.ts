import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateProductCode } from '@/lib/product-helpers';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const supplierId = searchParams.get('supplierId');
    const showArchived = searchParams.get('archived') === 'true';

    try {
        const products = await prisma.product.findMany({
            where: {
                name: { contains: search },
                isArchived: showArchived,
                ...(category ? { category } : {}),
                ...(supplierId ? { supplierId: parseInt(supplierId) } : {})
            },
            include: {
                supplier: true,
                _count: {
                    select: { batches: { where: { remainingQty: { gt: 0 } } } }
                }
            },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (body.sellPrice < body.purchasePrice) {
            return NextResponse.json({ error: 'سعر البيع لا يمكن أن يكون أقل من سعر الشراء' }, { status: 400 });
        }

        let productCode = body.code;
        if (!productCode) {
            const lastProduct = await prisma.product.findFirst({
                orderBy: { id: 'desc' },
                select: { id: true }
            });
            productCode = generateProductCode(lastProduct?.id || 0);
        }

        const product = await prisma.$transaction(async (tx) => {
            // Fix weird years (e.g. 0026 -> 2026)
            let finalExpiry = null;
            if (body.expiryDate) {
                const d = new Date(body.expiryDate);
                if (d.getFullYear() < 100) {
                    d.setFullYear(d.getFullYear() + 2000);
                }
                finalExpiry = d;
            }

            const newProduct = await tx.product.create({
                data: {
                    code: productCode,
                    name: body.name,
                    category: body.category,
                    purchasePrice: parseFloat(String(body.purchasePrice)) || 0,
                    sellPrice: parseFloat(String(body.sellPrice)) || 0,
                    quantity: parseInt(String(body.quantity)) || 0,
                    minQuantity: parseInt(String(body.minQuantity)) || 0,
                    unit: body.unit || 'قطعة',
                    supplier: (body.supplierId && !isNaN(Number(body.supplierId))) ? { connect: { id: Number(body.supplierId) } } : undefined,
                    nearestExpiryDate: body.hasExpiryDate !== false ? finalExpiry : null,
                    hasBatches: body.hasBatches || false,
                    hasExpiryDate: body.hasExpiryDate !== undefined ? body.hasExpiryDate : true,
                }
            });

            if (newProduct.hasBatches && newProduct.quantity > 0) {
                // Generate initial batch for products with batches enabled
                const lastBatch = await tx.productBatch.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
                const batchNumber = `BAT-${String((lastBatch?.id || 0) + 1).padStart(4, '0')}`;

                await tx.productBatch.create({
                    data: {
                        productId: newProduct.id,
                        batchNumber,
                        initialQty: newProduct.quantity,
                        remainingQty: newProduct.quantity,
                        unitCost: newProduct.purchasePrice,
                        totalCost: newProduct.quantity * newProduct.purchasePrice,
                        expiryDate: finalExpiry,
                        supplierId: newProduct.supplierId,
                        status: 'ACTIVE'
                    }
                });
            }

            if (newProduct.quantity > 0) {
                await tx.stockMovement.create({
                    data: {
                        productId: newProduct.id,
                        movementType: 'IN',
                        quantity: newProduct.quantity,
                        quantityBefore: 0,
                        quantityAfter: newProduct.quantity,
                        reason: 'أرصدة افتتاحية / إضافة منتج جديد'
                    }
                });
            }
            return newProduct;
        });

        return NextResponse.json(product);
    } catch (error: any) {
        console.error('Product Creation Error:', error);
        if (error?.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('name')) {
                return NextResponse.json({ error: 'اسم المنتج موجود مسبقاً' }, { status: 400 });
            }
            return NextResponse.json({ error: 'كود المنتج موجود مسبقاً' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
    }
}
