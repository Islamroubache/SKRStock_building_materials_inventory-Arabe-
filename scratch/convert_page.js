const fs = require('fs');

let content = fs.readFileSync('app/customers/[id]/page.tsx', 'utf-8');

// Replacements
content = content.replace(/Customer/g, 'Supplier');
content = content.replace(/customer/g, 'supplier');
content = content.replace(/CUSTOMERS/g, 'SUPPLIERS');
content = content.replace(/customers/g, 'suppliers');
content = content.replace(/العميل/g, 'المورد');
content = content.replace(/العملاء/g, 'الموردين');
content = content.replace(/زبون/g, 'مورد');
content = content.replace(/الزبون/g, 'المورد');
content = content.replace(/SALE/g, 'PURCHASE');
content = content.replace(/RETURN_PURCHASE/g, 'RETURN_SALE'); // Since SALE was replaced by PURCHASE, RETURN_SALE became RETURN_PURCHASE, we need to swap them back? Wait, for suppliers, the return type is RETURN_PURCHASE. So if we replace SALE with PURCHASE, RETURN_SALE becomes RETURN_PURCHASE, which is CORRECT!
// wait, the original has RETURN_PURCHASE ? If it has RETURN_PURCHASE, it becomes RETURN_PURCHASE_PURCHASE. No, it didn't. 

// Remove PROJECTS tab logic
content = content.replace(/useState<'PROJECTS' \| 'ORDERS' \| 'INVOICES' \| 'PAYMENTS' \| 'SOA'>\('PROJECTS'\)/, "useState<'ORDERS' | 'INVOICES' | 'SOA'>('ORDERS')");

// Change activeTab init
content = content.replace(/if \(data\.type !== 'LOYAL'\) \{\s*setActiveTab\('INVOICES'\);\s*\}/, "");

// Remove PROJECTS button
content = content.replace(/\{isLoyal && \([\s\S]*?<button onClick=\{\(\) => setActiveTab\('PROJECTS'\)\}.*?<\/button>[\s\S]*?\)\}/, '');

// Remove the PROJECTS tab content
content = content.replace(/\{activeTab === 'PROJECTS' && isLoyal && \([\s\S]*?\{activeTab === 'ORDERS'/g, "{activeTab === 'ORDERS'");

// Remove the "طلبيات عامة" condition since all orders for suppliers are general
content = content.replace(/const generalOrders = \(supplier\?\.orders \|\| \[\]\)\.filter\(\(o: any\) => !o\.projectId && o\.type === 'PURCHASE'\);/g, "const generalOrders = (supplier?.orders || []).filter((o: any) => o.type === 'PURCHASE');");

content = content.replace(/\{isLoyal && \(\s*<div className="flex flex-col pb-6 gap-6/g, ""); // we already removed it mostly

// Any remaining 'isLoyal' stuff can just be removed or we can just leave it since isLoyal will be false (supplier doesn't have type LOYAL). 
// Wait, supplier.type doesn't exist, so isLoyal will be false. 

fs.writeFileSync('app/suppliers/[id]/page.tsx', content);
console.log('Script executed successfully!');
