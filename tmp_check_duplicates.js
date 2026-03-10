
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.groupBy({
        by: ['name'],
        _count: {
            name: true,
        },
        having: {
            name: {
                _count: {
                    gt: 1,
                },
            },
        },
    });

    if (products.length > 0) {
        console.log('Duplicate products found:');
        products.forEach((p) => {
            console.log(`Name: ${p.name}, Count: ${p._count.name}`);
        });
    } else {
        console.log('No duplicate products found.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
