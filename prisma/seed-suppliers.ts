import { prisma } from '../lib/prisma';

async function main() {
    console.log('🌱 بداية إضافة بيانات الموردين...');

    const products = await prisma.product.findMany({ take: 3 });
    if (products.length === 0) {
        console.log('يرجى إضافة بعض المنتجات أولاً');
        return;
    }

    // Suppliers to create
    const suppliersData = [
        { name: 'شركة الأفق لمواد البناء', phone: '0555123456', email: 'contact@alofoq.dz', address: 'الجزائر العاصمة', type: 'without_pay' },
        { name: 'مؤسسة الرياض للاستيراد', phone: '0666987654', email: 'info@riadc.dz', address: 'وهران', type: 'half_pay' },
        { name: 'مصنع الأندلس للإسمنت', phone: '0777112233', email: 'sales@andalus.dz', address: 'قسنطينة', type: 'all_pay' },
    ];

    for (const supData of suppliersData) {
        const type = supData.type;
        delete (supData as any).type;

        // Create Supplier
        const supplier = await prisma.supplier.create({
            data: supData
        });
        console.log(`✅ تمت إضافة המورد: ${supplier.name}`);

        // Create a Purchase Order for this supplier
        const orderNumber = "ORD-SUP-" + Date.now() + Math.floor(Math.random() * 1000);

        let orderTotal = 0;
        const orderItemsData = products.map(p => {
            const qty = 50 + Math.floor(Math.random() * 50);
            const unitPrice = p.purchasePrice || 1000;
            const total = qty * unitPrice;
            orderTotal += total;
            return {
                productId: p.id,
                quantity: qty,
                unitPrice,
                total
            };
        });

        const order = await prisma.order.create({
            data: {
                supplierId: supplier.id,
                type: 'PURCHASE',
                orderNumber,
                status: 'DONE',
                total: orderTotal,
                items: {
                    create: orderItemsData
                }
            }
        });

        // Determine balanceDue based on the requested scenario
        let balanceDue = 0;
        let paidAmount = 0;

        if (type === 'without_pay') {
            balanceDue = orderTotal; // Didn't pay anything
            paidAmount = 0;
        } else if (type === 'half_pay') {
            balanceDue = orderTotal / 2; // Paid half
            paidAmount = orderTotal / 2;
        } else if (type === 'all_pay') {
            balanceDue = 0; // Paid everything
            paidAmount = orderTotal;
        }

        // Update Supplier balanceDue
        await prisma.supplier.update({
            where: { id: supplier.id },
            data: { balanceDue }
        });

        // Also add stock movements and increase product stock to make it realistic
        for (const item of orderItemsData) {
            await prisma.product.update({
                where: { id: item.productId },
                data: { quantity: { increment: item.quantity } }
            });

            await prisma.stockMovement.create({
                data: {
                    productId: item.productId,
                    orderId: order.id,
                    movementType: 'IN',
                    quantity: item.quantity,
                    quantityBefore: 0, // Simplified for mock data
                    quantityAfter: item.quantity,
                    supplierId: supplier.id,
                    unitCost: item.unitPrice,
                    totalCost: item.total,
                    reason: `طلبية شراء ${orderNumber} - (دفع: ${type})`
                }
            });
        }

        console.log(`✅ تمت إضافة طلبية للمورد ${supplier.name} بقيمة ${orderTotal} دج | الرصيد المتبقي له: ${balanceDue} دج`);
    }

    console.log('🎉 اكتملت إضافة البيانات بنجاح!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
