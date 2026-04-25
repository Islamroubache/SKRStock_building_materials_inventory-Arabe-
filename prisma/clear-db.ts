import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to clear database...');

  // Order of deletion matters due to foreign key constraints
  // Alternatively, we can use a raw query to disable checks if the DB allows it
  // In SQLite, we can just delete in a specific order or use a transaction
  
  const tables = [
    'OrderItemBatch',
    'OrderItem',
    'ProductBatch',
    'DamagedProduct',
    'StockMovement',
    'Payment',
    'SupplierPayment',
    'Invoice',
    'Order',
    'Project',
    'Product',
    'Customer',
    'Supplier',
    'StoreSettings'
  ];

  for (const table of tables) {
    console.log(`Clearing ${table}...`);
    // @ts-ignore
    await prisma[table.charAt(0).toLowerCase() + table.slice(1)].deleteMany({});
  }

  console.log('Database cleared successfully!');
}

main()
  .catch((e) => {
    console.error('Error clearing database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
