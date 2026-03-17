import prisma from '../lib/prisma';
import { addDays, subDays } from 'date-fns';

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomElement<T>(arr: T[]): T {
    return arr[randomInt(0, arr.length - 1)];
}

function randomDate(start: Date, end: Date) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const today = new Date();
const threeMonthsAgo = subDays(today, 90);

async function main() {
    console.log('Clearing existing data...');
    // Delete in reverse order to respect FK constraints
    await prisma.orderItemBatch.deleteMany();
    await prisma.productBatch.deleteMany();
    await prisma.damagedProduct.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.supplierPayment.deleteMany(); // Added
    await prisma.payment.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.project.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();

    console.log('Seeding data for مخزوني (Makhzouni) - Algerian Building Materials Store...');

    // 1. Suppliers
    console.log('Creating Suppliers...');
    const suppliersData = [
        { name: 'لافارج للاسمنت (Lafarge)', phone: '021000001', address: 'الجزائر العاصمة', balanceDue: 0 },
        { name: 'مركب الحديد والصلب توسيالي (Tosyali)', phone: '041000001', address: 'وهران', balanceDue: 0 },
        { name: 'سيراميك الرويبة (Ceramique)', phone: '021000002', address: 'الرويبة', balanceDue: 0 },
        { name: 'دهانات سنيط (Seigneurie)', phone: '021000003', address: 'الجزائر العاصمة', balanceDue: 0 },
        { name: 'محجرة جيجل للرمل والحصى', phone: '034000001', address: 'جيجل', balanceDue: 0 },
    ];
    const suppliers = await Promise.all(
        suppliersData.map((s) => prisma.supplier.create({ data: s }))
    );

    // 2. Customers & Projects
    console.log('Creating Customers and Projects...');
    const customersData = [
        { name: 'محمد بن علي', type: 'REGULAR', phone: '0770112233', creditLimit: 0 },
        { name: 'كريم سعداوي', type: 'REGULAR', phone: '0550112233', creditLimit: 0 },
        { name: 'مؤسسة البناء الحديث', type: 'CONTRACTOR', phone: '0660112233', creditLimit: 5000000 },
        { name: 'مقاولات الإخوة بوعلام', type: 'CONTRACTOR', phone: '0555123456', creditLimit: 3000000 },
        { name: 'جمال يوسفي', type: 'REGULAR', phone: '0777998877', creditLimit: 0 },
    ];
    const customers = await Promise.all(
        customersData.map((c) => prisma.customer.create({ data: c }))
    );

    const contractors = customers.filter(c => c.type === 'CONTRACTOR');
    const projects = [];
    for (const contractor of contractors) {
        for (let i = 0; i < 2; i++) {
            const p = await prisma.project.create({
                data: {
                    customerId: contractor.id,
                    name: `مشروع ${i === 0 ? 'بناء عمارة' : 'تهيئة مدرسة'} - ${contractor.name.split(' ')[0]}`,
                    description: 'أشغال كبرى',
                    startDate: randomDate(threeMonthsAgo, subDays(today, 30)),
                    status: 'ACTIVE'
                }
            });
            projects.push(p);
        }
    }

    // 3. Products
    console.log('Creating Products...');
    const productsData = [
        { code: 'CIM-42.5', name: 'اسمنت بورتلاندي 42.5', category: 'أسمنت', purchasePrice: 500, sellPrice: 650, hasBatches: true, unit: 'كيس (50كغ)', supplierId: suppliers[0].id },
        { code: 'CIM-32.5', name: 'اسمنت بورتلاندي 32.5', category: 'أسمنت', purchasePrice: 450, sellPrice: 580, hasBatches: true, unit: 'كيس (50كغ)', supplierId: suppliers[0].id },
        { code: 'FER-12', name: 'حديد تسليح 12 مم', category: 'الحديد الصلب', purchasePrice: 8500, sellPrice: 10500, hasBatches: false, unit: 'قنطار', supplierId: suppliers[1].id },
        { code: 'FER-14', name: 'حديد تسليح 14 مم', category: 'الحديد الصلب', purchasePrice: 8500, sellPrice: 10500, hasBatches: false, unit: 'قنطار', supplierId: suppliers[1].id },
        { code: 'CER-DAL', name: 'دال دو صول 40x40', category: 'الخزف', purchasePrice: 800, sellPrice: 1200, hasBatches: false, unit: 'متر مربع', supplierId: suppliers[2].id },
        { code: 'PEIN-VIN', name: 'طلاء مائي (فينيل) 25كغ', category: 'دهانات', purchasePrice: 2500, sellPrice: 3800, hasBatches: true, unit: 'دلو', supplierId: suppliers[3].id },
        { code: 'PEIN-SAT', name: 'طلاء ساتيني 5كغ', category: 'دهانات', purchasePrice: 1800, sellPrice: 2600, hasBatches: true, unit: 'دلو', supplierId: suppliers[3].id },
        { code: 'SAB-01', name: 'رمل بناء', category: 'مواد أساسية', purchasePrice: 1500, sellPrice: 2200, hasBatches: false, unit: 'متر مكعب', supplierId: suppliers[4].id },
        { code: 'GRA-15', name: 'حصى (Gavier) 15/25', category: 'مواد أساسية', purchasePrice: 1200, sellPrice: 1800, hasBatches: false, unit: 'متر مكعب', supplierId: suppliers[4].id },
        { code: 'BRI-8', name: 'آجر 8 ثقوب', category: 'مواد أساسية', purchasePrice: 18, sellPrice: 25, hasBatches: false, unit: 'قطعة', supplierId: suppliers[0].id }, // Assuming bought from general supplier
    ];

    const products = await Promise.all(
        productsData.map((p) => prisma.product.create({ data: p }))
    );

    // Helper variables to track state
    let orderNumberCounter = 1000;
    let invoiceNumberCounter = 5000;
    let batchNumberCounter = 100;

    // 4. Generate history based on time sequence
    console.log('Simulating 3 months of operations...');
    const days = 90;
    for (let currentDay = 0; currentDay <= days; currentDay++) {
        const simulationDate = addDays(threeMonthsAgo, currentDay);

        // DAILY PURCHASES (Stock Refill every ~7 days)
        if (currentDay === 0 || currentDay % 7 === 0) {
            // Create 1-2 purchase orders
            const numPurchases = randomInt(1, 2);
            for (let p = 0; p < numPurchases; p++) {
                const supplier = randomElement(suppliers);
                const numItems = randomInt(2, 5);
                // Select random products belonging to this supplier
                const supplierProducts = products.filter(pr => pr.supplierId === supplier.id);
                if (supplierProducts.length === 0) continue;

                const itemsToBuy = [];
                let totalOrderCost = 0;

                for (let i = 0; i < numItems; i++) {
                    const prod = randomElement(supplierProducts);
                    const qty = randomInt(50, 500); // large quantities
                    const unitCost = prod.purchasePrice * randomFloat(0.95, 1.05); // slight price variation

                    // Track item
                    itemsToBuy.push({
                        productId: prod.id,
                        quantity: qty,
                        unitPrice: unitCost,
                        total: qty * unitCost,
                        hasBatches: prod.hasBatches
                    });
                    totalOrderCost += qty * unitCost;
                }

                if (itemsToBuy.length === 0) continue;

                const purchaseOrder = await prisma.order.create({
                    data: {
                        supplierId: supplier.id,
                        orderNumber: `PO-${orderNumberCounter++}`,
                        type: 'PURCHASE',
                        status: 'COMPLETED',
                        total: totalOrderCost,
                        orderDate: simulationDate,
                        notes: 'طلبية شراء استراتيجية',
                        items: {
                            create: itemsToBuy.map(item => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                total: Math.round(item.total)
                            }))
                        }
                    },
                    include: { items: true }
                });

                // Process Stock Additions and Batches
                for (const item of purchaseOrder.items) {
                    const prodRef = itemsToBuy.find(i => i.productId === item.productId)!;
                    const dbProduct = await prisma.product.findUnique({ where: { id: item.productId } });
                    const qtyBefore = dbProduct!.quantity;
                    const qtyAfter = qtyBefore + item.quantity;

                    // Calculate new WAC
                    const previousTotalValue = qtyBefore * (dbProduct!.avgPurchasePrice || dbProduct!.purchasePrice);
                    const newTotalValue = previousTotalValue + item.total;
                    const newAvgPurchasePrice = newTotalValue / qtyAfter;

                    await prisma.product.update({
                        where: { id: item.productId },
                        data: {
                            quantity: qtyAfter,
                            avgPurchasePrice: newAvgPurchasePrice,
                            purchasePrice: item.unitPrice // Update last purchase price
                        }
                    });

                    await prisma.stockMovement.create({
                        data: {
                            productId: item.productId,
                            orderId: purchaseOrder.id,
                            movementType: 'PURCHASE',
                            quantity: item.quantity,
                            quantityBefore: qtyBefore,
                            quantityAfter: qtyAfter,
                            supplierId: supplier.id,
                            unitCost: item.unitPrice,
                            totalCost: item.total,
                            createdAt: simulationDate
                        }
                    });

                    if (prodRef.hasBatches) {
                        await prisma.productBatch.create({
                            data: {
                                productId: item.productId,
                                supplierId: supplier.id,
                                batchNumber: `BAT-${batchNumberCounter++}`,
                                purchaseOrderId: purchaseOrder.id,
                                initialQty: item.quantity,
                                remainingQty: item.quantity,
                                unitCost: item.unitPrice,
                                totalCost: item.total,
                                purchaseDate: simulationDate,
                                status: 'ACTIVE',
                                expiryDate: addDays(simulationDate, randomInt(180, 500)) // 6 months to 1.5 years
                            }
                        });
                    }
                }
            }
        }

        // DAILY SALES (2-5 sales per day)
        const numSales = randomInt(1, 4);
        for (let s = 0; s < numSales; s++) {
            const customer = randomElement(customers);
            const orderProducts = Array.from({ length: randomInt(1, 4) }, () => randomElement(products));
            const uniqueOrderProducts = [...new Set(orderProducts)];

            const itemsToSell = [];
            let totalOrderValue = 0;
            let canFulfil = true;

            for (const prod of uniqueOrderProducts) {
                // Check current stock
                const dbProduct = await prisma.product.findUnique({ where: { id: prod.id }, include: { batches: { where: { remainingQty: { gt: 0 }, status: 'ACTIVE' }, orderBy: { purchaseDate: 'asc' } } } });
                if (!dbProduct || dbProduct.quantity < 5) {
                    // Not enough stock, skip product
                    continue;
                }

                const qtyToSell = Math.min(randomInt(1, 20), dbProduct.quantity); // Don't sell more than we have
                const sellPrice = prod.sellPrice;

                itemsToSell.push({
                    product: dbProduct,
                    productId: prod.id,
                    quantity: qtyToSell,
                    unitPrice: sellPrice,
                    total: qtyToSell * sellPrice,
                    batches: dbProduct.batches // attach batches to use later
                });
                totalOrderValue += qtyToSell * sellPrice;
            }

            if (itemsToSell.length === 0) continue; // couldn't sell anything

            const project = customer.type === 'CONTRACTOR' ? randomElement(projects.filter(p => p.customerId === customer.id)) : null;

            const saleOrder = await prisma.order.create({
                data: {
                    customerId: customer.id,
                    projectId: project ? project.id : null,
                    orderNumber: `SO-${orderNumberCounter++}`,
                    type: 'SALE',
                    status: 'COMPLETED',
                    total: totalOrderValue,
                    orderDate: simulationDate,
                    items: {
                        create: itemsToSell.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            total: item.total
                        }))
                    }
                },
                include: { items: true }
            });

            // Deduct Stock and Handle Batches
            for (const item of saleOrder.items) {
                const sellRef = itemsToSell.find(i => i.productId === item.productId)!;
                const qtyBefore = sellRef.product.quantity;
                const qtyAfter = qtyBefore - item.quantity;
                const unitCost = sellRef.product.avgPurchasePrice || sellRef.product.purchasePrice;

                await prisma.product.update({
                    where: { id: item.productId },
                    data: { quantity: qtyAfter }
                });

                await prisma.stockMovement.create({
                    data: {
                        productId: item.productId,
                        orderId: saleOrder.id,
                        movementType: 'SALE',
                        quantity: item.quantity,
                        quantityBefore: qtyBefore,
                        quantityAfter: qtyAfter,
                        unitCost: unitCost,
                        totalCost: unitCost * item.quantity,
                        createdAt: simulationDate
                    }
                });

                // FIFO Batch Deduction
                if (sellRef.product.hasBatches) {
                    let remainingToDeduct = item.quantity;
                    for (const batch of sellRef.batches) {
                        if (remainingToDeduct <= 0) break;

                        const deductFromBatch = Math.min(batch.remainingQty, remainingToDeduct);
                        remainingToDeduct -= deductFromBatch;
                        const newBatchQty = batch.remainingQty - deductFromBatch;

                        await prisma.productBatch.update({
                            where: { id: batch.id },
                            data: {
                                remainingQty: newBatchQty,
                                status: newBatchQty === 0 ? 'DEPLETED' : 'ACTIVE'
                            }
                        });

                        await prisma.orderItemBatch.create({
                            data: {
                                orderItemId: item.id,
                                batchId: batch.id,
                                quantity: deductFromBatch,
                                unitCost: batch.unitCost
                            }
                        });
                    }
                }
            }

            // GENERATE INVOICES & PAYMENTS
            // Contractors often pay partially, regular customers pay FULL or PARTIAL
            let paidAmount = 0;
            let status = 'UNPAID';

            if (customer.type === 'REGULAR') {
                const p = Math.random();
                if (p < 0.7) {
                    paidAmount = totalOrderValue; // 70% chance full pay
                    status = 'PAID';
                } else if (p < 0.9) {
                    paidAmount = randomFloat(totalOrderValue * 0.3, totalOrderValue * 0.8); // partial
                    status = 'PARTIAL';
                } else {
                    paidAmount = 0;
                    status = 'UNPAID';
                }
            } else {
                // CONTRACTOR
                const p = Math.random();
                if (p < 0.4) {
                    paidAmount = totalOrderValue;
                    status = 'PAID';
                } else if (p < 0.9) {
                    paidAmount = randomFloat(totalOrderValue * 0.2, totalOrderValue * 0.6);
                    status = 'PARTIAL';
                } else {
                    paidAmount = 0;
                    status = 'UNPAID';
                }
            }

            const invoice = await prisma.invoice.create({
                data: {
                    orderId: saleOrder.id,
                    customerId: customer.id,
                    invoiceNumber: `INV-${invoiceNumberCounter++}`,
                    type: 'INVOICE',
                    total: totalOrderValue,
                    paid: paidAmount,
                    remaining: totalOrderValue - paidAmount,
                    date: simulationDate,
                    status: status,
                    dueDate: status !== 'PAID' ? addDays(simulationDate, 30) : null
                }
            });

            if (paidAmount > 0) {
                await prisma.payment.create({
                    data: {
                        invoiceId: invoice.id,
                        customerId: customer.id,
                        amount: paidAmount,
                        paymentMethod: 'CASH',
                        paymentDate: simulationDate,
                        createdAt: simulationDate
                    }
                });

                await prisma.customer.update({
                    where: { id: customer.id },
                    data: {
                        balanceDue: { increment: (totalOrderValue - paidAmount) }, // Only add what they didn't pay
                        lastPaymentDate: simulationDate,
                        lastPaymentAmount: paidAmount
                    }
                });
            } else {
                await prisma.customer.update({
                    where: { id: customer.id },
                    data: { balanceDue: { increment: totalOrderValue } }
                });
            }

            if (project) {
                await prisma.project.update({
                    where: { id: project.id },
                    data: {
                        totalAmount: { increment: totalOrderValue },
                        paidAmount: { increment: paidAmount }
                    }
                });
            }
        }

        // RANDOM DAMAGES (10% chance per day)
        if (Math.random() < 0.1) {
            // Pick a random product with stock
            const validDamagedProducts = await prisma.product.findMany({ where: { quantity: { gt: 0 } } });
            if (validDamagedProducts.length > 0) {
                const prodToDamage = randomElement(validDamagedProducts);
                const dmgQty = randomInt(1, Math.min(5, prodToDamage.quantity));
                const dmgUnitCost = prodToDamage.avgPurchasePrice || prodToDamage.purchasePrice;

                // Deduct stock
                await prisma.product.update({
                    where: { id: prodToDamage.id },
                    data: { quantity: { decrement: dmgQty } }
                });

                await prisma.damagedProduct.create({
                    data: {
                        productId: prodToDamage.id,
                        quantity: dmgQty,
                        reason: randomElement(['تلف بسبب سوء التخزين', 'منتج منتهي الصلاحية', 'تكسر أثناء النقل', 'تمزق الأكياس']),
                        damageType: prodToDamage.hasBatches && Math.random() < 0.3 ? 'EXPIRED' : 'DAMAGED',
                        unitCost: dmgUnitCost,
                        totalLoss: dmgUnitCost * dmgQty,
                        status: 'CONFIRMED',
                        createdAt: simulationDate,
                        reportedBy: 'مدير المخزن'
                    }
                });

                await prisma.stockMovement.create({
                    data: {
                        productId: prodToDamage.id,
                        movementType: 'DAMAGE',
                        quantity: dmgQty,
                        quantityBefore: prodToDamage.quantity,
                        quantityAfter: prodToDamage.quantity - dmgQty,
                        unitCost: dmgUnitCost,
                        totalCost: dmgUnitCost * dmgQty,
                        reason: 'تسجيل خسائر/توالف',
                        createdAt: simulationDate
                    }
                });
            }
        }
    }

    // Get Summary Counts
    const counts = {
        suppliers: await prisma.supplier.count(),
        customers: await prisma.customer.count(),
        projects: await prisma.project.count(),
        products: await prisma.product.count(),
        orders: await prisma.order.count(),
        invoices: await prisma.invoice.count(),
        payments: await prisma.payment.count(),
        stockMovements: await prisma.stockMovement.count(),
        damages: await prisma.damagedProduct.count(),
    };

    console.log('\n--- Seed Complete ---');
    console.table(counts);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
