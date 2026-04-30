const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const product = await prisma.product.findUnique({
        where: { name: 'kjhghj' },
        include: { batches: true }
    });
    console.log('Product:', JSON.stringify(product, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
