import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const product = await prisma.product.findUnique({
        where: { name: 'kjhghj' },
        include: { batches: true }
    });
    console.log('Product:', JSON.stringify(product, null, 2));
}

main();
