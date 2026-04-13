const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing Prisma connection...');
        const count = await prisma.customer.count();
        console.log('Customer count:', count);
        const customers = await prisma.customer.findMany({ take: 5 });
        console.log('Sample customers:', JSON.stringify(customers, null, 2));
    } catch (e) {
        console.error('Prisma Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
