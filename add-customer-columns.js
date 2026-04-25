const { createClient } = require('@libsql/client');
const path = require('path');

const dbPath = 'file:' + path.join(__dirname, 'prisma', 'dev.db').replace(/\\/g, '/');

async function addColumns() {
    const db = createClient({ url: dbPath });
    
    console.log('Connecting to:', dbPath);
    
    const columns = [
        // Customer table
        { name: 'address', table: 'Customer', sql: `ALTER TABLE "Customer" ADD COLUMN "address" TEXT` },
        { name: 'commune', table: 'Customer', sql: `ALTER TABLE "Customer" ADD COLUMN "commune" TEXT` },
        { name: 'wilaya',  table: 'Customer', sql: `ALTER TABLE "Customer" ADD COLUMN "wilaya"  TEXT` },
        // Supplier table
        { name: 'commune', table: 'Supplier', sql: `ALTER TABLE "Supplier" ADD COLUMN "commune" TEXT` },
        { name: 'wilaya',  table: 'Supplier', sql: `ALTER TABLE "Supplier" ADD COLUMN "wilaya"  TEXT` },
    ];

    for (const col of columns) {
        try {
            await db.execute(col.sql);
            console.log(`✅ Column '${col.name}' added to '${col.table}' successfully.`);
        } catch (e) {
            if (e.message && (e.message.includes('duplicate') || e.message.includes('already exists'))) {
                console.log(`⚠️  Column '${col.name}' already exists in '${col.table}' — skipped.`);
            } else {
                console.error(`❌ Error adding '${col.name}' to '${col.table}':`, e.message);
            }
        }
    }

    console.log('\nDone! Run: npx prisma generate && npm run dev');
}

addColumns();
