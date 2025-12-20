/**
 * Import Inventory from CSV to Umbrel PostgreSQL
 * Usage: node scripts/import-inventory.js /path/to/inventory.csv
 */

const fs = require('fs');
const { Pool } = require('pg');

// Umbrel PostgreSQL connection
const pool = new Pool({
  host: 'umbrel.local',
  port: 5432,
  database: 'aggrandize_business',
  user: 'aggrandize',
  password: 'AggrandizeDB2024',
});

// Parse price like "$1,800" or "$75" to number
function parsePrice(priceStr) {
  if (!priceStr || priceStr === '-') return null;
  const cleaned = priceStr.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Parse traffic like "74K", "158.1K", "1.2M" to number
function parseTraffic(trafficStr) {
  if (!trafficStr || trafficStr === '-') return null;
  const cleaned = trafficStr.trim().toUpperCase();

  let multiplier = 1;
  let value = cleaned;

  if (cleaned.endsWith('K')) {
    multiplier = 1000;
    value = cleaned.slice(0, -1);
  } else if (cleaned.endsWith('M')) {
    multiplier = 1000000;
    value = cleaned.slice(0, -1);
  }

  const num = parseFloat(value);
  return isNaN(num) ? null : Math.round(num * multiplier);
}

// Parse boolean like "Yes", "No", "-", "Nofollow"
function parseBool(str) {
  if (!str) return false;
  const cleaned = str.trim().toLowerCase();
  return cleaned === 'yes' || cleaned === 'true' || cleaned === '1';
}

// Parse integer
function parseInt(str) {
  if (!str || str === '-') return null;
  const num = Number.parseInt(str, 10);
  return isNaN(num) ? null : num;
}

// Clean website URL - extract domain
function cleanWebsite(url) {
  if (!url) return null;
  let cleaned = url.trim();
  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//, '');
  // Remove www.
  cleaned = cleaned.replace(/^www\./, '');
  // Remove trailing slash
  cleaned = cleaned.replace(/\/$/, '');
  return cleaned || null;
}

// Parse CSV line (handles quoted fields with commas)
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

async function createTableIfNotExists(client) {
  console.log('📋 Dropping and recreating website_inventory table...');

  // Drop existing table and recreate
  await client.query('DROP TABLE IF EXISTS website_inventory CASCADE');

  await client.query(`
    CREATE TABLE website_inventory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      website VARCHAR(255) UNIQUE NOT NULL,
      contact VARCHAR(255),
      client_price DECIMAL(10,2),
      price DECIMAL(10,2),
      domain_rating INTEGER CHECK (domain_rating >= 0 AND domain_rating <= 100),
      da INTEGER CHECK (da >= 0 AND da <= 100),
      backlinks INTEGER DEFAULT 0,
      organic_traffic INTEGER DEFAULT 0,
      us_traffic INTEGER DEFAULT 0,
      uk_traffic INTEGER DEFAULT 0,
      canada_traffic INTEGER DEFAULT 0,
      is_indexed BOOLEAN DEFAULT true,
      ai_overview BOOLEAN DEFAULT false,
      chatgpt BOOLEAN DEFAULT false,
      perplexity BOOLEAN DEFAULT false,
      gemini BOOLEAN DEFAULT false,
      copilot BOOLEAN DEFAULT false,
      do_follow BOOLEAN DEFAULT true,
      news BOOLEAN DEFAULT false,
      sponsored BOOLEAN DEFAULT false,
      cbd BOOLEAN DEFAULT false,
      casino BOOLEAN DEFAULT false,
      dating BOOLEAN DEFAULT false,
      crypto BOOLEAN DEFAULT false,
      category VARCHAR(500),
      tat INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      notes TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('✅ Table ready');
}

async function importInventory(csvPath) {
  console.log('📂 Reading CSV file:', csvPath);

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  console.log(`📊 Found ${lines.length - 1} rows (excluding header)`);

  // Parse header
  const header = parseCSVLine(lines[0]);
  console.log('📋 Columns:', header.join(', '));

  // Create column index map
  const colIndex = {};
  header.forEach((col, idx) => {
    colIndex[col.toLowerCase().trim()] = idx;
  });

  // Process rows
  const records = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = parseCSVLine(line);

    // Skip empty rows
    const website = cleanWebsite(cols[colIndex['magazines']]);
    if (!website) {
      continue;
    }

    try {
      const record = {
        website,
        da: parseInt(cols[colIndex['da']]),
        domain_rating: parseInt(cols[colIndex['as']]),
        client_price: parsePrice(cols[colIndex['price']]),
        organic_traffic: parseTraffic(cols[colIndex['new ot']]),
        is_indexed: parseBool(cols[colIndex['indexed']]),
        category: cols[colIndex['category/section']]?.trim() || null,
        do_follow: parseBool(cols[colIndex['do follow']]),
        news: parseBool(cols[colIndex['news']]),
        sponsored: parseBool(cols[colIndex['sponsored']]),
        cbd: parseBool(cols[colIndex['cbd']]),
        casino: parseBool(cols[colIndex['casino']]),
        dating: parseBool(cols[colIndex['dating']]),
        crypto: parseBool(cols[colIndex['crypto']]),
        contact: cols[colIndex['contact']]?.trim() || null,
        tat: parseInt(cols[colIndex['tat']]),
        status: 'active',
      };

      records.push(record);
    } catch (err) {
      errors.push({ line: i + 1, error: err.message, data: line });
    }
  }

  console.log(`✅ Parsed ${records.length} valid records`);
  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} rows with errors (skipped)`);
  }

  // Insert into database
  console.log('\n🔄 Connecting to Umbrel PostgreSQL...');

  const client = await pool.connect();

  try {
    // Create table if not exists
    await createTableIfNotExists(client);

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const record of records) {
      try {
        // Use UPSERT (INSERT ON CONFLICT UPDATE) - each record in its own transaction
        const result = await client.query(`
          INSERT INTO website_inventory (
            website, da, domain_rating, client_price, organic_traffic,
            is_indexed, category, do_follow, news, sponsored,
            cbd, casino, dating, crypto, contact, tat, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (website) DO UPDATE SET
            da = EXCLUDED.da,
            domain_rating = EXCLUDED.domain_rating,
            client_price = EXCLUDED.client_price,
            organic_traffic = EXCLUDED.organic_traffic,
            is_indexed = EXCLUDED.is_indexed,
            category = EXCLUDED.category,
            do_follow = EXCLUDED.do_follow,
            news = EXCLUDED.news,
            sponsored = EXCLUDED.sponsored,
            cbd = EXCLUDED.cbd,
            casino = EXCLUDED.casino,
            dating = EXCLUDED.dating,
            crypto = EXCLUDED.crypto,
            contact = EXCLUDED.contact,
            tat = EXCLUDED.tat,
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `, [
          record.website,
          record.da,
          record.domain_rating,
          record.client_price,
          record.organic_traffic,
          record.is_indexed,
          record.category,
          record.do_follow,
          record.news,
          record.sponsored,
          record.cbd,
          record.casino,
          record.dating,
          record.crypto,
          record.contact,
          record.tat,
          record.status,
        ]);

        if (result.rows[0].inserted) {
          inserted++;
        } else {
          updated++;
        }
      } catch (err) {
        failed++;
        console.error(`❌ Failed to insert ${record.website}:`, err.message);
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Inserted: ${inserted}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📦 Total: ${inserted + updated + failed}`);

    // Verify count
    const countResult = await client.query('SELECT COUNT(*) FROM website_inventory');
    console.log(`\n📈 Total records in database: ${countResult.rows[0].count}`);

  } catch (err) {
    throw err;
  } finally {
    client.release();
  }

  await pool.end();
  console.log('\n✅ Import complete!');
}

// Run import
const csvPath = process.argv[2] || '/Users/dhanapale/Downloads/inventory.csv';
importInventory(csvPath).catch(err => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
