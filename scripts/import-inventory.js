#!/usr/bin/env node
// Import inventory from CSV to Umbrel PostgreSQL with rate limiting

const fs = require('fs');
const path = require('path');

const API_URL = 'https://api.aggrandizedigital.com';
const API_KEY = 'e622c42ee210f3ad0af8ec91ec92d164cfb16e3e9ecec5e991eb6fe2ece2180e';
const ADMIN_KEY = 'v4+qGvUcO3A0Gqhstn84pWu9v2E2xnZ5DlPCtvafvKs=';

const delay = ms => new Promise(r => setTimeout(r, ms));

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parsePrice(priceStr) {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseTraffic(trafficStr) {
  if (!trafficStr) return null;
  const cleaned = trafficStr.replace(/,/g, '').toUpperCase();
  let multiplier = 1;
  if (cleaned.endsWith('K')) multiplier = 1000;
  else if (cleaned.endsWith('M')) multiplier = 1000000;
  const num = parseFloat(cleaned.replace(/[KM]/g, ''));
  return isNaN(num) ? null : Math.round(num * multiplier);
}

function parseBoolean(val) {
  return val && val.toLowerCase() === 'yes';
}

async function importInventory() {
  const csvPath = path.join(process.env.HOME, 'Downloads', 'inventory.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  console.log('Found ' + (lines.length - 1) + ' rows to import');

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let batch = 0;

  for (let i = 2; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (!fields[1]) { skipped++; continue; }

    const website = fields[1].replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!website) { skipped++; continue; }

    const data = {
      website, 
      da: parseInt(fields[2]) || null,
      spam_score: parseInt(fields[3]) || null,
      client_price: parsePrice(fields[4]),
      traffic: parseTraffic(fields[5]),
      category: fields[7] || null,
      link_type: parseBoolean(fields[8]) ? 'dofollow' : 'nofollow',
      accepts_cbd: parseBoolean(fields[11]),
      accepts_casino: parseBoolean(fields[12]),
      accepts_dating: parseBoolean(fields[13]),
      accepts_crypto: parseBoolean(fields[14]),
      contact: fields[15] || null,
      tat: fields[16] || null,
      status: 'active'
    };

    const columns = Object.keys(data).filter(k => data[k] !== null && data[k] !== undefined);
    const values = columns.map((k, idx) => '$' + (idx + 1));
    const params = columns.map(k => data[k]);
    const sql = 'INSERT INTO website_inventory (' + columns.join(', ') + ') VALUES (' + values.join(', ') + ') ON CONFLICT (website) DO NOTHING';

    try {
      const response = await fetch(API_URL + '/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY, 'X-ADMIN-KEY': ADMIN_KEY },
        body: JSON.stringify({ sql, params })
      });

      const result = await response.json();
      if (result.success) {
        imported++;
        batch++;
        if (imported % 50 === 0) console.log('Imported ' + imported + ' rows...');
        
        // Rate limit: 100/min, so delay 700ms between requests
        await delay(700);
        
        // Extra delay every 80 requests
        if (batch >= 80) {
          console.log('Pausing for rate limit...');
          await delay(10000);
          batch = 0;
        }
      } else if (result.error && result.error.includes('duplicate')) {
        skipped++;
      } else {
        errors++;
        if (errors <= 3) console.error('Error: ' + result.error);
      }
    } catch (err) {
      errors++;
      if (errors <= 3) console.error('Fetch error: ' + err.message);
    }
  }

  console.log('\nImport complete!');
  console.log('Imported: ' + imported + ', Skipped: ' + skipped + ', Errors: ' + errors);
}

importInventory().catch(console.error);
