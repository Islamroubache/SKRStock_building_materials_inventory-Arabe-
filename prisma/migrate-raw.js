const { createClient } = require('@libsql/client');
const path = require('path');

const oldDbPath = 'file:C:\\Users\\iroub\\OneDrive\\Desktop\\makhzoun\\dev.db';
const newDbPath = 'file:C:\\Users\\iroub\\OneDrive\\Desktop\\makhzoun\\prisma\\dev.db';

async function migrate() {
    console.log('--- STARTING RAW SQL MIGRATION ---');
    console.log('Source:', oldDbPath);
    console.log('Target:', newDbPath);

    const src = createClient({ url: oldDbPath });
    const dst = createClient({ url: newDbPath });

    const tables = [
        'Supplier', 'Customer', 'Product', 'Project', 'Order',
        'OrderItem', 'Invoice', 'Payment', 'StockMovement',
        'ProductBatch', 'OrderItemBatch', 'SupplierPayment', 'DamagedProduct'
    ];

    try {
        // Disable foreign key checks for the migration duration if possible, 
        // or just migrate in order.
        await dst.execute("PRAGMA foreign_keys = OFF;");

        for (const table of tables) {
            console.log(`Migrating table: ${table}...`);

            // 1. Get data from source
            const result = await src.execute(`SELECT * FROM "${table}"`);
            if (result.rows.length === 0) {
                console.log(`   No data in ${table}. Skipping.`);
                continue;
            }

            const columns = Object.keys(result.rows[0]);
            const placeholders = columns.map(() => '?').join(', ');

            // 2. Insert into destination
            for (const row of result.rows) {
                const values = columns.map(col => row[col]);
                const escapedColumns = columns.map(col => `"${col}"`).join(', ');
                const sql = `INSERT OR IGNORE INTO "${table}" (${escapedColumns}) VALUES (${placeholders})`;
                await dst.execute({ sql, args: values });
            }
            console.log(`   Migrated ${result.rows.length} rows.`);
        }

        // 3. Initialize StoreSettings
        console.log('Initializing StoreSettings...');
        await dst.execute(`
            INSERT OR IGNORE INTO StoreSettings (id, storeName, tvaRate, timbreRate, createdAt, updatedAt) 
            VALUES (1, 'مخزون', 19, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);

        await dst.execute("PRAGMA foreign_keys = ON;");
        console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');

    } catch (e) {
        console.error('MIGRATION FAILED:', e);
    } finally {
        // Clients handle closing or we just let exit
    }
}

migrate();
