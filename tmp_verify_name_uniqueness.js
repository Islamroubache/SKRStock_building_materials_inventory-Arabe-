
async function testUniqueness() {
    const baseUrl = 'http://localhost:3000/api/products';
    const testName = 'Unique Test Product ' + Date.now();
    const productData = {
        name: testName,
        category: 'مواد بناء',
        purchasePrice: 10,
        sellPrice: 20,
        quantity: 10,
        minQuantity: 5,
        unit: 'قطعة',
        hasBatches: true
    };

    try {
        console.log(`Step 1: Creating product with name "${testName}"`);
        const res1 = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        const data1 = await res1.json();
        if (!res1.ok) {
            console.error('Failed to create first product:', data1);
            process.exit(1);
        }
        console.log('Product created successfully:', data1.id);

        console.log(`Step 2: Attempting to create another product with the SAME name`);
        const res2 = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        const data2 = await res2.json();
        if (res2.status === 400) {
            if (data2.error === 'اسم المنتج موجود مسبقاً') {
                console.log('Success: Received expected error message:', data2.error);
            } else {
                console.log('Error: Received unexpected error message:', data2);
                process.exit(1);
            }
        } else {
            console.log('Error: Second product creation should have failed with 400 but returned status:', res2.status, data2);
            process.exit(1);
        }
    } catch (error) {
        console.error('Unexpected error during test:', error.message);
        process.exit(1);
    }
}

testUniqueness();
