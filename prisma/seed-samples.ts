import prisma from '../lib/prisma';


async function main() {
    console.log('Seeding sample data...');

    // Generate unique suffix to avoid collisions with existing data
    const suffix = Math.floor(Math.random() * 10000);

    // 1. Suppliers
    const supplier1 = await prisma.supplier.create({
        data: { name: `المورد الأول (عينة ${suffix})`, phone: '0555123456', address: 'الجزائر العاصمة', balanceDue: 0 }
    });
    const supplier2 = await prisma.supplier.create({
        data: { name: `المورد الثاني (عينة ${suffix})`, phone: '0666123456', address: 'وهران', balanceDue: 0 }
    });

    // 2. Customers
    const customer1 = await prisma.customer.create({
        data: { name: `العميل الأول (عينة ${suffix})`, type: 'LOYAL', phone: '0777123456', creditLimit: 500000, balanceDue: 0 }
    });
    const customer2 = await prisma.customer.create({
        data: { name: `العميل الثاني (عينة ${suffix})`, type: 'REGULAR', phone: '0555987654', creditLimit: 0, balanceDue: 0 }
    });

    // 3. Projects
    const project1 = await prisma.project.create({
        data: { customerId: customer1.id, name: `مشروع بناء فيلا (عينة ${suffix})`, status: 'ACTIVE' }
    });

    // 4. Products
    const prod1 = await prisma.product.create({
        data: {
            code: `SMP1-${suffix}`, name: `إسمنت بورتلاند 50كغ (عينة ${suffix})`, category: 'مواد بناء أساسية',
            purchasePrice: 600, sellPrice: 750, quantity: 100, unit: 'كيس', hasBatches: true, hasExpiryDate: true,
            supplierId: supplier1.id, avgPurchasePrice: 600
        }
    });

    const prod2 = await prisma.product.create({
        data: {
            code: `SMP2-${suffix}`, name: `حديد تسليح 12مم (عينة ${suffix})`, category: 'مواد بناء أساسية',
            purchasePrice: 12000, sellPrice: 13500, quantity: 50, unit: 'قنطار', hasBatches: false, hasExpiryDate: false,
            supplierId: supplier2.id, avgPurchasePrice: 12000
        }
    });

    // 5. Product Batches (for prod1)
    const batch1 = await prisma.productBatch.create({
        data: {
            productId: prod1.id, supplierId: supplier1.id, batchNumber: `BAT-SMP1-${suffix}`,
            initialQty: 100, remainingQty: 100, unitCost: 600, totalCost: 60000,
            expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
            status: 'ACTIVE'
        }
    });

    // Update nearest expiry
    await prisma.product.update({
        where: { id: prod1.id },
        data: { nearestExpiryDate: batch1.expiryDate }
    });

    // 6. Stock Movements (Initial Stock)
    await prisma.stockMovement.create({
        data: {
            productId: prod1.id, movementType: 'IN', quantity: 100, quantityBefore: 0, quantityAfter: 100,
            supplierId: supplier1.id, unitCost: 600, totalCost: 60000, reason: 'رصيد افتتاحي (عينة)'
        }
    });
    await prisma.stockMovement.create({
        data: {
            productId: prod2.id, movementType: 'IN', quantity: 50, quantityBefore: 0, quantityAfter: 50,
            supplierId: supplier2.id, unitCost: 12000, totalCost: 600000, reason: 'رصيد افتتاحي (عينة)'
        }
    });

    // 7. Orders (Sale)
    const orderNumber = `ORD-SMP-${suffix}`;
    const invoiceNumber = `INV-SMP-${suffix}`;

    const order = await prisma.order.create({
        data: {
            customerId: customer1.id, projectId: project1.id, orderNumber, type: 'SALE', status: 'DONE', total: 7500,
            items: {
                create: [
                    { productId: prod1.id, quantity: 10, unitPrice: 750, total: 7500 },
                ]
            }
        },
        include: { items: true }
    });

    // 8. OrderItemBatches and deducting stock
    const item1 = order.items.find(i => i.productId === prod1.id)!;
    await prisma.orderItemBatch.create({
        data: { orderItemId: item1.id, batchId: batch1.id, quantity: 10, unitCost: 600 }
    });

    await prisma.productBatch.update({
        where: { id: batch1.id },
        data: { remainingQty: 90 }
    });

    await prisma.product.update({
        where: { id: prod1.id },
        data: { quantity: 90 }
    });

    await prisma.stockMovement.create({
        data: {
            productId: prod1.id, orderId: order.id, movementType: 'OUT', quantity: 10, quantityBefore: 100, quantityAfter: 90,
            reason: 'بيع للعميل - ' + customer1.name
        }
    });

    // 9. Invoice & Payment
    const invoice = await prisma.invoice.create({
        data: {
            orderId: order.id, customerId: customer1.id, invoiceNumber, type: 'INVOICE', total: 7500, paid: 5000, remaining: 2500, status: 'PARTIAL'
        }
    });

    await prisma.payment.create({
        data: {
            invoiceId: invoice.id, customerId: customer1.id, amount: 5000, paymentMethod: 'CASH', notes: 'دفعة عينة'
        }
    });

    await prisma.customer.update({
        where: { id: customer1.id },
        data: { balanceDue: 2500 }
    });

    // 10. Damaged Products
    await prisma.damagedProduct.create({
        data: {
            productId: prod2.id, quantity: 1, reason: 'صدأ بسبب الرطوبة (عينة)', damageType: 'DAMAGED', unitCost: 12000, totalLoss: 12000, status: 'CONFIRMED'
        }
    });

    await prisma.product.update({
        where: { id: prod2.id },
        data: { quantity: 49 }
    });

    await prisma.stockMovement.create({
        data: {
            productId: prod2.id, movementType: 'OUT', quantity: 1, quantityBefore: 50, quantityAfter: 49,
            reason: 'تم تسجيل كمنتج تالف'
        }
    });

    console.log('Sample data seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
