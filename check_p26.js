const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProduct(id) {
    const product = await prisma.product.findUnique({
        where: { id },
        include: { batches: { where: { remainingQty: { gt: 0 } } } }
    });
    console.log('Product:', JSON.stringify(product, null, 2));
    const totalInBatches = product.batches.reduce((sum, b) => sum + b.remainingQty, 0);
    console.log('Total in active batches:', totalInBatches);
    console.log('Quantity in Product table:', product.quantity);
}

checkProduct(26).catch(console.error).finally(() => prisma.$disconnect());
