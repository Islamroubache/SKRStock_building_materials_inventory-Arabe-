const fs = require('fs');

function convertToLightMode(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Backgrounds
    content = content.replace(/bg-\[#07090f\]/g, 'bg-gray-50');
    content = content.replace(/bg-\[#111825\]/g, 'bg-white');
    content = content.replace(/bg-\[#1A2333\]/g, 'bg-white/50');
    content = content.replace(/bg-\[#0B101A\]/g, 'bg-gray-50');

    // Text colors
    content = content.replace(/text-gray-100/g, 'text-gray-900');
    content = content.replace(/text-gray-200/g, 'text-gray-800');
    content = content.replace(/text-gray-300/g, 'text-gray-700');
    // content = content.replace(/text-gray-400/g, 'text-gray-500'); // keep some contrast
    content = content.replace(/text-white/g, 'text-gray-900');

    // Borders
    content = content.replace(/border-gray-800/g, 'border-gray-200');
    content = content.replace(/border-gray-700/g, 'border-gray-300');

    // Accents
    content = content.replace(/bg-gray-800/g, 'bg-gray-200');
    content = content.replace(/bg-gray-900/g, 'bg-gray-100');
    content = content.replace(/hover:bg-\[#1A2333\]/g, 'hover:bg-gray-50');
    content = content.replace(/hover:bg-\[#232F42\]/g, 'hover:bg-gray-100');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Converted ' + filePath);
}

convertToLightMode('app/orders/page.tsx');
convertToLightMode('app/orders/new/page.tsx');
