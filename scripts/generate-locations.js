/**
 * Run: node scripts/generate-locations.js
 * Fetches Algeria cities + postcodes from GitHub and generates lib/constants/algeria-locations.ts
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  return lines.slice(1).map(line => {
    // Handle quoted fields
    const cols = [];
    let inQuote = false, cur = '';
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuote = !inQuote; }
      else if (line[i] === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
      else cur += line[i];
    }
    cols.push(cur.trim());
    return cols;
  }).filter(cols => cols.length >= 4);
}

async function main() {
  console.log('Fetching cities...');
  const citiesCSV = await fetchUrl('https://raw.githubusercontent.com/othmanus/algeria-cities/master/csv/algeria_cities.csv');
  console.log('Fetching postcodes...');
  const postcodesCSV = await fetchUrl('https://raw.githubusercontent.com/othmanus/algeria-cities/master/csv/algeria_postcodes.csv');

  // Parse cities: id,commune_name,commune_name_ascii,daira_name,daira_name_ascii,wilaya_code,wilaya_name,wilaya_name_ascii
  const cityRows = parseCSV(citiesCSV);
  const communesByWilaya = {};

  cityRows.forEach(parts => {
    const communeAscii = parts[2];
    const wilayaCode = parts[5];
    const wilayaAscii = parts[7];
    if (!communeAscii || !wilayaCode) return;
    const code = wilayaCode.padStart(2, '0');
    if (!communesByWilaya[code]) communesByWilaya[code] = { name: wilayaAscii || '', communes: new Set() };
    communesByWilaya[code].communes.add(communeAscii);
  });

  // Parse postcodes: post_code,post_name,post_name_ascii,post_address,post_address_ascii,commune_id,commune_name,commune_name_ascii,daira_name,daira_name_ascii,wilaya_code,wilaya_name,wilaya_name_ascii
  const postcodeRows = parseCSV(postcodesCSV);
  const postcodesByCommune = {};

  postcodeRows.forEach(parts => {
    const postCode = parts[0];
    const communeAscii = parts[7];
    const wilayaCode = parts[10];
    if (!postCode || !communeAscii || !wilayaCode || !/^\d{5}$/.test(postCode)) return;
    const key = wilayaCode.padStart(2, '0') + '|' + communeAscii;
    if (!postcodesByCommune[key]) postcodesByCommune[key] = postCode;
  });

  // Build final structure
  const result = [];
  Object.keys(communesByWilaya).sort().forEach(code => {
    const w = communesByWilaya[code];
    const communes = [];
    Array.from(w.communes).sort().forEach(c => {
      const key = code + '|' + c;
      communes.push({ name: c, postCode: postcodesByCommune[key] || '' });
    });
    result.push({ id: code, name: w.name, communes });
  });

  const output = `/**
 * Algerian Wilayas with Communes and Postal Codes
 * Auto-generated from https://github.com/othmanus/algeria-cities
 */

export interface Commune {
    name: string;
    postCode: string;
}

export interface Wilaya {
    id: string;
    name: string;
    arabicName?: string;
    communes: Commune[];
}

export const ALGERIA_LOCATIONS: Wilaya[] = ${JSON.stringify(result, null, 2)};
`;

  const outPath = path.join(__dirname, '..', 'lib', 'constants', 'algeria-locations.ts');
  fs.writeFileSync(outPath, output, 'utf-8');
  console.log(`\n✅ Generated ${result.length} wilayas`);
  const msila = result.find(w => w.id === '28');
  if (msila) console.log(`M'Sila has ${msila.communes.length} communes, sample:`, msila.communes.slice(0, 3));
}

main().catch(console.error);
